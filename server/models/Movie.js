const mongoose = require('mongoose');

const movieSchema = mongoose.Schema({
    tmdb_id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    overview: { type: String },
    media_type: { type: String, enum: ['movie', 'tv'] },
    release_date: { type: String },
    vote_average: { type: Number },
    genres: [String],
    poster_url: { type: String },
    backdrop_url: { type: String },
    runtime: { type: Number }, // in minutes
    seasons: { type: Number }, // only for tv shows
    trailer_url: { type: String }
}, { 
    timestamps: true, 
    collection: 'movies' 
});

// Create indexes for performance
movieSchema.index({ title: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
