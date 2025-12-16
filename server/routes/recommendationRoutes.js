const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * @desc    Get AI-powered recommendations based on watch history
 * @route   GET /api/recommendations
 * @access  Private
 */
router.get('/', protect, getRecommendations);

module.exports = router;