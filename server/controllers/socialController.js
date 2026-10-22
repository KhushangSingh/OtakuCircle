const User = require('../models/User');
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
    const { friendId, animeId, animeTitle, animePoster, message } = req.body;
    
    try {
        const friend = await User.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });

        // Check duplicates
        const alreadyRec = friend.recommendations.find(
            r => r.animeId === animeId && r.from.toString() === req.user.id
        );

        if (alreadyRec) {
            return res.status(400).json({ message: 'You already recommended this anime.' });
        }

        // Add to friend's recommendations list
        friend.recommendations.unshift({
            from: req.user.id,
            animeId,
            animeTitle,
            animePoster,
            message: message || ''
        });
        await friend.save();

        // Create Notification
        await Notification.create({
            recipient: friendId,
            sender: req.user.id,
            type: 'RECOMMENDATION',
            animeId,
            animeTitle,
            message: `${req.user.username} recommended: ${animeTitle}`
        });

        // Email notification (gated by recipient preference, truthy-default for existing users)
        if (friend.emailPreferences?.friendRecommendation !== false) {
            const sender = await User.findById(req.user.id).select('username');
            const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';
            sendEmail(
                friend.email,
                `OtakuCircle — ${sender?.username || 'A friend'} recommended an anime`,
                buildEmailHtml(
                    `New anime recommendation!`,
                    `${sender?.username || 'A friend'} recommended <strong style="color:#f4f4f5">${animeTitle}</strong> to you${message ? `: "${message}"` : '.'}`,
                    `<a href="${frontendUrl}/recommendations" class="btn">View Recommendation →</a>`
                )
            ).catch(err => console.error('[email] recommendAnime send failed:', err));
        }

        res.status(200).json({ message: 'Recommendation sent!' });
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

        // Format data for frontend
        const formattedRecs = user.recommendations.map(rec => ({
            _id: rec._id,
            from: rec.from,
            message: rec.message,
            anime: {
                mal_id: rec.animeId,
                title: rec.animeTitle,
                poster_url: rec.animePoster
            },
            timestamp: rec.timestamp
        }));

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

// --- Decoupled Movie Recommendations ---

// @desc    Recommend Movie/TV to Friend
// @route   POST /api/social/recommend-movie
const recommendMovie = async (req, res) => {
    const { friendId, tmdbId, title, poster, mediaType, message } = req.body;
    
    try {
        const friend = await User.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });

        // Check duplicates
        const alreadyRec = friend.movieRecommendations.find(
            r => r.tmdbId === tmdbId && r.mediaType === mediaType && r.from.toString() === req.user.id
        );

        if (alreadyRec) {
            return res.status(400).json({ message: 'You already recommended this.' });
        }

        // Add to friend's movie recommendations list
        friend.movieRecommendations.unshift({
            from: req.user.id,
            tmdbId,
            title,
            poster,
            mediaType,
            message: message || ''
        });
        await friend.save();

        // Create Notification
        await Notification.create({
            recipient: friendId,
            sender: req.user.id,
            type: 'RECOMMENDATION',
            movieId: tmdbId,
            movieTitle: title,
            mediaType: mediaType,
            message: `${req.user.username} recommended: ${title}`
        });

        // Email notification (gated by recipient preference)
        if (friend.emailPreferences?.friendRecommendation !== false) {
            const sender = await User.findById(req.user.id).select('username');
            const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';
            sendEmail(
                friend.email,
                `OtakuCircle — ${sender?.username || 'A friend'} recommended a ${mediaType || 'title'}`,
                buildEmailHtml(
                    `New ${mediaType === 'tv' ? 'TV show' : 'movie'} recommendation!`,
                    `${sender?.username || 'A friend'} recommended <strong style="color:#f4f4f5">${title}</strong> to you${message ? `: "${message}"` : '.'}`,
                    `<a href="${frontendUrl}/recommendations" class="btn">View Recommendation →</a>`
                )
            ).catch(err => console.error('[email] recommendMovie send failed:', err));
        }

        res.status(200).json({ message: 'Recommendation sent!' });
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
            .select('username _id watchhistory profilePicture') 
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

            return {
                _id: friend._id,
                username: friend.username,
                profilePicture: friend.profilePicture, 
                watchlistCount: watchedList.length,
                recentWatched: recentWatched,
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
    declineFriendRequest,
    cancelFriendRequest,
    deleteRecommendation,
    recommendMovie,
    getMovieRecommendations,
    deleteMovieRecommendation
};
