const mongoose = require('mongoose');

const animeSchema = mongoose.Schema({
    mal_id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    title_english: { type: String },
    synopsis: { type: String },
    type: { type: String },
    episodes: { type: Number },
    status: { type: String },
    score: { type: Number },
    genres: [String],
    poster_url: { type: String },
    duration: { type: String },
    trailer_url: { type: String },
    
    // Future-proofing for internal vector storage
    vector_embedding: { type: [Number], default: [] } 
}, {
    timestamps: true,
    collection: 'anime' // Ensures syncing with Python scripts
});

// Create indexes for performance
animeSchema.index({ title: 'text', title_english: 'text' });

module.exports = mongoose.model('Anime', animeSchema);