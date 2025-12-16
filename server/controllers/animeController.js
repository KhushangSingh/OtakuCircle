const axios = require('axios');
const Anime = require('../models/Anime');
const User = require('../models/User');

// --- CONFIGURATION ---
const JIKAN_BASE = 'https://api.jikan.moe/v4';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 Hours

// Simple In-Memory Cache (Resets on server restart)
let homeCache = {
    data: null,
    lastFetch: 0
};

// --- HELPERS ---

// Delay to respect Jikan's rate limit (3 req/sec)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Format Jikan response to match application schema
const formatAnime = (list) => {
    return list.map(item => ({
        mal_id: item.mal_id,
        title: item.title,
        poster_url: item.images.jpg.large_image_url || item.images.jpg.image_url,
        score: item.score,
        type: item.type,
        year: item.year || (item.aired && item.aired.prop && item.aired.prop.from ? item.aired.prop.from.year : null),
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

// @desc    Get single anime (DB first -> Jikan Fallback)
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

        if (anime) {
            // Found in DB
            return res.json(anime);
        }

        // 3. Fallback: Fetch from Jikan API if not in DB
        console.log(`⚠️ Anime ${id} not in DB. Fetching from Jikan...`);
        const jikanUrl = `https://api.jikan.moe/v4/anime/${id}`;
        
        const response = await axios.get(jikanUrl);
        const data = response.data.data;

        if (!data) {
            return res.status(404).json({ message: 'Anime not found' });
        }

        // 4. Create new Anime entry in DB (Cache it for next time)
        anime = new Anime({
            mal_id: data.mal_id,
            title: data.title,
            title_english: data.title_english,
            synopsis: data.synopsis,
            type: data.type,
            episodes: data.episodes,
            status: data.status,
            score: data.score,
            genres: data.genres ? data.genres.map(g => g.name) : [],
            poster_url: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url
        });

        await anime.save();
        console.log(`✅ Saved new anime: ${data.title}`);

        res.json(anime);

    } catch (error) {
        console.error(`❌ Error fetching anime ${id}:`, error.message);
        
        // Handle Jikan 404
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ message: 'Anime not found on Jikan' });
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
//           JIKAN API CONTROLLER
// ==========================================

// @desc    Get Home Page Data (Jikan API + Caching)
// @route   GET /api/anime/home
const getHomeData = async (req, res) => {
    try {
        // 1. Serve from Cache if valid
        const now = Date.now();
        if (homeCache.data && (now - homeCache.lastFetch < CACHE_DURATION)) {
            console.log("⚡ Serving Home Data from Cache");
            return res.json(homeCache.data);
        }

        console.log("🌐 Fetching Fresh Home Data from Jikan API...");

        // 2. Fetch Data Sequentially (To avoid 429 Rate Limits)
        const trendingRes = await axios.get(`${JIKAN_BASE}/top/anime?filter=airing&limit=20`);
        await delay(1000); 

        const topRatedRes = await axios.get(`${JIKAN_BASE}/top/anime?limit=20`);
        await delay(1000);

        const popularRes = await axios.get(`${JIKAN_BASE}/top/anime?filter=bypopularity&limit=20`);
        await delay(1000);

        const upcomingRes = await axios.get(`${JIKAN_BASE}/top/anime?filter=upcoming&limit=20`);
        await delay(1000);

        const latestRes = await axios.get(`${JIKAN_BASE}/seasons/now?limit=20`);
        await delay(1000);

        const actionRes = await axios.get(`${JIKAN_BASE}/anime?genres=1&order_by=score&sort=desc&limit=20`);
        await delay(1000);

        const fantasyRes = await axios.get(`${JIKAN_BASE}/anime?genres=10&order_by=score&sort=desc&limit=20`);
        await delay(1000);

        const romanceRes = await axios.get(`${JIKAN_BASE}/anime?genres=22&order_by=score&sort=desc&limit=20`);

        // 3. Format Data
        const finalData = {
            trending: formatAnime(trendingRes.data.data),
            topRated: formatAnime(topRatedRes.data.data),
            popular: formatAnime(popularRes.data.data),
            upcoming: formatAnime(upcomingRes.data.data),
            latest: formatAnime(latestRes.data.data),
            action: formatAnime(actionRes.data.data),
            fantasy: formatAnime(fantasyRes.data.data),
            romance: formatAnime(romanceRes.data.data),
        };

        // 4. Update Cache
        homeCache = {
            data: finalData,
            lastFetch: now
        };

        res.json(finalData);

    } catch (error) {
        console.error("❌ Jikan API Error:", error.message);
        
        // Fallback: If Jikan fails, serve old cache if exists
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