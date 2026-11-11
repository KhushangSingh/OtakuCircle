/**
 * Database Configuration
 * Handles connection to MongoDB Atlas
 */
const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers to resolve MongoDB Atlas SRV records on Windows
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    // Fallback to system default if restricted
}

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;
