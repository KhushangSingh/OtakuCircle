const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: '' },
    profilePicture: { type: String, default: '' },

    // Auth provider tracking
    // 'local'  — registered with email + password
    // 'google' — registered with Google Sign-In only (no local password)
    // 'both'   — started with one method, linked the other
    authProvider: {
        type: String,
        enum: ['local', 'google', 'both'],
        default: 'local'
    },
    googleId: { type: String, default: null },
    
    // Watchlist (Plan to Watch)
    watchlist: [{
        animeId: { type: Number, required: true },
        title: String,
        poster: String
    }],

    // Watch History (Completed/Watching)
    watchhistory: [{
        animeId: { type: Number, required: true },
        title: String,
        poster: String,
        status: {
            type: String,
            enum: ['Watching', 'Watched'],
            default: 'Watching'
        },
        progress: { type: Number, default: 0 },
        score: { type: Number, default: 0 },
        review: { type: String, default: '' }
    }],
    
    // --- Decoupled Movies Module ---
    movieWatchlist: [{
        tmdbId: Number,
        title: String,
        poster: String,
        mediaType: { type: String, enum: ['movie', 'tv'] },
        addedAt: { type: Date, default: Date.now }
    }],
    movieWatchhistory: [{
        tmdbId: Number,
        title: String,
        poster: String,
        mediaType: { type: String, enum: ['movie', 'tv'] },
        addedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['Watching', 'Completed', 'On Hold', 'Dropped'], default: 'Watching' },
        review: { type: String, default: '' }
    }],
    movieRecommendations: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        tmdbId: Number,
        title: String,
        poster: String,
        mediaType: { type: String, enum: ['movie', 'tv'] },
        message: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // Social Graph
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Recommendations Inbox (From Friends)
    recommendations: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        animeId: Number,
        animeTitle: String,
        animePoster: String,
        message: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // Aggregated Statistics
    stats: {
        totalWatched: { type: Number, default: 0 },
        favoriteGenre: { type: String, default: '' },
        genreCounts: { type: Map, of: Number, default: {} }
    },

    // Email notification preferences
    // Security emails (password changed, email changed) are always sent — not stored here
    emailPreferences: {
        friendRecommendation:   { type: Boolean, default: true },  // notify when a friend recommends something
        friendRequest:          { type: Boolean, default: true },  // notify when a friend request is received
        friendRequestAccepted:  { type: Boolean, default: true },  // notify when a friend request is accepted
        platformUpdates:        { type: Boolean, default: true }   // notify for OtakuCircle announcements
    }
}, { timestamps: true });
// --- Explicit Indexes for Performance ---
userSchema.index({ 'watchhistory.animeId': 1 });
userSchema.index({ 'movieWatchhistory.tmdbId': 1 });

module.exports = mongoose.model('User', userSchema);