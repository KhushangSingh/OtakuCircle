const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['FRIEND_REQUEST', 'RECOMMENDATION', 'INFO'], 
        required: true 
    },
    animeId: { type: Number }, // Optional: only populated for recommendations
    animeTitle: { type: String },
    
    // --- Decoupled Movies Module ---
    movieId: { type: Number },
    movieTitle: { type: String },
    mediaType: { type: String, enum: ['movie', 'tv'] },
    
    message: { type: String },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);