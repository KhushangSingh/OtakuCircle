const axios = require('axios');
const Anime = require('../models/Anime');
const User = require('../models/User');

// --- CONFIGURATION ---
const ANILIST_URL = 'https://graphql.anilist.co';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 Hours

// Simple In-Memory Cache (Resets on server restart)
let homeCache = {
    data: null,
    lastFetch: 0
};
let mangaHomeCache = {
    data: null,
    lastFetch: 0
};

// --- HELPERS ---

const anilistQuery = async (query, variables = {}) => {
    try {
        const response = await axios.post(ANILIST_URL, { query, variables }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        return response.data.data;
    } catch (err) {
        if (err.response?.status === 404) {
            return null;
        }
        throw err;
    }
};

// Format AniList response to match application schema
const formatAniListMedia = (mediaList, forcedType = null) => {
    return mediaList.map(item => {
        const isManga = forcedType === 'Manga' || item.format === 'MANGA';
        return {
            mal_id: item.idMal || item.id,
            title: item.title?.english || item.title?.romaji || 'Unknown',
            title_english: item.title?.english,
            poster_url: item.coverImage?.extraLarge || item.coverImage?.large,
            score: item.averageScore ? (item.averageScore / 10).toFixed(2) : null,
            type: forcedType || (isManga ? 'Manga' : (item.format || 'TV')),
            mediaType: isManga ? 'manga' : 'anime',
            year: item.seasonYear || (item.startDate ? item.startDate.year : null),
            status: item.status,
            chapters: item.chapters || null,
            episodes: item.episodes || null
        };
    });
};

// ==========================================
//           DATABASE CONTROLLERS
// ==========================================

// @desc    Get all animes from Local DB with pagination
// @route   GET /api/anime?page=1
const getAnimes = async (req, res) => {
    const pageSize = 20;
    const page = Number(req.query.page) || 1;
    try {
        const count = await Anime.countDocuments({});
        const animes = await Anime.find({})
            .limit(pageSize)
            .skip(pageSize * (page - 1));
        
        res.json({ animes, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single anime or manga with full rich metadata (AniList + Local DB Fallback)
// @route   GET /api/anime/:id
const getAnimeById = async (req, res) => {
    const { id } = req.params;
    const numId = Number(id);

    try {
        let localAnime = null;
        if (!isNaN(numId)) {
            localAnime = await Anime.findOne({ mal_id: numId });
        }

        const buildAniListQuery = (paramName) => `
        query ($mediaId: Int) {
          Media(${paramName}: $mediaId) {
            id
            idMal
            type
            format
            title { romaji english native }
            description(asHtml: false)
            episodes
            chapters
            volumes
            status
            averageScore
            meanScore
            popularity
            favourites
            genres
            source
            countryOfOrigin
            isAdult
            hashtag
            synonyms
            coverImage { extraLarge large medium }
            bannerImage
            season
            seasonYear
            startDate { year month day }
            endDate { year month day }
            duration
            trailer { site id thumbnail }
            nextAiringEpisode {
              episode
              airingAt
              timeUntilAiring
            }
            tags {
              id
              name
              description
              category
              rank
              isMediaSpoiler
            }
            stats {
              scoreDistribution {
                score
                amount
              }
              statusDistribution {
                status
                amount
              }
            }
            rankings {
              id
              rank
              type
              format
              year
              season
              allTime
              context
            }
            studios(isMain: true) {
              nodes { id name siteUrl }
            }
            staff(perPage: 6) {
              edges {
                role
                node {
                  id
                  name { full }
                  image { medium }
                }
              }
            }
            characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
              edges {
                role
                node {
                  id
                  name { full native }
                  image { large medium }
                }
                voiceActors(language: JAPANESE) {
                  id
                  name { full native }
                  image { large medium }
                }
              }
            }
            externalLinks {
              id
              site
              url
              type
              icon
              color
            }
            relations {
              edges {
                relationType
                node {
                  id
                  idMal
                  type
                  format
                  title { english romaji }
                  coverImage { large medium }
                  averageScore
                  status
                }
              }
            }
            recommendations(sort: RATING_DESC, perPage: 8) {
              nodes {
                rating
                mediaRecommendation {
                  id
                  idMal
                  type
                  format
                  title { english romaji }
                  coverImage { large medium }
                  averageScore
                }
              }
            }
          }
        }`;

        let media = null;

        // 1. Try querying AniList by idMal (standard cross-reference ID)
        if (!isNaN(numId)) {
            try {
                const data = await anilistQuery(buildAniListQuery('idMal'), { mediaId: numId });
                media = data?.Media;
            } catch (err) {
                // Ignore and proceed to fallback
            }

            // 2. If not found by idMal, query by native AniList id
            if (!media) {
                try {
                    const data = await anilistQuery(buildAniListQuery('id'), { mediaId: numId });
                    media = data?.Media;
                } catch (err) {
                    // Ignore and proceed to local fallback
                }
            }
        }

        // If AniList returned media, build the rich enriched response
        if (media) {
            const isManga = media.type === 'MANGA' || media.format === 'MANGA';
            const cleanSynopsis = media.description
                ? media.description.replace(/<[^>]*>?/gm, '').trim()
                : 'No synopsis available.';

            let trailerUrl = null;
            let trailerEmbed = null;
            if (media.trailer && media.trailer.site === 'youtube') {
                trailerUrl = `https://www.youtube.com/watch?v=${media.trailer.id}`;
                trailerEmbed = `https://www.youtube-nocookie.com/embed/${media.trailer.id}`;
            }

            // Format dates
            const formatDate = (dateObj) => {
                if (!dateObj || !dateObj.year) return null;
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = dateObj.month ? monthNames[dateObj.month - 1] : '';
                const day = dateObj.day ? `${dateObj.day}, ` : '';
                return `${month ? `${month} ` : ''}${day}${dateObj.year}`.trim();
            };

            const startDateFormatted = formatDate(media.startDate);
            const endDateFormatted = formatDate(media.endDate);

            // Filter streaming & official read platforms
            const streamingPlatforms = (media.externalLinks || [])
                .filter(link => link.type === 'STREAMING' || link.site === 'Crunchyroll' || link.site === 'Netflix' || link.site === 'Hulu' || link.site === 'Amazon Prime Video')
                .map(link => ({
                    id: link.id,
                    site: link.site,
                    url: link.url,
                    icon: link.icon || null,
                    color: link.color || null
                }));

            // Filter official socials & info hubs
            const officialSocials = (media.externalLinks || [])
                .filter(link => link.type === 'SOCIAL' || link.type === 'INFO' || link.site === 'Official Site' || link.site === 'Twitter' || link.site === 'Instagram' || link.site === 'TikTok' || link.site === 'YouTube')
                .map(link => ({
                    id: link.id,
                    site: link.site,
                    url: link.url,
                    icon: link.icon || null,
                    color: link.color || null
                }));

            // Format characters & Japanese voice actors
            const characters = (media.characters?.edges || []).map(edge => ({
                id: edge.node.id,
                name: edge.node.name.full,
                nativeName: edge.node.name.native,
                role: edge.role, // 'MAIN' or 'SUPPORTING'
                image: edge.node.image?.large || edge.node.image?.medium,
                voiceActor: edge.voiceActors?.[0] ? {
                    id: edge.voiceActors[0].id,
                    name: edge.voiceActors[0].name.full,
                    nativeName: edge.voiceActors[0].name.native,
                    image: edge.voiceActors[0].image?.large || edge.voiceActors[0].image?.medium
                } : null
            }));

            // Format staff (authors, artists for manga, directors)
            const staff = (media.staff?.edges || []).map(edge => ({
                role: edge.role,
                name: edge.node.name.full,
                image: edge.node.image?.medium
            }));

            // Format studios
            const studios = (media.studios?.nodes || []).map(s => ({
                id: s.id,
                name: s.name,
                siteUrl: s.siteUrl
            }));

            // Format relations
            const relations = (media.relations?.edges || []).map(edge => ({
                relationType: edge.relationType,
                mal_id: edge.node.idMal || edge.node.id,
                title: edge.node.title.english || edge.node.title.romaji,
                type: edge.node.type,
                format: edge.node.format,
                poster_url: edge.node.coverImage?.large || edge.node.coverImage?.medium,
                score: edge.node.averageScore ? (edge.node.averageScore / 10).toFixed(2) : null,
                status: edge.node.status
            }));

            // Format Community Recommendations
            const communityRecommendations = (media.recommendations?.nodes || [])
                .filter(n => n?.mediaRecommendation)
                .map(n => ({
                    mal_id: n.mediaRecommendation.idMal || n.mediaRecommendation.id,
                    title: n.mediaRecommendation.title.english || n.mediaRecommendation.title.romaji,
                    type: n.mediaRecommendation.type,
                    format: n.mediaRecommendation.format,
                    poster_url: n.mediaRecommendation.coverImage?.large || n.mediaRecommendation.coverImage?.medium,
                    score: n.mediaRecommendation.averageScore ? (n.mediaRecommendation.averageScore / 10).toFixed(2) : null,
                    upvotes: n.rating || 0
                }));

            // Format Thematic Tags (with ranking upvote %)
            const tags = (media.tags || []).map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                category: t.category,
                rank: t.rank,
                isMediaSpoiler: Boolean(t.isMediaSpoiler)
            }));

            // Format Score Distribution & Status Distribution
            const scoreDistribution = (media.stats?.scoreDistribution || []).map(s => ({
                score: s.score,
                amount: s.amount
            }));

            const statusDistribution = (media.stats?.statusDistribution || []).map(s => ({
                status: s.status,
                amount: s.amount
            }));

            // Format Rankings
            const rankings = (media.rankings || []).map(r => ({
                id: r.id,
                rank: r.rank,
                type: r.type,
                format: r.format,
                year: r.year,
                season: r.season,
                allTime: Boolean(r.allTime),
                context: r.context
            }));

            // Format Source
            const sourceFormatted = media.source ? media.source.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : null;

            // Optional: Fetch Opening & Ending Themes from Jikan with short timeout
            let themes = { openings: [], endings: [] };
            if (media.idMal && !isManga) {
                try {
                    const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime/${media.idMal}/themes`, { timeout: 1500 });
                    if (jikanRes.data?.data) {
                        themes = {
                            openings: jikanRes.data.data.openings || [],
                            endings: jikanRes.data.data.endings || []
                        };
                    }
                } catch (e) {
                    // Silently ignore if Jikan rate-limited or unavailable
                }
            }

            const finalMediaData = {
                mal_id: media.idMal || media.id,
                anilist_id: media.id,
                title: media.title.english || media.title.romaji || 'Unknown',
                title_english: media.title.english,
                title_romaji: media.title.romaji,
                title_native: media.title.native,
                synopsis: cleanSynopsis,
                poster_url: media.coverImage?.extraLarge || media.coverImage?.large,
                banner_url: media.bannerImage || null,
                score: media.averageScore ? (media.averageScore / 10).toFixed(2) : (localAnime?.score ? Number(localAnime.score).toFixed(2) : 'N/A'),
                popularity: media.popularity || null,
                favourites: media.favourites || null,
                type: isManga ? 'Manga' : (media.format || 'TV'),
                mediaType: isManga ? 'manga' : 'anime',
                status: media.status,
                year: media.seasonYear || media.startDate?.year || (localAnime?.year || 'N/A'),
                season: media.season ? `${media.season.charAt(0) + media.season.slice(1).toLowerCase()} ${media.seasonYear || ''}`.trim() : null,
                startDate: startDateFormatted,
                endDate: endDateFormatted,
                duration: media.duration ? `${media.duration}m` : (isManga ? `${media.chapters || '?'} Ch` : '24m'),
                trailer_url: trailerUrl,
                trailer_embed: trailerEmbed,
                trailer_thumbnail: media.trailer?.thumbnail || null,
                genres: media.genres || localAnime?.genres || [],
                chapters: media.chapters || null,
                volumes: media.volumes || null,
                episodes: media.episodes || localAnime?.episodes || null,
                studios,
                staff,
                characters,
                streamingPlatforms,
                externalLinks: media.externalLinks || [],
                officialSocials,
                relations,
                nextAiringEpisode: media.nextAiringEpisode || null,
                tags,
                scoreDistribution,
                statusDistribution,
                rankings,
                communityRecommendations,
                source: sourceFormatted,
                countryOfOrigin: media.countryOfOrigin || 'JP',
                isAdult: Boolean(media.isAdult),
                contentRating: media.isAdult ? '18+ (Explicit)' : (media.type === 'ANIME' ? 'PG-13 / Teens' : 'All Ages'),
                hashtag: media.hashtag || null,
                synonyms: media.synonyms || [],
                themes
            };

            return res.json(finalMediaData);
        }

        // 3. Fallback to Local DB entry if AniList is unreachable or title not found
        if (localAnime) {
            return res.json({
                mal_id: localAnime.mal_id,
                title: localAnime.title,
                title_english: localAnime.title_english,
                synopsis: localAnime.synopsis || 'No synopsis available.',
                poster_url: localAnime.poster_url,
                score: localAnime.score ? Number(localAnime.score).toFixed(2) : 'N/A',
                type: localAnime.type || 'TV',
                mediaType: (localAnime.type || '').toLowerCase().includes('manga') ? 'manga' : 'anime',
                status: localAnime.status || 'Finished Airing',
                year: 'N/A',
                duration: localAnime.duration || '24m',
                trailer_url: localAnime.trailer_url,
                trailer_embed: null,
                genres: localAnime.genres || [],
                episodes: localAnime.episodes || null,
                studios: [],
                staff: [],
                characters: [],
                streamingPlatforms: [],
                externalLinks: [],
                relations: []
            });
        }

        return res.status(404).json({ message: 'Title not found' });

    } catch (error) {
        console.error(`❌ Error fetching title ${id}:`, error.message);
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ message: 'Title not found on AniList' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add anime to User's Watchlist
// @route   POST /api/anime/watchlist
const addToWatchlist = async (req, res) => {
    const { animeId, title, poster, mediaType } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const isEntryExist = user.watchlist.find(item => item.animeId === Number(animeId));
        
        if (isEntryExist) {
            return res.status(400).json({ message: 'Title already in your watchlist' });
        }
        
        user.watchhistory = user.watchhistory.filter(item => item.animeId !== Number(animeId));
        user.watchlist.push({ animeId, title, poster, mediaType: mediaType || 'anime' });
        await user.save();
        res.status(201).json(user.watchlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove anime from User's Watchlist
// @route   DELETE /api/anime/watchlist/:animeId
const removeFromWatchlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.watchlist = user.watchlist.filter(item => item.animeId !== Number(req.params.animeId));
        await user.save();
        res.json(user.watchlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add anime to User's Watchhistory
// @route   POST /api/anime/watchhistory
const addToWatchhistory = async (req, res) => {
    const { animeId, title, poster, status, review, mediaType } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const isEntryExist = user.watchhistory.find(item => item.animeId === Number(animeId));
        const defaultStatus = mediaType === 'manga' ? 'Reading' : 'Watching';

        if (isEntryExist) {
            isEntryExist.status = status || isEntryExist.status;
            if (title) isEntryExist.title = title;
            if (poster) isEntryExist.poster = poster;
            if (mediaType) isEntryExist.mediaType = mediaType;
        } else {
            user.watchhistory.push({
                animeId, title, poster,
                mediaType: mediaType || 'anime',
                status: status || defaultStatus,
                review: review || ''
            });
        }
        
        // Remove from watchlist if it exists there
        user.watchlist = user.watchlist.filter(item => item.animeId !== Number(animeId));
        
        await user.save();
        res.status(201).json(user.watchhistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update status/review in watchhistory
// @route   PUT /api/anime/watchhistory/:animeId
const updateWatchhistory = async (req, res) => {
    const { status, review } = req.body;
    const animeId = Number(req.params.animeId);
    try {
        const user = await User.findById(req.user.id);
        const entry = user.watchhistory.find(item => item.animeId === animeId);
        
        if (!entry) return res.status(404).json({ message: 'Anime not found in watchhistory' });
        
        if (status) entry.status = status;
        if (review !== undefined) entry.review = review;
        
        await user.save();
        res.json(entry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove anime from Watchhistory
// @route   DELETE /api/anime/watchhistory/:animeId
const removeFromWatchhistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.watchhistory = user.watchhistory.filter(item => item.animeId !== Number(req.params.animeId));
        await user.save();
        res.json(user.watchhistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
//           ANILIST API CONTROLLER
// ==========================================

// @desc    Get Home Page Data (Anime or Manga, AniList API + Caching)
// @route   GET /api/anime/home
const getHomeData = async (req, res) => {
    const isManga = req.query.mediaType === 'manga';
    const activeCache = isManga ? mangaHomeCache : homeCache;

    try {
        const now = Date.now();
        if (activeCache.data && (now - activeCache.lastFetch < CACHE_DURATION)) {
            console.log(`⚡ Serving ${isManga ? 'Manga' : 'Anime'} Home Data from Cache`);
            return res.json(activeCache.data);
        }

        console.log(`🌐 Fetching Fresh ${isManga ? 'Manga' : 'Anime'} Home Data from AniList API...`);

        const mediaTypeEnum = isManga ? 'MANGA' : 'ANIME';

        const query = `
        query {
          trending: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, sort: TRENDING_DESC, status: RELEASING) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
          topRated: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
          popular: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, sort: POPULARITY_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
          upcoming: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
          latest: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, sort: START_DATE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
          action: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, genre: "Action", sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
          fantasy: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, genre: "Fantasy", sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
          romance: Page(perPage: 40) {
            media(type: ${mediaTypeEnum}, genre: "Romance", sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year } chapters episodes
            }
          }
        }`;

        const data = await anilistQuery(query);
        const forcedType = isManga ? 'Manga' : null;

        const finalData = {
            trending: formatAniListMedia(data.trending.media, forcedType),
            topRated: formatAniListMedia(data.topRated.media, forcedType),
            popular: formatAniListMedia(data.popular.media, forcedType),
            upcoming: formatAniListMedia(data.upcoming.media, forcedType),
            latest: formatAniListMedia(data.latest.media, forcedType),
            action: formatAniListMedia(data.action.media, forcedType),
            fantasy: formatAniListMedia(data.fantasy.media, forcedType),
            romance: formatAniListMedia(data.romance.media, forcedType),
        };

        if (isManga) {
            mangaHomeCache = { data: finalData, lastFetch: now };
        } else {
            homeCache = { data: finalData, lastFetch: now };
        }

        res.json(finalData);

    } catch (error) {
        console.error("❌ AniList API Error:", error.message);
        if (activeCache.data) {
            console.log("⚠️ Serving Stale Cache due to API Error");
            return res.json(activeCache.data);
        }
        res.status(500).json({ message: "Failed to fetch media data", error: error.message });
    }
};

module.exports = {
    getAnimes,
    getAnimeById,
    addToWatchlist,
    removeFromWatchlist,
    addToWatchhistory,
    updateWatchhistory,
    removeFromWatchhistory,
    getHomeData
};