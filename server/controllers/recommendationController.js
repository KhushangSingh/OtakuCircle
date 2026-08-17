const User = require('../models/User');
const Anime = require('../models/Anime');
const axios = require('axios');

// @desc    Get AI Recommendations
// @route   GET /api/recommendations
const getRecommendations = async (req, res) => {
    try {
        // 1. Get User's Watch History
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Filter for 'Watched' or 'Watching'
        const watchedAnimeIds = user.watchhistory
            .filter(item => item.status === 'Watched' || item.status === 'Watching')
            .map(item => item.animeId);

        // Handle Empty History
        if (watchedAnimeIds.length === 0) {
            const fallback = await Anime.find().sort({ score: -1 }).limit(20);
            return res.json({
                message: "Watch some anime to get personalized picks!",
                data: fallback
            });
        }

        // 2. Call Python ML Service
        // Prioritize .env, fallback to 5001 if missing
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

        console.log(`🤖 Connecting to AI Service at: ${mlServiceUrl}/predict`);

        try {
            const mlResponse = await axios.post(`${mlServiceUrl}/predict`, {
                watched_ids: watchedAnimeIds
            });

            const recommendedIds = mlResponse.data.recommendations;

            if (!recommendedIds || recommendedIds.length === 0) {
                console.log("⚠️ AI returned no recommendations. Showing fallback.");
                const fallback = await Anime.find().sort({ members: -1 }).limit(20);
                return res.json({ data: fallback });
            }

            // 3. Fetch Full Anime Details from MongoDB
            const recommendations = await Anime.find({
                mal_id: { $in: recommendedIds }
            });

            // Re-sort to match ML ranking order
            const recMap = new Map(recommendations.map(a => [a.mal_id, a]));
            const sortedRecs = recommendedIds
                .map(id => recMap.get(id))
                .filter(a => a !== undefined);

            res.json({ data: sortedRecs });

        } catch (mlError) {
            console.error(`⚠️ ML Service Failed: ${mlError.message}`);
            console.error(`   -> Ensure Python script is running on port ${mlServiceUrl.split(':').pop()}`);

            // Fallback: Return popular anime if ML service is down
            const fallback = await Anime.find().sort({ members: -1 }).limit(24);
            return res.json({
                message: "AI unavailable, showing popular anime",
                data: fallback
            });
        }

    } catch (error) {
        console.error("❌ Recommendation Controller Error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getRecommendations };