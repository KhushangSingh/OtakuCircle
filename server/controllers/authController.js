const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper: Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_prod', { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check existing user
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const user = await User.create({ username, email, password: hashedPassword });

        if (user) {
            res.status(201).json({
                _id: user.id,
                username: user.username,
                token: generateToken(user.id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        
        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id,
                username: user.username,
                token: generateToken(user.id),
                watchlist: user.watchlist
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// =============================================
// FORGOT PASSWORD WITH OTP
// =============================================
const nodemailer = require('nodemailer');

// In-memory OTP store: { email: { otp, expiresAt } }
const otpStore = new Map();

// Email transporter (configured lazily)
let transporter = null;
function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
}

// @desc    Send OTP to user's email
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store with 10-minute expiry
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        // Send email
        await getTransporter().sendMail({
            from: `"OtakuCircle" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'OtakuCircle — Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0d0d0d; color: #fff; border-radius: 16px;">
                    <h2 style="margin: 0 0 8px; color: #818cf8;">OtakuCircle</h2>
                    <p style="color: #a1a1aa; margin: 0 0 24px;">Password Reset Request</p>
                    <div style="background: #1a1a2e; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
                        <p style="color: #a1a1aa; margin: 0 0 12px; font-size: 14px;">Your verification code is</p>
                        <h1 style="margin: 0; font-size: 40px; letter-spacing: 8px; color: #fff;">${otp}</h1>
                    </div>
                    <p style="color: #71717a; font-size: 13px; margin: 0;">This code expires in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        res.json({ message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
};

// @desc    Verify the OTP
// @route   POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const stored = otpStore.get(email);

        if (!stored) {
            return res.status(400).json({ message: 'OTP expired or not requested. Please try again.' });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        if (stored.otp !== otp) {
            return res.status(400).json({ message: 'Wrong OTP. Please check and try again.' });
        }

        // OTP is correct — mark as verified (keep it for reset step)
        stored.verified = true;
        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset password after OTP verification
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    const { email, password } = req.body;
    try {
        const stored = otpStore.get(email);

        if (!stored || !stored.verified) {
            return res.status(400).json({ message: 'Please verify OTP first' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user
        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        // Clean up OTP
        otpStore.delete(email);

        res.json({ message: 'Password reset successful! You can now log in.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, forgotPassword, verifyOtp, resetPassword };