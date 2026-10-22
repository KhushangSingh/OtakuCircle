/**
 * Shared email utilities for OtakuCircle.
 *
 * Extracted from authController.js so that both authController.js and
 * userController.js can import sendEmail, buildEmailHtml, and oAuth2Client
 * without creating circular dependencies.
 */

require('dotenv').config();
const { google } = require('googleapis');

// --- GMAIL REST API (avoids SMTP port blocks on Render/Railway free tiers) ---
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

/**
 * Core email sender via Gmail REST API.
 * @param {string} to      - recipient email
 * @param {string} subject - email subject
 * @param {string} html    - HTML body
 */
const sendEmail = async (to, subject, html) => {
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

/** Shared HTML email wrapper with OtakuCircle branding */
const buildEmailHtml = (headlineText, bodyText, ctaHtml) => `
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
    .btn { display:inline-block; background:linear-gradient(135deg,#6366f1,#818cf8); color:#fff; font-weight:700; font-size:15px; padding:14px 36px; border-radius:12px; text-decoration:none; margin-bottom:20px; }
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
      ${ctaHtml}
      <p class="note">If you didn&#39;t request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} OtakuCircle &mdash; Automated Security Message</div>
  </div>
</body>
</html>`;

module.exports = { oAuth2Client, sendEmail, buildEmailHtml };
