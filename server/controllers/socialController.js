const User = require('../models/User');
const Anime = require('../models/Anime');
const Notification = require('../models/Notification');
const { sendEmail, buildEmailHtml } = require('../utils/emailUtils');

const getHistoryVector = (user) => {
    const vector = new Map();
    const addItems = (items, idKey, completedStatuses) => {
        (Array.isArray(items) ? items : []).forEach(item => {
            if (item[idKey] === undefined || item[idKey] === null) return;
            const key = `${idKey}:${item[idKey]}`;
            const weight = completedStatuses.includes(item.status) ? 1 : 0.6;
            vector.set(key, Math.max(vector.get(key) || 0, weight));
        });
    };

    addItems(user.watchhistory, 'animeId', ['Watched', 'Completed']);
    addItems(user.movieWatchhistory, 'tmdbId', ['Completed']);
    return vector;
};

const calculateHistorySimilarity = (firstUser, secondUser) => {
    const first = getHistoryVector(firstUser);
    const second = getHistoryVector(secondUser);
    if (first.size === 0 || second.size === 0) return null;

    const keys = new Set([...first.keys(), ...second.keys()]);
    let dot = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;
    let sharedItems = 0;

    keys.forEach(key => {
        const firstWeight = first.get(key) || 0;
        const secondWeight = second.get(key) || 0;
        if (firstWeight && secondWeight) sharedItems += 1;
        dot += firstWeight * secondWeight;
        firstMagnitude += firstWeight ** 2;
        secondMagnitude += secondWeight ** 2;
    });

    if (sharedItems === 0 || firstMagnitude === 0 || secondMagnitude === 0) return 0;
    return Math.round((dot / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude))) * 100);
};

// @desc    Add a friend
// @route   POST /api/friends/request (Handled by sendFriendRequest, this adds directly)
const addFriend = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const friendToAdd = await User.findById(req.params.id);

        if (!friendToAdd) return res.status(404).json({ message: 'User not found' });
        
        if (currentUser.friends.includes(friendToAdd._id)) {
            return res.status(400).json({ message: 'Already friends' });
        }

        currentUser.friends.push(friendToAdd._id);
        friendToAdd.friends.push(currentUser._id);
        
        await currentUser.save();
        await friendToAdd.save();

        res.status(200).json({ message: 'Friend added!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Recommend Anime to Friend
// @route   POST /api/social/recommend
const recommendAnime = async (req, res) => {
    const { friendId, friendIds, animeId, animeTitle, animePoster, message, mediaType, type } = req.body;
    
    const targetIds = Array.isArray(friendIds) && friendIds.length > 0
        ? friendIds
        : (friendId ? [friendId] : []);

    if (targetIds.length === 0) {
        return res.status(400).json({ message: 'Please select at least one friend to recommend.' });
    }

    const isManga = (type || '').toLowerCase().includes('manga') || 
                    (type || '').toLowerCase().includes('manhwa') || 
                    (mediaType || '').toLowerCase() === 'manga';
    const verb = isManga ? 'already read this manga' : 'already watched this anime';
    const mediaNoun = isManga ? 'manga' : 'anime';

    try {
        const sender = await User.findById(req.user.id).select('username');
        const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';

        // Single recipient handling
        if (targetIds.length === 1) {
            const singleFriend = await User.findById(targetIds[0]);
            if (!singleFriend) return res.status(404).json({ message: 'Friend not found' });

            const hasCompleted = (singleFriend.watchhistory || []).some(
                h => Number(h.animeId) === Number(animeId) && (h.status === 'Watched' || h.status === 'Completed')
            );

            if (hasCompleted) {
                return res.status(400).json({
                    code: 'RECOMMENDATION_UNAVAILABLE',
                    title: 'Recommendation unavailable',
                    message: `This friend has already ${verb}.`,
                    subtitle: 'The recommendation cannot be sent to this friend.'
                });
            }

            const alreadyRec = (singleFriend.recommendations || []).find(
                r => Number(r.animeId) === Number(animeId) && r.from.toString() === req.user.id
            );

            if (alreadyRec) {
                return res.status(400).json({ message: `You already recommended this ${mediaNoun} to ${singleFriend.username}.` });
            }

            singleFriend.recommendations.unshift({
                from: req.user.id,
                animeId,
                animeTitle,
                animePoster,
                message: message || ''
            });
            await singleFriend.save();

            await Notification.create({
                recipient: singleFriend._id,
                sender: req.user.id,
                type: 'RECOMMENDATION',
                animeId,
                animeTitle,
                message: `${req.user.username} recommended: ${animeTitle}`
            });

            if (singleFriend.emailPreferences?.friendRecommendation !== false) {
                sendEmail(
                    singleFriend.email,
                    `OtakuCircle - ${sender?.username || 'A friend'} recommended an anime`,
                    buildEmailHtml(
                        `New anime recommendation!`,
                        `${sender?.username || 'A friend'} recommended <strong style="color:#f4f4f5">${animeTitle}</strong> to you${message ? `: "${message}"` : '.'}`,
                        `<a href="${frontendUrl}/friends?tab=recommendations" class="btn">View Recommendation -></a>`
                    )
                ).catch(err => console.error('[email] recommendAnime send failed:', err));
            }

            return res.status(200).json({ message: 'Recommendation sent!' });
        }

        // Multiple recipients handling
        const friends = await User.find({ _id: { $in: targetIds } });
        let sentCount = 0;
        const blockedRecipients = [];

        for (const friend of friends) {
            const hasCompleted = (friend.watchhistory || []).some(
                h => Number(h.animeId) === Number(animeId) && (h.status === 'Watched' || h.status === 'Completed')
            );

            if (hasCompleted) {
                blockedRecipients.push({
                    _id: friend._id,
                    username: friend.username,
                    reason: `This friend has already ${verb}.`
                });
                continue; // Block only recipients who completed
            }

            // Check if already recommended
            const alreadyRec = (friend.recommendations || []).find(
                r => Number(r.animeId) === Number(animeId) && r.from.toString() === req.user.id
            );
            if (alreadyRec) {
                continue;
            }

            friend.recommendations.unshift({
                from: req.user.id,
                animeId,
                animeTitle,
                animePoster,
                message: message || ''
            });
            await friend.save();

            await Notification.create({
                recipient: friend._id,
                sender: req.user.id,
                type: 'RECOMMENDATION',
                animeId,
                animeTitle,
                message: `${req.user.username} recommended: ${animeTitle}`
            });

            if (friend.emailPreferences?.friendRecommendation !== false) {
                sendEmail(
                    friend.email,
                    `OtakuCircle - ${sender?.username || 'A friend'} recommended an anime`,
                    buildEmailHtml(
                        `New anime recommendation!`,
                        `${sender?.username || 'A friend'} recommended <strong style="color:#f4f4f5">${animeTitle}</strong> to you${message ? `: "${message}"` : '.'}`,
                        `<a href="${frontendUrl}/friends?tab=recommendations" class="btn">View Recommendation -></a>`
                    )
                ).catch(err => console.error('[email] recommendAnime send failed:', err));
            }

            sentCount++;
        }

        if (sentCount === 0) {
            return res.status(400).json({
                code: 'ALL_RECIPIENTS_BLOCKED',
                title: 'Recommendation unavailable',
                message: `All selected friends have already ${verb}. The recommendation cannot be sent.`,
                blockedRecipients
            });
        }

        return res.status(200).json({
            message: `Recommendation sent to ${sentCount} friend(s)!`,
            sentCount,
            blockedRecipients
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Recommendations for Current User
// @route   GET /api/recommendations/friends
const getRecommendations = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('recommendations.from', 'username profilePicture')
            .lean();

        if (!user) return res.status(404).json({ message: 'User not found' });

        const animeIds = [...new Set((user.recommendations || []).map(r => r.animeId).filter(Boolean))];
        let animeMap = new Map();
        if (animeIds.length > 0) {
            try {
                const animeDocs = await Anime.find({ mal_id: { $in: animeIds } })
                    .select('mal_id title title_english synopsis genres score type year episodes poster_url')
                    .lean();
                animeMap = new Map(animeDocs.map(a => [a.mal_id, a]));
            } catch (err) {
                console.error('Error fetching anime metadata for recommendations:', err);
            }
        }

        // Format data for frontend
        const formattedRecs = (user.recommendations || []).map(rec => {
            const animeInfo = animeMap.get(rec.animeId);
            return {
                _id: rec._id,
                from: rec.from,
                message: rec.message || '',
                status: rec.status || 'active',
                anime: {
                    mal_id: rec.animeId,
                    title: rec.animeTitle || animeInfo?.title || animeInfo?.title_english || 'Unknown Title',
                    poster_url: rec.animePoster || animeInfo?.poster_url || '',
                    genres: animeInfo?.genres || [],
                    score: animeInfo?.score,
                    type: animeInfo?.type || 'TV',
                    year: animeInfo?.year,
                    synopsis: animeInfo?.synopsis || ''
                },
                timestamp: rec.timestamp
            };
        });

        res.json(formattedRecs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a recommendation
// @route   DELETE /api/recommendations/:id
const deleteRecommendation = async (req, res) => {
    try {
        // Use $pull to remove item from array atomically
        const result = await User.updateOne(
            { _id: req.user.id }, 
            { $pull: { recommendations: { _id: req.params.id } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Recommendation not found or already deleted' });
        }

        res.status(200).json({ message: 'Recommendation deleted' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete all recommendations for an anime title
// @route   DELETE /api/recommendations/anime/:animeId
const deleteAnimeRecommendations = async (req, res) => {
    try {
        const animeId = Number(req.params.animeId);
        const result = await User.updateOne(
            { _id: req.user.id }, 
            { $pull: { recommendations: { animeId: animeId } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Recommendation not found or already deleted' });
        }

        res.status(200).json({ message: 'Recommendations for anime deleted' });
    } catch (error) {
        console.error("Delete Anime Recs Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update status of an individual recommendation (active/Keep, planned, completed, not_interested, archived)
// @route   PATCH /api/recommendations/:id/status
const updateRecommendationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['active', 'planned', 'completed', 'not_interested', 'archived'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const rec = (user.recommendations || []).id(req.params.id);
        if (!rec) return res.status(404).json({ message: 'Recommendation not found' });

        rec.status = status;

        // Two-way synchronization with personal library
        const animeId = Number(rec.animeId);
        const mediaType = rec.mediaType || 'anime';

        if (status === 'planned') {
            const alreadyInWatchlist = (user.watchlist || []).some(w => Number(w.animeId) === animeId);
            if (!alreadyInWatchlist) {
                user.watchlist.unshift({
                    animeId,
                    title: rec.animeTitle,
                    poster: rec.animePoster,
                    mediaType
                });
            }
        } else if (status === 'completed') {
            user.watchlist = (user.watchlist || []).filter(w => Number(w.animeId) !== animeId);
            const historyItem = (user.watchhistory || []).find(h => Number(h.animeId) === animeId);
            if (historyItem) {
                historyItem.status = 'Watched';
            } else {
                user.watchhistory.unshift({
                    animeId,
                    title: rec.animeTitle,
                    poster: rec.animePoster,
                    mediaType,
                    status: 'Watched'
                });
            }
        }

        await user.save();
        res.status(200).json({ message: `Recommendation marked as ${status}`, status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update status for all recommendations of a title with Library Sync (active/Keep, planned, completed, not_interested, archived)
// @route   PATCH /api/recommendations/anime/:animeId/status
const updateAnimeRecommendationsStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['active', 'planned', 'completed', 'not_interested', 'archived'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const animeId = Number(req.params.animeId);
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let updated = false;
        let matchedRec = null;

        (user.recommendations || []).forEach(r => {
            if (Number(r.animeId) === animeId) {
                r.status = status;
                updated = true;
                if (!matchedRec) matchedRec = r;
            }
        });

        if (!updated) {
            return res.status(404).json({ message: 'No recommendations found for this title' });
        }

        // Two-way synchronization with personal library
        const mediaType = matchedRec?.mediaType || 'anime';

        if (status === 'planned') {
            const alreadyInWatchlist = (user.watchlist || []).some(w => Number(w.animeId) === animeId);
            if (!alreadyInWatchlist) {
                user.watchlist.unshift({
                    animeId,
                    title: matchedRec.animeTitle,
                    poster: matchedRec.animePoster,
                    mediaType
                });
            }
        } else if (status === 'completed') {
            // Remove from plan to watch
            user.watchlist = (user.watchlist || []).filter(w => Number(w.animeId) !== animeId);
            // Add or update in watch history as Watched / Completed
            const historyItem = (user.watchhistory || []).find(h => Number(h.animeId) === animeId);
            if (historyItem) {
                historyItem.status = 'Watched';
            } else {
                user.watchhistory.unshift({
                    animeId,
                    title: matchedRec.animeTitle,
                    poster: matchedRec.animePoster,
                    mediaType,
                    status: 'Watched'
                });
            }
        }

        await user.save();
        res.status(200).json({ message: `Recommendations marked as ${status}`, status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Decoupled Movie Recommendations ---

// @desc    Recommend Movie/TV to Friend
// @route   POST /api/social/recommend-movie
// @desc    Recommend Movie/TV to Friend(s)
// @route   POST /api/social/recommend-movie
const recommendMovie = async (req, res) => {
    const { friendId, friendIds, tmdbId, title, poster, mediaType, message } = req.body;
    
    const targetIds = Array.isArray(friendIds) && friendIds.length > 0
        ? friendIds
        : (friendId ? [friendId] : []);

    if (targetIds.length === 0) {
        return res.status(400).json({ message: 'Please select at least one friend to recommend.' });
    }

    const mediaNoun = mediaType === 'tv' ? 'TV show' : 'movie';
    const verb = mediaType === 'tv' ? 'already watched this show' : 'already watched this movie';

    try {
        const sender = await User.findById(req.user.id).select('username');
        const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';

        // Single recipient handling
        if (targetIds.length === 1) {
            const singleFriend = await User.findById(targetIds[0]);
            if (!singleFriend) return res.status(404).json({ message: 'Friend not found' });

            const hasCompleted = (singleFriend.movieWatchhistory || []).some(
                m => Number(m.tmdbId) === Number(tmdbId) && (m.status === 'Watched' || m.status === 'Completed')
            );

            if (hasCompleted) {
                return res.status(400).json({
                    code: 'RECOMMENDATION_UNAVAILABLE',
                    title: 'Recommendation unavailable',
                    message: "This friend has already " + verb + ".",
                    subtitle: 'The recommendation cannot be sent to this friend.'
                });
            }

            const alreadyRec = (singleFriend.movieRecommendations || []).find(
                r => Number(r.tmdbId) === Number(tmdbId) && r.mediaType === mediaType && r.from.toString() === req.user.id
            );

            if (alreadyRec) {
                return res.status(400).json({ message: "You already recommended this " + mediaNoun + " to " + singleFriend.username + "." });
            }

            singleFriend.movieRecommendations.unshift({
                from: req.user.id,
                tmdbId,
                title,
                poster,
                mediaType,
                message: message || ''
            });
            await singleFriend.save();

            await Notification.create({
                recipient: singleFriend._id,
                sender: req.user.id,
                type: 'RECOMMENDATION',
                movieId: tmdbId,
                movieTitle: title,
                mediaType: mediaType,
                message: req.user.username + " recommended: " + title
            });

            if (singleFriend.emailPreferences?.friendRecommendation !== false) {
                sendEmail(
                    singleFriend.email,
                    "OtakuCircle - " + (sender?.username || 'A friend') + " recommended a " + mediaNoun,
                    buildEmailHtml(
                        "New " + mediaNoun + " recommendation!",
                        `${sender?.username || 'A friend'} recommended <strong style="color:#f4f4f5">${title}</strong> to you${message ? `: "${message}"` : '.'}`,
                        `<a href="${frontendUrl}/recommendations" class="btn">View Recommendation -></a>`
                    )
                ).catch(err => console.error('[email] recommendMovie send failed:', err));
            }

            return res.status(200).json({ message: 'Recommendation sent!' });
        }

        // Multiple recipients handling
        const friends = await User.find({ _id: { $in: targetIds } });
        let sentCount = 0;
        const blockedRecipients = [];

        for (const friend of friends) {
            const hasCompleted = (friend.movieWatchhistory || []).some(
                m => Number(m.tmdbId) === Number(tmdbId) && (m.status === 'Watched' || m.status === 'Completed')
            );

            if (hasCompleted) {
                blockedRecipients.push({
                    _id: friend._id,
                    username: friend.username,
                    reason: "This friend has already " + verb + "."
                });
                continue; // Block only recipients who completed
            }

            const alreadyRec = (friend.movieRecommendations || []).find(
                r => Number(r.tmdbId) === Number(tmdbId) && r.mediaType === mediaType && r.from.toString() === req.user.id
            );
            if (alreadyRec) {
                continue;
            }

            friend.movieRecommendations.unshift({
                from: req.user.id,
                tmdbId,
                title,
                poster,
                mediaType,
                message: message || ''
            });
            await friend.save();

            await Notification.create({
                recipient: friend._id,
                sender: req.user.id,
                type: 'RECOMMENDATION',
                movieId: tmdbId,
                movieTitle: title,
                mediaType: mediaType,
                message: req.user.username + " recommended: " + title
            });

            if (friend.emailPreferences?.friendRecommendation !== false) {
                sendEmail(
                    friend.email,
                    "OtakuCircle - " + (sender?.username || 'A friend') + " recommended a " + mediaNoun,
                    buildEmailHtml(
                        "New " + mediaNoun + " recommendation!",
                        `${sender?.username || 'A friend'} recommended <strong style="color:#f4f4f5">${title}</strong> to you${message ? `: "${message}"` : '.'}`,
                        `<a href="${frontendUrl}/recommendations" class="btn">View Recommendation -></a>`
                    )
                ).catch(err => console.error('[email] recommendMovie send failed:', err));
            }

            sentCount++;
        }

        if (sentCount === 0) {
            return res.status(400).json({
                code: 'ALL_RECIPIENTS_BLOCKED',
                title: 'Recommendation unavailable',
                message: "All selected friends have already " + verb + ". The recommendation cannot be sent.",
                blockedRecipients
            });
        }

        return res.status(200).json({
            message: "Recommendation sent to " + sentCount + " friend(s)!",
            sentCount,
            blockedRecipients
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Movie Recommendations for Current User
// @route   GET /api/recommendations/movies
const getMovieRecommendations = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('movieRecommendations.from', 'username profilePicture')
            .lean();

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Format data for frontend (similar to anime but with decoupled fields)
        const formattedRecs = user.movieRecommendations.map(rec => ({
            _id: rec._id,
            from: rec.from,
            message: rec.message,
            movie: {
                tmdbId: rec.tmdbId,
                title: rec.title,
                poster: rec.poster,
                mediaType: rec.mediaType
            },
            timestamp: rec.timestamp
        }));

        res.json(formattedRecs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a movie recommendation
// @route   DELETE /api/recommendations/movies/:id
const deleteMovieRecommendation = async (req, res) => {
    try {
        const result = await User.updateOne(
            { _id: req.user.id }, 
            { $pull: { movieRecommendations: { _id: req.params.id } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Recommendation not found or already deleted' });
        }

        res.status(200).json({ message: 'Recommendation deleted' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get Notifications
// @route   GET /api/social/notifications
const getNotifications = async (req, res) => {
    try {
        const notes = await Notification.find({ recipient: req.user._id || req.user.id })
            .populate('sender', 'username _id profilePicture') 
            .sort({ createdAt: -1 })
            .lean();
        
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Friend Requests
// @route   GET /api/friends/requests
const getFriendRequests = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id || req.user.id)
            .select('watchhistory movieWatchhistory')
            .lean();
        const requests = await Notification.find({
            recipient: req.user._id || req.user.id,
            type: 'FRIEND_REQUEST'
        })
        .populate('sender', 'username _id profilePicture') 
        .sort({ createdAt: -1 })
        .lean();

        const senderIds = requests.map(request => request.sender?._id).filter(Boolean);
        const senders = await User.find({ _id: { $in: senderIds } })
            .select('watchhistory movieWatchhistory')
            .lean();
        const historyById = new Map(senders.map(sender => [sender._id.toString(), sender]));

        res.json(requests.map(request => ({
            ...request,
            tasteMatch: calculateHistorySimilarity(currentUser, historyById.get(request.sender?._id?.toString()))
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Sent Friend Requests
// @route   GET /api/friends/requests/sent
const getSentFriendRequests = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id || req.user.id)
            .select('watchhistory movieWatchhistory')
            .lean();
        const requests = await Notification.find({
            sender: req.user._id || req.user.id,
            type: 'FRIEND_REQUEST'
        })
        .populate('recipient', 'username _id profilePicture') 
        .sort({ createdAt: -1 })
        .lean();

        const recipientIds = requests.map(request => request.recipient?._id).filter(Boolean);
        const recipients = await User.find({ _id: { $in: recipientIds } })
            .select('watchhistory movieWatchhistory')
            .lean();
        const historyById = new Map(recipients.map(recipient => [recipient._id.toString(), recipient]));

        res.json(requests.map(request => ({
            ...request,
            tasteMatch: calculateHistorySimilarity(currentUser, historyById.get(request.recipient?._id?.toString()))
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send Friend Request
const sendFriendRequest = async (req, res) => {
    try {
        const { friendId } = req.body;
        const sender = await User.findById(req.user.id);
        if (!sender) return res.status(404).json({ message: 'Sender not found' });

        const recipient = await User.findById(friendId);
        if (!recipient) return res.status(404).json({ message: 'User not found' });

        // Check if already friends
        const senderFriends = sender.friends.map(f => f.toString());
        if (senderFriends.includes(friendId.toString())) {
            return res.status(400).json({ message: 'Already friends' });
        }

        // Check if request already pending
        const existingNotification = await Notification.findOne({
            sender: req.user.id,
            recipient: friendId,
            type: 'FRIEND_REQUEST',
            isRead: false
        });

        if (existingNotification) {
            return res.status(400).json({ message: 'Friend request already sent' });
        }

        const notification = await Notification.create({
            recipient: friendId,
            sender: req.user.id,
            type: 'FRIEND_REQUEST',
            message: `${sender.username} sent you a friend request`
        });

        // Email notification (gated by recipient preference)
        if (recipient.emailPreferences?.friendRequest !== false) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';
            sendEmail(
                recipient.email,
                `OtakuCircle — ${sender.username} sent you a friend request`,
                buildEmailHtml(
                    'New friend request!',
                    `<strong style="color:#f4f4f5">${sender.username}</strong> wants to be your friend on OtakuCircle. Accept or decline from the Friends page.`,
                    `<a href="${frontendUrl}/friends" class="btn">View Friend Request →</a>`
                )
            ).catch(err => console.error('[email] sendFriendRequest send failed:', err));
        }

        res.json({ message: 'Friend request sent', notificationId: notification._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel Sent Friend Request
// @route   DELETE /api/friends/request/:friendId
const cancelFriendRequest = async (req, res) => {
    try {
        const { friendId } = req.params;
        const senderId = req.user.id || req.user._id;

        const result = await Notification.findOneAndDelete({
            sender: senderId,
            recipient: friendId,
            type: 'FRIEND_REQUEST'
        });

        if (!result) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        res.json({ message: 'Friend request cancelled' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Accept Friend Request
const acceptFriendRequest = async (req, res) => {
    try {
        const { friendId, notificationId } = req.body;
        const currentUserId = req.user._id || req.user.id;
        
        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: currentUserId,
            sender: friendId,
            type: 'FRIEND_REQUEST'
        });

        if (!notification) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        // Add to both users
        await User.findByIdAndUpdate(currentUserId, { $addToSet: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $addToSet: { friends: currentUserId } });
        
        // Remove request notification
        await Notification.findByIdAndDelete(notificationId);

        // Email notification to the original sender (gated by their preference)
        const originalSender = await User.findById(friendId).select('email username emailPreferences');
        const accepter = await User.findById(currentUserId).select('username');
        if (originalSender && originalSender.emailPreferences?.friendRequestAccepted !== false) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';
            sendEmail(
                originalSender.email,
                `OtakuCircle — ${accepter?.username || 'Someone'} accepted your friend request`,
                buildEmailHtml(
                    'Friend request accepted!',
                    `<strong style="color:#f4f4f5">${accepter?.username || 'Someone'}</strong> accepted your friend request. You're now friends on OtakuCircle!`,
                    `<a href="${frontendUrl}/friends" class="btn">View Friends →</a>`
                )
            ).catch(err => console.error('[email] acceptFriendRequest send failed:', err));
        }

        // Notify sender of acceptance
        await Notification.create({
            recipient: friendId,
            sender: currentUserId,
            type: 'INFO',
            message: `You are now friends!`
        });

        res.json({ message: 'Friend added successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark Notification as Read
const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: req.user.id || req.user._id },
            { isRead: true },
            { new: true }
        );
        res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark All Notifications as Read
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete / Dismiss Single Notification
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id || req.user._id;
        await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Decline Friend Request
const declineFriendRequest = async (req, res) => {
    try {
        const { notificationId } = req.params;
        await Notification.findByIdAndDelete(notificationId);
        res.json({ message: 'Friend request declined' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Friends List
const getFriends = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId)
            .select('friends watchhistory movieWatchhistory')
            .lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const friends = await User.find({ _id: { $in: user.friends } })
            .select('username _id watchhistory movieWatchhistory profilePicture') 
            .lean();
        
        const friendsWithCount = friends.map(friend => {
            const watchhistory = Array.isArray(friend.watchhistory) ? friend.watchhistory : [];
            const watchedList = watchhistory.filter(h => h.status === 'Watched' || h.status === 'Completed');
            const currentlyWatching = watchhistory.filter(h => h.status === 'Watching');
            
            // Get the most recent item
            let recentWatched = null;
            if (currentlyWatching.length > 0) {
                recentWatched = currentlyWatching[currentlyWatching.length - 1];
            } else if (watchhistory.length > 0) {
                recentWatched = watchhistory[watchhistory.length - 1];
            }

            const movieWatchhistory = Array.isArray(friend.movieWatchhistory) ? friend.movieWatchhistory : [];
            const completedAnimeIds = watchedList.map(h => Number(h.animeId)).filter(Boolean);
            const completedMovieIds = movieWatchhistory
                .filter(m => m.status === 'Watched' || m.status === 'Completed')
                .map(m => Number(m.tmdbId))
                .filter(Boolean);

            return {
                _id: friend._id,
                username: friend.username,
                profilePicture: friend.profilePicture, 
                watchlistCount: watchedList.length,
                recentWatched: recentWatched,
                completedAnimeIds,
                completedMovieIds,
                tasteMatch: calculateHistorySimilarity(user, friend)
            };
        });
        
        res.json(friendsWithCount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    addFriend, 
    recommendAnime, 
    getRecommendations, 
    getNotifications, 
    getFriendRequests, 
    getSentFriendRequests,
    sendFriendRequest, 
    acceptFriendRequest, 
    getFriends, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    deleteNotification, 
    declineFriendRequest,
    cancelFriendRequest,
    deleteRecommendation,
    deleteAnimeRecommendations,
    updateRecommendationStatus,
    updateAnimeRecommendationsStatus,
    recommendMovie,
    getMovieRecommendations,
    deleteMovieRecommendation
};
