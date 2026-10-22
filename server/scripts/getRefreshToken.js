const { google } = require('googleapis');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://mail.google.com/'];

function getAccessToken() {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for obtaining a Refresh Token
        scope: SCOPES,
        prompt: 'consent'       // Force consent screen so refresh token is always returned
    });

    console.log('\n======================================================');
    console.log('1. Open this URL in your browser:');
    console.log(authUrl);
    console.log('======================================================\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('2. Enter the authorization code from the page/URL: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code.trim(), (err, token) => {
            if (err) {
                return console.error('❌ Error retrieving access token:', err.message);
            }

            console.log('\n✅ Authorization successful!');
            console.log('Copy this REFRESH_TOKEN into your server .env file:\n');
            console.log(`REFRESH_TOKEN=${token.refresh_token}\n`);
            if (!token.refresh_token) {
                console.log('⚠️ Note: If refresh_token is undefined, disconnect this app in your Google Account (myaccount.google.com/permissions) and run this script again with prompt=consent.');
            }
        });
    });
}

getAccessToken();
