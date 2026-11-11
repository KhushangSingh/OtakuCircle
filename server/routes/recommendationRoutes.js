const express = require('express');
const router = express.Router();
const { 
    getRecommendations, 
    dismissRecommendation, 
    undismissRecommendation 
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware'); 

/**
 * @desc    Get AI-powered recommendations based on watch history
 * @route   GET /api/recommendations
 * @access  Private
 */
router.get('/', protect, getRecommendations);
router.post('/dismiss', protect, dismissRecommendation);
router.post('/undismiss', protect, undismissRecommendation);

module.exports = router;
