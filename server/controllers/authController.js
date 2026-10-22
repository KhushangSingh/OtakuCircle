const User = require('../models/User');
const OTP  = require('../models/OTP');
const jwt  = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { oAuth2Client, sendEmail, buildEmailHtml } = require('../utils/emailUtils');

// =============================================================================
// HELPERS
// =============================================================================

/** Generate a signed JWT */
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/** Generate a random 6-digit OTP string */
const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/** Generate a cryptographically secure URL-safe token for email links */
const makeSecureToken = () => crypto.randomBytes(32).toString('hex');

const formatGoogleUsername = (name = '') => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (words.length === 0) return 'Otaku';
    if (words.length === 1) return capitalize(words[0]);
    return `${capitalize(words[0])} ${capitalize(words[words.length - 1])}`;
};

/**
 * Send a styled OTP email (register / reset flows).
 */
const sendOtpEmail = async (to, otp, type = 'reset') => {
    const subject = type === 'register'
        ? 'OtakuCircle — Verify Your Email'
        : 'OtakuCircle — Password Reset Code';

    const headlineText = type === 'register'
        ? 'Verify your email address'
        : 'Reset your password';

    const bodyText = type === 'register'
        ? 'You&#39;re almost there! Use the code below to verify your email and complete registration.'
        : 'You requested a password reset. Use the code below to set a new password.';

    const ctaHtml = `
      <div class="otp-box"><p class="otp-code">${otp}</p></div>
      <p class="note">This code expires in <strong>10 minutes</strong>.</p>`;

    await sendEmail(to, subject, buildEmailHtml(headlineText, bodyText, ctaHtml));
};

/**
 * Send a "verify to link password" email with a one-click button.
 * The link points to the frontend which calls the confirm endpoint.
 */
const sendPasswordLinkEmail = async (to, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';
    const verifyUrl = `${frontendUrl}/verify-link?token=${token}`;

    const ctaHtml = `
      <a href="${verifyUrl}" class="btn">Verify &amp; Set Password</a>
      <p class="note">This link expires in <strong>10 minutes</strong>.<br>
      Clicking this confirms you own this email and will set a new password on your account.</p>`;

    await sendEmail(
        to,
        'OtakuCircle — Set a Password for Your Account',
        buildEmailHtml(
            'Set a password for your account',
            'Someone tried to sign in with a password on your Google-linked account. Click below to verify it&#39;s you and set a password — after this you can use either method.',
            ctaHtml
        )
    );
};

/**
 * Send a branded welcome email to a newly registered user.
 * Non-blocking — caller must catch errors.
 * @param {{ username: string, email: string }} user
 */
const sendWelcomeEmail = async (user) => {
    const username = (user.username || '').slice(0, 30) || 'Otaku';
    const frontendUrl = process.env.FRONTEND_URL || 'https://otakucircle.vercel.app';

    const subject = `Welcome to OtakuCircle, ${username}! 🎌`;
    const headlineText = `Welcome to OtakuCircle, ${username}! 🎉`;
    const bodyText = `Your account is ready. OtakuCircle is your home for tracking anime and movies, discovering what to watch next, and sharing your taste with friends.`;

    const ctaHtml = `
<div style="text-align:left;margin:0 0 24px;">
  <div style="display:flex;align-items:flex-start;margin-bottom:14px;">
    <span style="font-size:18px;margin-right:10px;line-height:1.4;">📺</span>
    <div>
      <strong style="color:#f4f4f5;font-size:14px;">Track everything you watch</strong>
      <p style="color:#a1a1aa;font-size:13px;margin:2px 0 0;">Log watch status, progress, and scores for anime and movies.</p>
    </div>
  </div>
  <div style="display:flex;align-items:flex-start;margin-bottom:14px;">
    <span style="font-size:18px;margin-right:10px;line-height:1.4;">✨</span>
    <div>
      <strong style="color:#f4f4f5;font-size:14px;">AI-powered recommendations</strong>
      <p style="color:#a1a1aa;font-size:13px;margin:2px 0 0;">Get personalised picks based on your taste and watch history.</p>
    </div>
  </div>
  <div style="display:flex;align-items:flex-start;margin-bottom:24px;">
    <span style="font-size:18px;margin-right:10px;line-height:1.4;">👥</span>
    <div>
      <strong style="color:#f4f4f5;font-size:14px;">Connect with friends</strong>
      <p style="color:#a1a1aa;font-size:13px;margin:2px 0 0;">Follow friends, see what they're watching, and share recommendations.</p>
    </div>
  </div>
</div>
<a href="${frontendUrl}" class="btn">Explore OtakuCircle →</a>
<p class="note" style="margin-top:16px;">Welcome aboard — we're glad you're here.</p>`;

    await sendEmail(user.email, subject, buildEmailHtml(headlineText, bodyText, ctaHtml));
};

// Google ID-token verifier (for Sign-In With Google on the client)
const googleVerifier = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// =============================================================================
// REGISTRATION — Step 1: Send OTP
// =============================================================================
// POST /api/auth/send-otp
const sendRegisterOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email is already registered' });

        const otp = makeOtp();
        await OTP.deleteMany({ email, type: 'register' });
        await OTP.create({ email, otp, type: 'register' });
        await sendOtpEmail(email, otp, 'register');

        res.json({ message: 'Verification code sent to your email' });
    } catch (err) {
        console.error('sendRegisterOtp error:', err);
        res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }
};

// =============================================================================
// REGISTRATION — Step 2: Verify OTP & Create Account
// =============================================================================
// POST /api/auth/register-verify
const registerVerify = async (req, res) => {
    const { username, email, password, otp } = req.body;
    try {
        const otpRecord = await OTP.findOne({ email, otp, type: 'register' });
        if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired verification code' });

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email is already registered' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            authProvider: 'local'
        });
        await OTP.deleteMany({ email, type: 'register' });

        // Task 3.3: Send welcome email (non-blocking — registration must not fail if email fails)
        sendWelcomeEmail(user).catch(err => console.error('[welcome-email] registerVerify send failed:', err));

        res.status(201).json({
            _id: user.id,
            username: user.username,
            token: generateToken(user.id)
        });
    } catch (err) {
        console.error('registerVerify error:', err);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
};

// =============================================================================
// LOGIN
// =============================================================================
// POST /api/auth/login
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        // --- CONFLICT: Google-only account tries email/password login ---
        // authProvider check covers new accounts; empty-password check covers legacy accounts
        if (user.authProvider === 'google' || (!user.password && user.authProvider !== 'both')) {
            // Send a verification email so the user can safely link a password
            const token = makeSecureToken();
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await OTP.deleteMany({ email, type: 'link' });
            await OTP.create({
                email,
                otp: token,          // reusing otp field to store the secure token
                type: 'link',
                pendingPasswordHash: hashedPassword
            });
            await sendPasswordLinkEmail(email, token);

            // Return a special action code — frontend shows a friendly message
            return res.status(200).json({
                action: 'link_required',
                message: 'This email is linked to a Google account. We\'ve sent a verification email — click the link in it to set a password and enable both sign-in methods.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        res.json({
            _id: user.id,
            username: user.username,
            token: generateToken(user.id),
            watchlist: user.watchlist
        });
    } catch (err) {
        console.error('loginUser error:', err);
        res.status(500).json({ message: err.message });
    }
};

// =============================================================================
// CONFIRM PASSWORD LINK (called when user clicks the email button)
// =============================================================================
// GET /api/auth/confirm-link?token=<token>
const confirmPasswordLink = async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Invalid or missing token' });

    try {
        const record = await OTP.findOne({ otp: token, type: 'link' });
        if (!record) {
            return res.status(400).json({ message: 'This link has expired or already been used. Please try signing in again.' });
        }

        const user = await User.findOne({ email: record.email });
        if (!user) return res.status(404).json({ message: 'Account not found' });

        // Set the pending password and upgrade authProvider to 'both'
        user.password = record.pendingPasswordHash;
        user.authProvider = 'both';
        await user.save();

        // Clean up the link token
        await OTP.deleteMany({ email: record.email, type: 'link' });

        // Log the user in immediately
        res.json({
            message: 'Password set successfully! You can now sign in with either Google or your email and password.',
            _id: user.id,
            username: user.username,
            token: generateToken(user.id),
            watchlist: user.watchlist
        });
    } catch (err) {
        console.error('confirmPasswordLink error:', err);
        res.status(500).json({ message: 'Failed to confirm link. Please try again.' });
    }
};

// =============================================================================
// GOOGLE SIGN-IN / SIGN-UP
// =============================================================================
// POST /api/auth/google
const googleAuth = async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleVerifier.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub: googleId, name, email, picture } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (user) {
            // --- CONFLICT: email/password account signs in with Google for the first time ---
            // Silently link Google to their existing account (safe because Google confirmed ownership)
            if (user.authProvider === 'local') {
                user.googleId = googleId;
                user.authProvider = 'both';
                if (!user.profilePicture && picture) user.profilePicture = picture;
                await user.save();
            }
            // For 'google' or 'both' — just log in normally
        } else {
            // --- NEW USER via Google ---
            const baseUsername = formatGoogleUsername(name);
            let username = baseUsername;
            let suffix = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername} ${suffix++}`;
            }
            user = await User.create({
                username,
                email,
                password: '',
                profilePicture: picture || '',
                authProvider: 'google',
                googleId
            });
            // Task 3.4: Send welcome email to new Google users (non-blocking)
            sendWelcomeEmail(user).catch(err => console.error('[welcome-email] googleAuth send failed:', err));
        }

        res.json({
            _id: user.id,
            username: user.username,
            token: generateToken(user.id),
            watchlist: user.watchlist
        });
    } catch (err) {
        console.error('googleAuth error:', err);
        res.status(500).json({ message: 'Google authentication failed' });
    }
};

// =============================================================================
// FORGOT PASSWORD — Step 1: Send OTP
// =============================================================================
// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'No account found with this email' });

        // Google-only account has no password to reset
        if (user.authProvider === 'google') {
            return res.status(400).json({
                message: 'This account uses Google Sign-In and has no password. Please sign in with Google.'
            });
        }

        const otp = makeOtp();
        await OTP.deleteMany({ email, type: 'reset' });
        await OTP.create({ email, otp, type: 'reset' });
        await sendOtpEmail(email, otp, 'reset');

        res.json({ message: 'Reset code sent to your email' });
    } catch (err) {
        console.error('forgotPassword error:', err);
        res.status(500).json({ message: 'Failed to send reset code. Please try again.' });
    }
};

// =============================================================================
// FORGOT PASSWORD — Step 2: Verify OTP
// =============================================================================
// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const record = await OTP.findOne({ email, otp, type: 'reset' });
        if (!record) return res.status(400).json({ message: 'Invalid or expired code. Please request a new one.' });

        record.verified = true;
        await record.save();

        res.json({ message: 'Code verified successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// =============================================================================
// FORGOT PASSWORD — Step 3: Set New Password
// =============================================================================
// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    const { email, password } = req.body;
    try {
        const record = await OTP.findOne({ email, type: 'reset', verified: true });
        if (!record) return res.status(400).json({ message: 'Please verify your code first' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.findOneAndUpdate({ email }, { password: hashedPassword });
        await OTP.deleteMany({ email, type: 'reset' });

        res.json({ message: 'Password reset successful! You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    sendRegisterOtp,
    registerVerify,
    loginUser,
    confirmPasswordLink,
    googleAuth,
    forgotPassword,
    verifyOtp,
    resetPassword,
    sendWelcomeEmail
};
