const axios = require('axios');
const Movie = require('../models/Movie');
const User = require('../models/User');

// --- CONFIGURATION ---
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'a04f61feaaae331e8c97b2c30765ebb3';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 Hours

let homeCache = {
    data: null,
    lastFetch: 0
};

// --- HELPERS ---
const formatTMDBMedia = (list, mediaType) => {
    return list.filter(item => item.poster_path).map(item => ({
        tmdb_id: item.id,
        title: item.title || item.name,
        poster_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        score: item.vote_average ? item.vote_average.toFixed(1) : null,
        type: mediaType || item.media_type || (item.title ? 'movie' : 'tv'),
        year: item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : null)
    }));
};

// ==========================================
//           CONTROLLERS
// ==========================================

// @desc    Get Home Page Data (TMDB API + Caching)
// @route   GET /api/movies/home
const getMoviesHomeData = async (req, res) => {
    try {
        if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY is not configured");

        const now = Date.now();
        if (homeCache.data && (now - homeCache.lastFetch < CACHE_DURATION)) {
            console.log("⚡ Serving Movies Home Data from Cache");
            return res.json(homeCache.data);
        }

        console.log("🌐 Fetching Fresh Home Data from TMDB API...");
        
        const fetchTMDB = (endpoint) => axios.get(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`);

        const [trending, popularMovies, popularTv, topRatedMovies] = await Promise.all([
            fetchTMDB('/trending/all/week'),
            fetchTMDB('/movie/popular'),
            fetchTMDB('/tv/popular'),
            fetchTMDB('/movie/top_rated')
        ]);

        const finalData = {
            trending: formatTMDBMedia(trending.data.results),
            popularMovies: formatTMDBMedia(popularMovies.data.results, 'movie'),
            popularTv: formatTMDBMedia(popularTv.data.results, 'tv'),
            topRatedMovies: formatTMDBMedia(topRatedMovies.data.results, 'movie')
        };

        homeCache = { data: finalData, lastFetch: now };
        res.json(finalData);

    } catch (error) {
        console.error("❌ TMDB API Error:", error.message);
        if (homeCache.data) return res.json(homeCache.data);
        res.status(500).json({ message: "Failed to fetch movie data", error: error.message });
    }
};

// @desc    Get single movie/show (DB first -> TMDB Fallback)
// @route   GET /api/movies/:type/:id
const getMovieById = async (req, res) => {
    const { type, id } = req.params; // type = 'movie' or 'tv'
    
    if (!['movie', 'tv'].includes(type) || isNaN(id)) {
        return res.status(400).json({ message: 'Invalid request parameters' });
    }

    try {
        let movie = await Movie.findOne({ tmdb_id: Number(id), media_type: type });

        if (movie) return res.json(movie);

        console.log(`⚠️ Media ${id} not in DB. Fetching from TMDB...`);
        const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos`);
        const data = response.data;

        let trailerUrl = null;
        if (data.videos && data.videos.results) {
            const trailer = data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
        }

        movie = new Movie({
            tmdb_id: data.id,
            title: data.title || data.name,
            overview: data.overview,
            media_type: type,
            release_date: data.release_date || data.first_air_date,
            vote_average: data.vote_average,
            genres: data.genres ? data.genres.map(g => g.name) : [],
            poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
            runtime: type === 'movie' ? data.runtime : (data.episode_run_time ? data.episode_run_time[0] : null),
            seasons: type === 'tv' ? data.number_of_seasons : null,
            trailer_url: trailerUrl
        });

        await movie.save();
        res.json(movie);

    } catch (error) {
        console.error(`❌ Error fetching ${type} ${id}:`, error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add to Movie Watchlist
// @route   POST /api/movies/watchlist
const addMovieToWatchlist = async (req, res) => {
    const { tmdbId, title, poster, mediaType } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (user.movieWatchlist.find(item => item.tmdbId === Number(tmdbId))) {
            return res.status(400).json({ message: 'Item already in your watchlist' });
        }
        
        user.movieWatchlist.push({ tmdbId, title, poster, mediaType });
        await user.save();
        res.status(201).json(user.movieWatchlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove from Movie Watchlist
// @route   DELETE /api/movies/watchlist/:tmdbId
const removeMovieFromWatchlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.movieWatchlist = user.movieWatchlist.filter(item => item.tmdbId !== Number(req.params.tmdbId));
        await user.save();
        res.json(user.movieWatchlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add to Movie Watch History
// @route   POST /api/movies/watchhistory
const addMovieToWatchhistory = async (req, res) => {
    const { tmdbId, title, poster, mediaType, status } = req.body;
    try {
        const user = await User.findById(req.user.id);
        
        user.movieWatchlist = user.movieWatchlist.filter(item => item.tmdbId !== Number(tmdbId));
        
        const existing = user.movieWatchhistory.find(item => item.tmdbId === Number(tmdbId));
        if (existing) {
            existing.status = status || 'Watched';
        } else {
            user.movieWatchhistory.push({ tmdbId, title, poster, mediaType, status: status || 'Watched' });
        }
        
        await user.save();
        res.status(200).json(user.movieWatchhistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search Movies and TV Shows
// @route   GET /api/movies/search?q=query
const searchMovies = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ message: "Search query is required" });

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
        // Filter out people and items without posters if desired, but definitely filter out people
        const validResults = response.data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        const formatted = formatTMDBMedia(validResults);
        res.json(formatted);
    } catch (error) {
        console.error("❌ TMDB Search Error:", error.message);
        res.status(500).json({ message: "Search failed", error: error.message });
    }
};

module.exports = {
    getMoviesHomeData,
    getMovieById,
    addMovieToWatchlist,
    removeMovieFromWatchlist,
    addMovieToWatchhistory,
    searchMovies
};
