const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get User Profile (Public info)
// @route   GET /api/users/:userId
const getUser = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.userId }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update User Profile (Avatar/Username)
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
    try {
        const { username, profilePicture } = req.body;
        const userId = req.user.id;
        const updates = {};

        if (profilePicture) updates.profilePicture = profilePicture;

        if (username) {
            // Check uniqueness
            const existingUser = await User.findOne({ username });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
            updates.username = username;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete User Account
// @route   DELETE /api/users/profile
const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get User Stats (Watch count, etc)
// @route   GET /api/users/:userId/stats
const getUserStats = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const stats = {
            totalWatched: user.watchhistory ? user.watchhistory.length : 0,
            totalSaved: user.watchlist ? user.watchlist.length : 0,
            favoriteGenre: user.stats?.favoriteGenre || 'N/A'
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change Password
// @route   PUT /api/users/password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change Email
// @route   PUT /api/users/email
const changeEmail = async (req, res) => {
    try {
        const { newEmail, currentPassword } = req.body;

        if (!newEmail || !currentPassword) {
            return res.status(400).json({ message: 'New email and current password are required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify password before allowing email change
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Check if email taken
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        user.email = newEmail;
        await user.save();

        res.json({ message: 'Email changed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search Users
// @route   GET /api/search/users
const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        const currentUser = req.user; 

        const searchTerm = q ? q.trim() : '';
        if (!searchTerm || searchTerm.length < 1) {
            return res.json([]);
        }

        // Escape special regex chars to prevent crashes
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const searchQuery = {
            username: { $regex: escapedSearchTerm, $options: 'i' }
        };

        // Exclude self from search
        if (currentUser && currentUser._id) {
            searchQuery._id = { $ne: currentUser._id };
        }

        const users = await User.find(searchQuery)
            .select('username _id profilePicture')
            .limit(20)
            .lean();

        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    getUser, 
    updateProfile, 
    deleteUser, 
    getUserStats, 
    changePassword, 
    changeEmail, 
    searchUsers 
};