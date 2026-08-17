const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// --- IMPORT CONTROLLERS ---
const { registerUser, loginUser, forgotPassword, verifyOtp, resetPassword } = require('./controllers/authController');

const { 
    getAnimes, 
    getAnimeById, 
    addToWatchlist, 
    getHomeData, 
    removeFromWatchlist, 
    addToWatchhistory, 
    updateWatchhistory, 
    removeFromWatchhistory 
} = require('./controllers/animeController');

const { 
    getUser, 
    updateProfile, 
    deleteUser, 
    getUserStats, 
    changePassword, 
    changeEmail, 
    searchUsers 
} = require('./controllers/userController');

const { 
    sendFriendRequest, 
    acceptFriendRequest, 
    getFriends,
    getFriendRequests,
    recommendAnime, 
    getRecommendations: getFriendRecommendations, // RENAME THIS to avoid conflict
    getNotifications, 
    markNotificationAsRead, 
    declineFriendRequest,
    deleteRecommendation
} = require('./controllers/socialController');

// --- NEW IMPORT: AI RECOMMENDATION CONTROLLER ---
const { getRecommendations: getAIRecommendations } = require('./controllers/recommendationController');

// --- MIDDLEWARE ---
const { protect } = require('./middleware/authMiddleware');

// --- CONFIG ---
dotenv.config();
connectDB();

const app = express();

// Middleware Setup
app.use(cors());
app.use(express.json()); 

// ==============================
//           ROUTES
// ==============================

// --- AUTH ROUTES ---
app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', loginUser);
app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/verify-otp', verifyOtp);
app.post('/api/auth/reset-password', resetPassword);

// --- SEARCH ROUTES ---
const searchRoutes = require('./routes/search');
app.use('/api/search', searchRoutes); 
app.get('/api/search/users', protect, searchUsers);

// --- ANIME ROUTES ---
const animeRoutes = require('./routes/anime');
app.use('/api/anime', animeRoutes); 
app.get('/api/anime', getAnimes); 
app.get('/api/anime/home', getHomeData); 
app.get('/api/anime/:id', getAnimeById); 

// --- USER ROUTES ---
app.get('/api/users/:userId', getUser);
app.get('/api/users/:userId/stats', getUserStats);
app.put('/api/users/profile', protect, updateProfile);    
app.delete('/api/users/profile', protect, deleteUser);    
app.put('/api/users/password', protect, changePassword);  
app.put('/api/users/email', protect, changeEmail);        

// --- SOCIAL & FRIEND ROUTES ---
app.post('/api/friends/request', protect, sendFriendRequest);
app.post('/api/friends/accept', protect, acceptFriendRequest);
app.delete('/api/friends/decline/:notificationId', protect, declineFriendRequest);
app.get('/api/friends', protect, getFriends);
app.get('/api/friends/requests', protect, getFriendRequests);

// --- NOTIFICATIONS ---
app.get('/api/social/notifications', protect, getNotifications);
app.put('/api/social/notifications/:notificationId/read', protect, markNotificationAsRead);

// --- RECOMMENDATION ROUTES ---

// 1. Send Recommendation TO a friend
app.post('/api/social/recommend', protect, recommendAnime); 

// 2. Get Recommendations FROM friends (Social)
app.get('/api/recommendations/friends', protect, getFriendRecommendations); 

// 3. Delete a recommendation
app.delete('/api/recommendations/:id', protect, deleteRecommendation);

// 4. [NEW] Get AI Recommendations (For You Page)
// This fixes the 404 error
app.get('/api/recommendations', protect, getAIRecommendations);


// --- LIBRARY ROUTES ---
app.post('/api/anime/watchlist', protect, addToWatchlist);
app.delete('/api/anime/watchlist/:animeId', protect, removeFromWatchlist);
app.post('/api/anime/watchhistory', protect, addToWatchhistory);
app.put('/api/anime/watchhistory/:animeId', protect, updateWatchhistory);
app.delete('/api/anime/watchhistory/:animeId', protect, removeFromWatchhistory);


// --- MOVIES MODULE ---
const movieRoutes = require('./routes/movies');
app.use('/api/movies', movieRoutes);


// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));