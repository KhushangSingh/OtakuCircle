const express = require('express');
const router = express.Router();
const axios = require('axios');
const Anime = require('../models/Anime');

/**
 * @desc    Smart Semantic Search (Connects to Python ML Service)
 * @route   GET /api/search/smart?q=sad anime about music
 * @access  Public
 */
router.get('/smart', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json({ data: [] });

        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

        // 1. Call Python ML Service
        try {
            const mlResponse = await axios.get(`${mlServiceUrl}/search?q=${encodeURIComponent(query)}`);
            const animeIds = mlResponse.data.results; // Returns array of mal_ids e.g., [123, 456]

            if (!animeIds || animeIds.length === 0) {
                return res.json({ data: [] });
            }

            // 2. Fetch Full Details from MongoDB
            const animes = await Anime.find({ mal_id: { $in: animeIds } })
                .select('mal_id title poster_url score type year genres synopsis');

            // 3. Re-sort the results to match the AI's relevance ranking
            // MongoDB does not guarantee order with $in, so manual sorting is required
            const animeMap = new Map(animes.map(a => [a.mal_id, a]));
            const sortedResults = animeIds
                .map(id => animeMap.get(id))
                .filter(a => a !== undefined); 

            res.json({ data: sortedResults });

        } catch (mlError) {
            console.error("⚠️ ML Service Error:", mlError.message);
            
            // Fallback: Basic Text Search if AI is down
            const fallback = await Anime.find({ $text: { $search: query } }).limit(20);
            return res.json({ data: fallback });
        }

    } catch (error) {
        console.error("❌ Search Route Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;