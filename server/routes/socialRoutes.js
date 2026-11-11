const express = require('express');
const router = express.Router();
const { 
    recommendAnime, 
    addFriend, 
    getRecommendations, 
    getNotifications, 
    getFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    getFriends,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    declineFriendRequest
} = require('../controllers/socialController'); 

const { protect } = require('../middleware/authMiddleware');

// --- Friend Management ---
router.get('/friends', protect, getFriends);
router.post('/friends/request', protect, sendFriendRequest);
router.post('/friends/accept', protect, acceptFriendRequest);
router.delete('/friends/decline/:notificationId', protect, declineFriendRequest);
router.get('/friends/requests', protect, getFriendRequests);

// --- Recommendations (Sent by Friends) ---
// Note: This matches /api/social/recommend in server.js mount point
router.post('/recommend', protect, recommendAnime); 
router.get('/recommendations/friends', protect, getRecommendations);

// --- Notifications ---
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read-all', protect, markAllNotificationsAsRead);
router.put('/notifications/:notificationId/read', protect, markNotificationAsRead);
router.delete('/notifications/:notificationId', protect, deleteNotification);

module.exports = router;