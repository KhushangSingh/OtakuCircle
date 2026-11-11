const express = require('express');
const router = express.Router();
const axios = require('axios');
const Anime = require('../models/Anime');

const STOP_WORDS = new Set([
    'anime', 'manga', 'about', 'a', 'an', 'the', 'who', 'wants', 'to', 'become',
    'show', 'shows', 'series', 'where', 'with', 'is', 'in', 'of', 'and', 'on', 'that',
    'this', 'for', 'by', 'from', 'at', 'some', 'story', 'stories', 'one', 'he', 'she',
    'they', 'their', 'his', 'her', 'gets', 'got', 'into', 'find', 'finds', 'looking',
    'like', 'can', 'has', 'have', 'there', 'are', 'was', 'were', 'been', 'which',
    'watch', 'recommend', 'tell', 'me', 'good', 'best', 'something'
]);

const GENERIC_TOKENS = new Set([
    'high', 'school', 'student', 'students', 'boy', 'girl', 'life', 'world',
    'take', 'takes', 'make', 'makes', 'day', 'days', 'time',
    'people', 'person', 'year', 'years', 'man', 'woman'
]);

/**
 * Intelligent Scenario Search Fallback
 * Analyzes natural language scenario queries, extracts specific tokens,
 * searches across synopsis, genres, titles, and computes scenario relevance.
 */
async function executeScenarioSearch(query, wantsAdult) {
    const rawTokens = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2 && !STOP_WORDS.has(t));

    if (rawTokens.length === 0) {
        // Fallback to title search if only stop words were provided
        const regex = new RegExp(query.trim(), 'i');
        const dbQuery = {
            $or: [{ title: regex }, { title_english: regex }],
            ...(wantsAdult ? {} : { genres: { $nin: ['Hentai', 'Ecchi', 'Erotica', 'Adult Cast'] } })
        };
        return await Anime.find(dbQuery)
            .select('mal_id title title_english poster_url score type year episodes status genres synopsis')
            .limit(20);
    }

    const specificTokens = rawTokens.filter(t => !GENERIC_TOKENS.has(t));
    const baseTokens = specificTokens.length > 0 ? specificTokens : rawTokens;

    // Stem and compound-word root expansion for common scenario tropes
    const expandedTokens = new Set(baseTokens);
    for (const t of baseTokens) {
        if (t.endsWith('s') && t.length > 4) expandedTokens.add(t.slice(0, -1));
        if (t.includes('note')) expandedTokens.add('note');
        if (t.includes('hero')) expandedTokens.add('hero');
        if (t.includes('titan')) expandedTokens.add('titan');
    }
    const searchTokens = Array.from(expandedTokens);

    // Build regex search conditions for candidate retrieval
    const candidateConditions = searchTokens.flatMap(token => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return [
            { title: { $regex: escaped, $options: 'i' } },
            { title_english: { $regex: escaped, $options: 'i' } },
            { synopsis: { $regex: escaped, $options: 'i' } },
            { genres: { $regex: escaped, $options: 'i' } }
        ];
    });

    const candidateQuery = {
        $or: candidateConditions,
        ...(wantsAdult ? {} : { genres: { $nin: ['Hentai', 'Ecchi', 'Erotica', 'Adult Cast'] } })
    };

    const candidates = await Anime.find(candidateQuery)
        .select('mal_id title title_english poster_url score type year episodes status genres synopsis')
        .sort({ score: -1 })
        .limit(300);

    const cleanQuery = query.toLowerCase().trim();

    // Score candidates by scenario relevance
    const scoredResults = candidates.map(anime => {
        let score = 0;
        const titleLower = ((anime.title || '') + ' ' + (anime.title_english || '')).toLowerCase();
        const synLower = (anime.synopsis || '').toLowerCase();
        const genreLower = (anime.genres || []).map(g => g.toLowerCase()).join(' ');

        let matchedTokens = 0;
        let matchedSpecific = 0;

        for (const token of searchTokens) {
            const isSpecific = !GENERIC_TOKENS.has(token);
            const weight = isSpecific ? 14 : 3;
            let matched = false;

            if (titleLower.includes(token)) {
                score += weight * 2.5;
                matched = true;
            }
            if (genreLower.includes(token)) {
                score += weight * 1.8;
                matched = true;
            }
            if (synLower.includes(token)) {
                score += weight * 1.2;
                matched = true;
            }

            if (matched) {
                matchedTokens++;
                if (isSpecific) matchedSpecific++;
            }
        }

        // Distinct token coverage bonus
        if (searchTokens.length > 0) {
            score += (matchedSpecific / searchTokens.length) * 50;
        }

        // Exact phrase or multi-word match bonus
        if (cleanQuery.length > 4 && (synLower.includes(cleanQuery) || titleLower.includes(cleanQuery))) {
            score += 45;
        }

        // Quality rating boost
        if (anime.score) {
            score += (anime.score * 2);
        }

        return { anime, score };
    });

    // Sort descending by calculated score
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, 30).map(item => item.anime);
}

/**
 * Search Manga from AniList for Scenario Queries
 */
async function searchMangaScenario(query, wantsAdult) {
    if (!query || !query.trim()) return [];

    const rawTokens = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2 && !STOP_WORDS.has(t));

    const specificTokens = rawTokens.filter(t => !GENERIC_TOKENS.has(t));
    const tokens = specificTokens.length > 0 ? specificTokens : rawTokens;
    if (tokens.length === 0) return [];

    const searchTerms = tokens.slice(0, 3);

    const gqlQuery = `
    query ($search: String, $isAdult: Boolean) {
        Page(page: 1, perPage: 12) {
            media(search: $search, type: MANGA, isAdult: $isAdult, sort: SEARCH_MATCH) {
                id
                idMal
                title { romaji english }
                coverImage { large extraLarge }
                description(asHtml: false)
                genres
                averageScore
                format
                status
                startDate { year }
                chapters
            }
        }
    }`;

    try {
        const fetchResults = await Promise.all(searchTerms.map(term => 
            axios.post('https://graphql.anilist.co', {
                query: gqlQuery,
                variables: { search: term, isAdult: wantsAdult ? undefined : false }
            }, {
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                timeout: 4000
            }).then(r => r.data?.data?.Page?.media || []).catch(() => [])
        ));

        const map = new Map();
        fetchResults.flat().forEach(item => {
            const malId = item.idMal || item.id;
            if (!map.has(malId)) {
                map.set(malId, {
                    mal_id: malId,
                    anilistId: item.id,
                    title: item.title?.english || item.title?.romaji || 'Untitled Manga',
                    title_english: item.title?.english || '',
                    poster_url: item.coverImage?.extraLarge || item.coverImage?.large,
                    score: item.averageScore ? Number((item.averageScore / 10).toFixed(2)) : null,
                    type: 'Manga',
                    mediaType: 'manga',
                    format: item.format || 'MANGA',
                    year: item.startDate?.year || null,
                    chapters: item.chapters || null,
                    status: item.status || 'RELEASING',
                    genres: item.genres || [],
                    synopsis: item.description || '',
                    matchCount: 0
                });
            }
            map.get(malId).matchCount += 1;
        });

        const sorted = Array.from(map.values()).sort((a, b) => {
            if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
            return (b.score || 0) - (a.score || 0);
        });

        return sorted.slice(0, 18);
    } catch (err) {
        console.error("Manga scenario search error:", err.message);
        return [];
    }
}

/**
 * @desc    Smart Semantic & Scenario Search (Anime & Manga)
 * @route   GET /api/search/smart?q=supernatural notebook that can kill
 * @access  Public
 */
router.get('/smart', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || !query.trim()) return res.json({ anime: [], manga: [], data: [] });

        const adultKeywords = ['hentai', 'ecchi', 'erotica', 'nsfw', '18+', 'adult', 'sex', 'porn'];
        const queryLower = query.toLowerCase();
        const wantsAdult = adultKeywords.some(kw => queryLower.includes(kw));

        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

        // Run Anime search and Manga search in parallel
        const [animeResults, mangaResults] = await Promise.all([
            (async () => {
                // 1. Try Python ML Service with 3.5s timeout
                try {
                    const mlResponse = await axios.get(`${mlServiceUrl}/search?q=${encodeURIComponent(query)}`, {
                        timeout: 3500
                    });
                    const animeIds = mlResponse.data?.results;

                    if (Array.isArray(animeIds) && animeIds.length > 0) {
                        const dbQuery = {
                            mal_id: { $in: animeIds },
                            ...(wantsAdult ? {} : { genres: { $nin: ['Hentai', 'Ecchi', 'Erotica', 'Adult Cast'] } })
                        };

                        const animes = await Anime.find(dbQuery)
                            .select('mal_id title title_english poster_url score type year episodes status genres synopsis');

                        const animeMap = new Map(animes.map(a => [a.mal_id, a]));
                        const sorted = animeIds.map(id => animeMap.get(id)).filter(Boolean);
                        if (sorted.length > 0) {
                            return sorted.map(a => ({ ...(a.toObject ? a.toObject() : a), mediaType: 'anime' }));
                        }
                    }
                } catch (mlErr) {}

                // 2. Intelligent Scenario Search Fallback
                const fallback = await executeScenarioSearch(query, wantsAdult);
                return fallback.map(a => ({ ...(a.toObject ? a.toObject() : a), mediaType: 'anime' }));
            })(),
            searchMangaScenario(query, wantsAdult)
        ]);

        return res.json({
            anime: animeResults,
            manga: mangaResults,
            data: [...animeResults, ...mangaResults],
            source: 'smart'
        });

    } catch (error) {
        console.error("❌ Search Route Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
