const express = require('express');
const router = express.Router();
const Anime = require('../models/Anime'); 

/**
 * @desc    Search for anime by title (Simple DB Search)
 * @route   GET /api/anime/search?q=naruto
 * @access  Public
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        // Database Search with Regex
        const results = await Anime.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },         // Case-insensitive title
                { title_english: { $regex: query, $options: 'i' } }  // Case-insensitive english title
            ]
        })
        .select('mal_id title poster_url score type year') // Optimize payload size
        .sort({ score: -1 }) // Sort by highest score first
        .limit(5);           // Return only top 5 matches

        res.json(results);
    } catch (error) {
        console.error("Search Error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;