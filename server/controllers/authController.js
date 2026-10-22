const User = require('../models/User');
const OTP  = require('../models/OTP');
const jwt  = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// =============================================================================
// HELPERS
// =============================================================================

/** Generate a signed JWT */
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_do_not_use_prod', { expiresIn: '7d' });

/** Generate a random 6-digit OTP string */
const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- GMAIL REST API (avoids SMTP port blocks on Render/Railway free tiers) ---
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

/**
 * Send a beautifully styled OTP email via Gmail REST API.
 * @param {string} to   - recipient email
 * @param {string} otp  - 6-digit code
 * @param {'register'|'reset'} type
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

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { margin:0; padding:0; font-family:'Inter',Arial,sans-serif; background:#09090b; color:#e4e4e7; }
    .wrap { max-width:480px; margin:40px auto; background:#141414; border-radius:18px; overflow:hidden; border:1px solid #27272a; box-shadow:0 8px 40px rgba(0,0,0,.6); }
    .header { background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%); padding:32px 30px; text-align:center; }
    .logo { font-size:26px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
    .logo span { color:#c7d2fe; }
    .content { padding:36px 32px; text-align:center; }
    h2 { margin:0 0 8px; color:#f4f4f5; font-size:20px; font-weight:700; }
    .sub { font-size:14px; color:#a1a1aa; line-height:1.6; margin-bottom:28px; }
    .otp-box { background:rgba(99,102,241,.12); border:1px solid #6366f1; border-radius:14px; display:inline-block; padding:12px 36px; margin-bottom:24px; }
    .otp-code { font-size:38px; font-weight:800; color:#818cf8; letter-spacing:8px; margin:0; font-family:monospace; }
    .note { font-size:12px; color:#71717a; }
    .footer { background:#0f0f11; padding:18px; text-align:center; font-size:11px; color:#52525b; border-top:1px solid #27272a; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header"><div class="logo">Otaku<span>Circle</span></div></div>
    <div class="content">
      <h2>${headlineText}</h2>
      <p class="sub">${bodyText}</p>
      <div class="otp-box"><p class="otp-code">${otp}</p></div>
      <p class="note">This code expires in <strong>10 minutes</strong>.<br>If you didn&#39;t request this, you can safely ignore it.</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} OtakuCircle &mdash; Automated Security Message</div>
  </div>
</body>
</html>`;

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const parts = [
        `From: OtakuCircle <${process.env.EMAIL_USER}>`,
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        html
    ];
    const raw = Buffer.from(parts.join('\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
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

        const user = await User.create({ username, email, password: hashedPassword });
        await OTP.deleteMany({ email, type: 'register' });

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
        if (!user.password) return res.status(400).json({ message: 'Please sign in with Google' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        res.json({
            _id: user.id,
            username: user.username,
            token: generateToken(user.id),
            watchlist: user.watchlist
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
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
        const { name, email, picture } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (!user) {
            // Auto-generate a unique username from the Google display name
            const baseUsername = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            let username = baseUsername;
            let suffix = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}${suffix++}`;
            }
            user = await User.create({
                username,
                email,
                password: '', // Google-only accounts have no local password
                profilePicture: picture || ''
            });
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
        if (!user.password) return res.status(400).json({ message: 'This account uses Google Sign-In. Password reset is not available.' });

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

module.exports = { sendRegisterOtp, registerVerify, loginUser, googleAuth, forgotPassword, verifyOtp, resetPassword };

