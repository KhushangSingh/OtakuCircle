const User = require('../models/User');
const Anime = require('../models/Anime');
const axios = require('axios');

/**
 * Finds the most relevant watched anime to genuinely explain why a title is recommended.
 */
function generateExplanation(recAnime, watchedDocs, topGenres) {
    const recGenres = new Set(recAnime.genres || []);

    let bestWatched = null;
    let maxOverlap = 0;
    let sharedGenres = [];

    for (const watched of watchedDocs) {
        const watchedGenres = watched.genres || [];
        const overlap = watchedGenres.filter(g => recGenres.has(g));
        if (overlap.length > maxOverlap) {
            maxOverlap = overlap.length;
            bestWatched = watched;
            sharedGenres = overlap;
        }
    }

    if (bestWatched && maxOverlap >= 1) {
        const genreStr = sharedGenres.slice(0, 2).join(' & ');
        return {
            explanation: `Because you watched ${bestWatched.title} (${genreStr})`,
            matchedTitle: bestWatched.title,
            matchedGenres: sharedGenres,
            recommendationType: 'history_based'
        };
    }

    // Genre affinity explanation
    const matchingTopGenre = topGenres.find(g => recGenres.has(g));
    if (matchingTopGenre) {
        return {
            explanation: `Matches your love for ${matchingTopGenre} anime`,
            matchedGenres: [matchingTopGenre],
            recommendationType: 'genre_affinity'
        };
    }

    // High quality / acclaim explanation
    return {
        explanation: `Critically acclaimed ${recAnime.genres?.[0] || 'title'} matching your taste`,
        matchedGenres: recAnime.genres ? recAnime.genres.slice(0, 2) : [],
        recommendationType: 'curated'
    };
}

// @desc    Get AI Recommendations based on personal watch history
// @route   GET /api/recommendations
// @access  Private
const getRecommendations = async (req, res) => {
    try {
        // 1. Fetch User Data
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Filter for 'Watched' or 'Watching'
        const watchedAnimeIds = (user.watchhistory || [])
            .filter(item => item.status === 'Watched' || item.status === 'Watching')
            .map(item => item.animeId);

        // Track all IDs to exclude: watched, watchlist, and explicitly dismissed
        const excludedAnimeIds = new Set([
            ...user.watchhistory.map(item => Number(item.animeId)),
            ...user.watchlist.map(item => Number(item.animeId)),
            ...(user.dismissedRecommendations || []).map(Number)
        ]);

        // 2. Fetch User's Watched Anime Details to understand taste & generate honest explanations
        const watchedDocs = watchedAnimeIds.length > 0 
            ? await Anime.find({ mal_id: { $in: watchedAnimeIds } }).select('mal_id title genres score')
            : [];

        // Compute User's Genre Distribution
        const genreCounts = {};
        for (const doc of watchedDocs) {
            for (const genre of doc.genres || []) {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            }
        }
        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        // 3. CASE A: Empty Watch History -> Starter Gateway Recommendations (Avoid empty dead-ends)
        if (watchedDocs.length === 0) {
            // Curate top starter picks across varied genres
            const gatewayGenres = ['Action', 'Fantasy', 'Romance', 'Mystery', 'Sci-Fi'];
            const starterPicks = [];
            const seenStarterIds = new Set();

            for (const g of gatewayGenres) {
                const picks = await Anime.find({
                    mal_id: { $nin: Array.from(excludedAnimeIds) },
                    genres: g,
                    score: { $gte: 8.0 }
                })
                .select('mal_id title title_english poster_url score type year episodes status genres synopsis')
                .sort({ score: -1 })
                .limit(4);

                for (const p of picks) {
                    if (!seenStarterIds.has(p.mal_id) && starterPicks.length < 24) {
                        seenStarterIds.add(p.mal_id);
                        starterPicks.push({
                            ...p.toObject(),
                            explanation: `Gateway ${g} masterpiece to help start your profile`,
                            matchedGenres: [g],
                            recommendationType: 'starter'
                        });
                    }
                }
            }

            return res.json({
                hasHistory: false,
                historyCount: 0,
                starterGuide: true,
                message: "Here are starter masterpieces across top genres. Mark what you've seen or add to watchlist to personalize your feed!",
                data: starterPicks
            });
        }

        // 4. CASE B: User Has Watch History -> Call ML Service or Smart Fallback
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
        let rawRecommendedList = [];

        try {
            const mlResponse = await axios.post(`${mlServiceUrl}/predict`, {
                watched_ids: watchedAnimeIds
            }, { timeout: 3500 });

            const recommendedIds = mlResponse.data?.recommendations;

            if (Array.isArray(recommendedIds) && recommendedIds.length > 0) {
                const fetchedRecs = await Anime.find({
                    mal_id: { $in: recommendedIds }
                }).select('mal_id title title_english poster_url score type year episodes status genres synopsis');

                const recMap = new Map(fetchedRecs.map(a => [a.mal_id, a]));
                rawRecommendedList = recommendedIds
                    .map(id => recMap.get(id))
                    .filter(a => a && !excludedAnimeIds.has(Number(a.mal_id)));
            }
        } catch (mlErr) {
            // ML service unavailable or timed out; continue directly to genre-affinity fallback
        }

        // 5. Intelligent Fallback / Supplement:
        // If ML returned fewer than 18 recommendations or failed, supplement using top genre affinity
        if (rawRecommendedList.length < 18) {
            const currentRecIds = new Set(rawRecommendedList.map(a => Number(a.mal_id)));
            const combinedExclusions = new Set([...excludedAnimeIds, ...currentRecIds]);

            // Query top-rated anime across the user's top genres
            const genreFilters = topGenres.slice(0, 3);
            if (genreFilters.length > 0) {
                const genreRecs = await Anime.find({
                    mal_id: { $nin: Array.from(combinedExclusions) },
                    genres: { $in: genreFilters },
                    score: { $gte: 7.5 }
                })
                .select('mal_id title title_english poster_url score type year episodes status genres synopsis')
                .sort({ score: -1 })
                .limit(30 - rawRecommendedList.length);

                for (const item of genreRecs) {
                    if (!combinedExclusions.has(Number(item.mal_id))) {
                        combinedExclusions.add(Number(item.mal_id));
                        rawRecommendedList.push(item);
                    }
                }
            }
        }

        // 6. Attach Genuine Explanations to Every Recommended Anime
        const finalRecommendations = rawRecommendedList.map(anime => {
            const animeObj = anime.toObject ? anime.toObject() : anime;
            const explanationData = generateExplanation(animeObj, watchedDocs, topGenres);
            return {
                ...animeObj,
                ...explanationData
            };
        });

        res.json({
            hasHistory: true,
            historyCount: watchedDocs.length,
            topGenres: topGenres.slice(0, 4),
            data: finalRecommendations
        });

    } catch (error) {
        console.error("❌ Recommendation Controller Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Dismiss a recommendation (Indicate suggestion isn't relevant)
// @route   POST /api/recommendations/dismiss
// @access  Private
const dismissRecommendation = async (req, res) => {
    try {
        const { animeId } = req.body;
        if (!animeId) {
            return res.status(400).json({ message: "animeId is required" });
        }

        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { dismissedRecommendations: Number(animeId) }
        });

        res.json({ success: true, message: "Recommendation dismissed", animeId: Number(animeId) });
    } catch (error) {
        console.error("❌ Dismiss Recommendation Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Restore / Undismiss a previously dismissed recommendation
// @route   POST /api/recommendations/undismiss
// @access  Private
const undismissRecommendation = async (req, res) => {
    try {
        const { animeId } = req.body;
        if (!animeId) {
            return res.status(400).json({ message: "animeId is required" });
        }

        await User.findByIdAndUpdate(req.user.id, {
            $pull: { dismissedRecommendations: Number(animeId) }
        });

        res.json({ success: true, message: "Recommendation restored", animeId: Number(animeId) });
    } catch (error) {
        console.error("❌ Undismiss Recommendation Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getRecommendations,
    dismissRecommendation,
    undismissRecommendation
};
