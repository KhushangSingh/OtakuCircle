const User = require('../models/User');
const Notification = require('../models/Notification');

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
        const requests = await Notification.find({
            recipient: req.user._id || req.user.id,
            type: 'FRIEND_REQUEST'
        })
        .populate('sender', 'username _id profilePicture') 
        .sort({ createdAt: -1 })
        .lean();

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Sent Friend Requests
// @route   GET /api/friends/requests/sent
const getSentFriendRequests = async (req, res) => {
    try {
        const requests = await Notification.find({
            sender: req.user._id || req.user.id,
            type: 'FRIEND_REQUEST'
        })
        .populate('recipient', 'username _id profilePicture') 
        .sort({ createdAt: -1 })
        .lean();

        res.json(requests);
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
        const user = await User.findById(userId).select('friends');
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
                recentWatched: recentWatched
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