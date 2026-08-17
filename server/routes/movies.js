const express = require('express');
const router = express.Router();
const { 
    getMoviesHomeData, 
    getMovieById, 
    addMovieToWatchlist, 
    removeMovieFromWatchlist,
    addMovieToWatchhistory
} = require('../controllers/movieController');
const { 
    recommendMovie, 
    getMovieRecommendations, 
    deleteMovieRecommendation 
} = require('../controllers/socialController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/home', getMoviesHomeData);
router.get('/:type/:id', getMovieById);

// Protected routes
router.post('/watchlist', protect, addMovieToWatchlist);
router.delete('/watchlist/:tmdbId', protect, removeMovieFromWatchlist);
router.post('/watchhistory', protect, addMovieToWatchhistory);

// Social recommendations (Movies)
router.post('/recommend', protect, recommendMovie);
router.get('/recommendations', protect, getMovieRecommendations);
router.delete('/recommendations/:id', protect, deleteMovieRecommendation);

module.exports = router;
