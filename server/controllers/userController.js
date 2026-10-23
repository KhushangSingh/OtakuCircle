const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const { sendEmail, buildEmailHtml } = require('../utils/emailUtils');

const buildDashboardStats = (user) => {
    const animeHistory = Array.isArray(user.watchhistory) ? user.watchhistory : [];
    const animeWatchlist = Array.isArray(user.watchlist) ? user.watchlist : [];
    const movieHistory = Array.isArray(user.movieWatchhistory) ? user.movieWatchhistory : [];
    const movieWatchlist = Array.isArray(user.movieWatchlist) ? user.movieWatchlist : [];
    const isCompleted = (item) => ['Watched', 'Completed'].includes(item.status);
    const isWatching = (item) => item.status === 'Watching';
    const watched = animeHistory.filter(isCompleted).length + movieHistory.filter(isCompleted).length;
    const watching = animeHistory.filter(isWatching).length + movieHistory.filter(isWatching).length;
    const watchlist = animeWatchlist.length + movieWatchlist.length;
    const history = animeHistory.length + movieHistory.length;
    const total = history + watchlist;
    const scored = animeHistory.filter(item => Number(item.score) > 0);
    const averageScore = scored.length
        ? Number((scored.reduce((sum, item) => sum + Number(item.score), 0) / scored.length).toFixed(2))
        : null;

    return {
        total,
        history,
        watched,
        watching,
        watchlist,
        animeCount: animeHistory.length + animeWatchlist.length,
        movieCount: movieHistory.length + movieWatchlist.length,
        estimatedHours: Math.round((animeHistory.length * 5) + (movieHistory.length * 2)),
        completionRate: history ? Math.round((watched / history) * 100) : 0,
        averageScore,
        commitmentScore: total ? Math.round(((watched + watching) / total) * 100) : 0
    };
};

// Helper: generate a random 6-digit OTP string
const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper: basic email format validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// @desc    Get User Profile (Public info)
// @route   GET /api/users/:userId
const getUser = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.userId }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ ...user.toObject(), dashboardStats: buildDashboardStats(user) });
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

// @desc    Delete User Account (OTP-verified)
// @route   DELETE /api/users/profile
const deleteUser = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ message: 'Verification code is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify OTP
        const otpRecord = await OTP.findOne({
            email: user.email,
            type: 'account_delete',
            otp
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Delete OTP record and user
        await OTP.deleteOne({ _id: otpRecord._id });
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
        const user = await User.findOne({ username: req.params.userId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            ...buildDashboardStats(user),
            favoriteGenre: user.stats?.favoriteGenre || null,
            genreCounts: user.stats?.genreCounts || {}
        });
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

        // Task 9.1: Fire-and-forget security confirmation email (non-blocking)
        sendEmail(
            user.email,
            'OtakuCircle — Your password was changed',
            buildEmailHtml(
                'Password changed successfully',
                "Your account password was just updated. If this was you, no action is needed. If you didn't make this change, secure your account immediately.",
                `<a href="${process.env.FRONTEND_URL || 'https://otakucircle.vercel.app'}/login" class="btn">Secure My Account →</a>`
            )
        ).catch(err => console.error('[security-email] password-changed send failed:', err));

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change Email (OTP-verified)
// @route   PUT /api/users/email
const changeEmail = async (req, res) => {
    try {
        const { newEmail, currentPassword, otp } = req.body;

        if (!newEmail || !currentPassword || !otp) {
            return res.status(400).json({ message: 'New email, current password, and verification code are required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Find and verify OTP record
        const otpRecord = await OTP.findOne({
            email: user.email,
            type: 'email_change',
            otp
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Verify OTP was issued for this specific newEmail
        if (otpRecord.pendingPasswordHash !== newEmail) {
            return res.status(400).json({ message: 'Verification code does not match the requested email address' });
        }

        // Race-condition guard: re-check newEmail uniqueness
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const oldEmail = user.email;

        // Update email and delete OTP record
        user.email = newEmail;
        await user.save();
        await OTP.deleteOne({ _id: otpRecord._id });

        // Fire-and-forget security confirmation email to old address (non-blocking)
        sendEmail(
            oldEmail,
            'OtakuCircle — Your email address was changed',
            buildEmailHtml(
                'Email address changed',
                `The email address on your OtakuCircle account has been updated to ${newEmail}. If you made this change, you're all set. If you didn't, contact us immediately.`,
                `<p class="note">Changed on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>`
            )
        ).catch(err => console.error('[security-email] email-changed send failed:', err));

        res.json({ message: 'Email updated successfully' });
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

// @desc    Update Email Notification Preferences
// @route   PUT /api/users/email-preferences
// Task 5.1
const updateEmailPreferences = async (req, res) => {
    try {
        const RECOGNIZED_KEYS = ['friendRecommendation', 'friendRequest', 'friendRequestAccepted', 'platformUpdates'];

        // Filter to only recognized keys
        const updates = {};
        for (const key of RECOGNIZED_KEYS) {
            if (typeof req.body[key] === 'boolean') {
                updates[`emailPreferences.${key}`] = req.body[key];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid preference fields provided' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true }
        ).select('emailPreferences');

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ emailPreferences: user.emailPreferences });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP to new email address for email change verification
// @route   POST /api/users/email/send-otp
// Task 7.1
const sendEmailChangeOtp = async (req, res) => {
    try {
        const { newEmail, currentPassword } = req.body;

        if (!newEmail || !currentPassword) {
            return res.status(400).json({ message: 'New email and current password are required' });
        }

        // Validate email format
        if (!isValidEmail(newEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Check newEmail is not already taken
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Delete any existing email_change OTPs for this user
        await OTP.deleteMany({ email: user.email, type: 'email_change' });

        // Create new OTP — store newEmail in pendingPasswordHash field
        const otpCode = makeOtp();
        await OTP.create({
            email: user.email,
            otp: otpCode,
            type: 'email_change',
            pendingPasswordHash: newEmail
        });

        // Send OTP email to the new address
        await sendEmail(
            newEmail,
            'OtakuCircle — Verify your new email address',
            buildEmailHtml(
                'Verify your new email',
                `Enter the code below to confirm your new email address for OtakuCircle. This code expires in 10 minutes.`,
                `<div class="otp-box"><p class="otp-code">${otpCode}</p></div>`
            )
        );

        res.json({ message: `Verification code sent to ${newEmail}` });
    } catch (error) {
        console.error('[email-change-otp] send failed:', error);
        res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }
};

// @desc    Send OTP to user's current email for account deletion verification
// @route   POST /api/users/delete/send-otp
// Task 8.1
const sendDeleteOtp = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Delete any existing account_delete OTPs for this user
        await OTP.deleteMany({ email: user.email, type: 'account_delete' });

        // Create new OTP
        const otpCode = makeOtp();
        await OTP.create({
            email: user.email,
            otp: otpCode,
            type: 'account_delete'
        });

        // Send OTP to user's current email
        await sendEmail(
            user.email,
            'OtakuCircle — Confirm account deletion',
            buildEmailHtml(
                'Confirm account deletion',
                'Enter the code below to permanently delete your OtakuCircle account. This action cannot be undone. The code expires in 10 minutes.',
                `<div class="otp-box"><p class="otp-code">${otpCode}</p></div>`
            )
        );

        res.json({ message: 'Verification code sent to your email' });
    } catch (error) {
        console.error('[delete-otp] send failed:', error);
        res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }
};

module.exports = { 
    getUser, 
    updateProfile, 
    deleteUser, 
    getUserStats, 
    changePassword, 
    changeEmail, 
    searchUsers,
    updateEmailPreferences,
    sendEmailChangeOtp,
    sendDeleteOtp
};
