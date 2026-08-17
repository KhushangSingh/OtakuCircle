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

// --- HELPERS ---

const anilistQuery = async (query, variables = {}) => {
    const response = await axios.post(ANILIST_URL, { query, variables }, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    return response.data.data;
};

// Format AniList response to match application schema
const formatAniListMedia = (mediaList) => {
    return mediaList.map(item => ({
        mal_id: item.idMal || item.id,
        title: item.title?.english || item.title?.romaji || 'Unknown',
        poster_url: item.coverImage?.extraLarge || item.coverImage?.large,
        score: item.averageScore ? (item.averageScore / 10).toFixed(1) : null,
        type: item.format,
        year: item.seasonYear || (item.startDate ? item.startDate.year : null),
        status: item.status
    }));
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

// @desc    Get single anime (DB first -> AniList Fallback)
// @route   GET /api/anime/:id
const getAnimeById = async (req, res) => {
    const { id } = req.params;

    // 1. Validate ID
    if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid anime ID' });
    }

    try {
        // 2. Try finding in local Database first (Fastest)
        let anime = await Anime.findOne({ mal_id: Number(id) });

        // If found but missing new fields (duration, trailer), force a refetch
        if (anime && anime.duration && anime.trailer_url !== undefined) {
            return res.json(anime);
        }

        // 3. Fallback: Fetch from AniList API if not in DB or incomplete
        console.log(`⚠️ Anime ${id} not in DB or incomplete. Fetching from AniList...`);
        
        const query = `
        query ($malId: Int) {
          Media(idMal: $malId, type: ANIME) {
            id
            idMal
            title { romaji english }
            description(asHtml: false)
            format
            episodes
            status
            averageScore
            genres
            coverImage { extraLarge large }
            seasonYear
            startDate { year }
            duration
            trailer { site id }
          }
        }`;

        const data = await anilistQuery(query, { malId: Number(id) });
        const media = data.Media;

        if (!media) {
            return res.status(404).json({ message: 'Anime not found' });
        }

        // Clean up description by removing HTML tags if any remain
        const cleanSynopsis = media.description ? media.description.replace(/<[^>]*>?/gm, '') : 'No synopsis available.';
        
        // Format trailer URL
        let trailerUrl = null;
        if (media.trailer && media.trailer.site === 'youtube') {
            trailerUrl = `https://www.youtube.com/watch?v=${media.trailer.id}`;
        }

        if (anime) {
            // Update existing
            anime.title = media.title.english || media.title.romaji || 'Unknown';
            anime.title_english = media.title.english;
            anime.synopsis = cleanSynopsis;
            anime.type = media.format;
            anime.episodes = media.episodes;
            anime.status = media.status;
            anime.score = media.averageScore ? (media.averageScore / 10).toFixed(1) : null;
            anime.genres = media.genres || [];
            anime.poster_url = media.coverImage?.extraLarge || media.coverImage?.large;
            anime.duration = media.duration ? `${media.duration} min` : 'Unknown';
            anime.trailer_url = trailerUrl;
        } else {
            // Create new
            anime = new Anime({
                mal_id: media.idMal || media.id, 
                title: media.title.english || media.title.romaji || 'Unknown',
                title_english: media.title.english,
                synopsis: cleanSynopsis,
                type: media.format,
                episodes: media.episodes,
                status: media.status,
                score: media.averageScore ? (media.averageScore / 10).toFixed(1) : null,
                genres: media.genres || [],
                poster_url: media.coverImage?.extraLarge || media.coverImage?.large,
                duration: media.duration ? `${media.duration} min` : 'Unknown',
                trailer_url: trailerUrl
            });
        }

        await anime.save();
        console.log(`✅ Saved new anime: ${anime.title}`);

        res.json(anime);

    } catch (error) {
        console.error(`❌ Error fetching anime ${id}:`, error.message);
        
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ message: 'Anime not found on AniList' });
        }
        
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add anime to User's Watchlist
// @route   POST /api/anime/watchlist
const addToWatchlist = async (req, res) => {
    const { animeId, title, poster } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const isEntryExist = user.watchlist.find(item => item.animeId === Number(animeId));
        
        if (isEntryExist) {
            return res.status(400).json({ message: 'Anime already in your watchlist' });
        }
        
        user.watchlist.push({ animeId, title, poster });
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
    const { animeId, title, poster, status, review } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const isEntryExist = user.watchhistory.find(item => item.animeId === Number(animeId));
        
        if (isEntryExist) {
            return res.status(400).json({ message: 'Anime already in your watchhistory' });
        }
        
        user.watchhistory.push({ 
            animeId, title, poster, 
            status: status || 'Watching', 
            review: review || '' 
        });
        
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

// @desc    Get Home Page Data (AniList API + Caching)
// @route   GET /api/anime/home
const getHomeData = async (req, res) => {
    try {
        // 1. Serve from Cache if valid
        const now = Date.now();
        if (homeCache.data && (now - homeCache.lastFetch < CACHE_DURATION)) {
            console.log("⚡ Serving Home Data from Cache");
            return res.json(homeCache.data);
        }

        console.log("🌐 Fetching Fresh Home Data from AniList API...");

        // 2. Fetch Data in ONE single GraphQL query
        const query = `
        query {
          trending: Page(perPage: 20) {
            media(type: ANIME, sort: TRENDING_DESC, status: RELEASING) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
          topRated: Page(perPage: 20) {
            media(type: ANIME, sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
          popular: Page(perPage: 20) {
            media(type: ANIME, sort: POPULARITY_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
          upcoming: Page(perPage: 20) {
            media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
          latest: Page(perPage: 20) {
            media(type: ANIME, season: SUMMER, seasonYear: 2026, sort: POPULARITY_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
          action: Page(perPage: 20) {
            media(type: ANIME, genre: "Action", sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
          fantasy: Page(perPage: 20) {
            media(type: ANIME, genre: "Fantasy", sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
          romance: Page(perPage: 20) {
            media(type: ANIME, genre: "Romance", sort: SCORE_DESC) {
              idMal id title { romaji english } coverImage { extraLarge large }
              averageScore format seasonYear status startDate { year }
            }
          }
        }`;

        const data = await anilistQuery(query);

        // 3. Format Data
        const finalData = {
            trending: formatAniListMedia(data.trending.media),
            topRated: formatAniListMedia(data.topRated.media),
            popular: formatAniListMedia(data.popular.media),
            upcoming: formatAniListMedia(data.upcoming.media),
            latest: formatAniListMedia(data.latest.media),
            action: formatAniListMedia(data.action.media),
            fantasy: formatAniListMedia(data.fantasy.media),
            romance: formatAniListMedia(data.romance.media),
        };

        // 4. Update Cache
        homeCache = {
            data: finalData,
            lastFetch: now
        };

        res.json(finalData);

    } catch (error) {
        console.error("❌ AniList API Error:", error.message);
        if (error.response) {
            console.error("AniList Error Data:", error.response.data);
        }
        
        // Fallback: If AniList fails, serve old cache if exists
        if (homeCache.data) {
            console.log("⚠️ Serving Stale Cache due to API Error");
            return res.json(homeCache.data);
        }

        res.status(500).json({ message: "Failed to fetch anime data", error: error.message });
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