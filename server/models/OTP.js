const mongoose = require('mongoose');

// TTL index: MongoDB auto-deletes documents 300 seconds (5 min) after createdAt
const OTPSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp:   { type: String, required: true },
    type:  { type: String, enum: ['register', 'reset'], required: true },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 600 } // 10 minutes
});

module.exports = mongoose.model('OTP', OTPSchema);
