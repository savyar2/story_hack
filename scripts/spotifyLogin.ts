import express, { RequestHandler } from 'express';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3000;

// Configure middleware and static file serving
const publicPath = path.join(__dirname, '../public');
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));
app.use(express.json());

// 🔑 Spotify API Credentials
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:3000/callback'; // Must match Spotify Dev Settings

// Store token information
let tokenInfo = {
  access_token: null,
  refresh_token: null,
  expires_at: 0
};

// Define the path to the metadata file (in scripts directory)
const metadataFilePath = path.join(__dirname, 'metadata.json');

// 🔹 Step 1: Redirect User to Spotify OAuth Login
app.get('/login', (req, res) => {
    const scope = 'user-read-private user-read-email user-top-read';
    const authURL = `https://accounts.spotify.com/authorize?${querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope,
        redirect_uri: REDIRECT_URI,
    })}`;
    res.redirect(authURL);
});

// 🔹 Step 2: Handle Spotify OAuth Callback & Get Access Token
app.get('/callback', async (req, res) => {
    const code = req.query.code as string;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
            },
        });

        // Store token information with expiration time
        tokenInfo.access_token = response.data.access_token;
        tokenInfo.refresh_token = response.data.refresh_token;
        tokenInfo.expires_at = Date.now() + (response.data.expires_in * 1000);
        
        // Redirect to tracks.html with the token
        res.redirect(`/tracks.html?token=${response.data.access_token}`);
        console.log('✅ Successfully authenticated with Spotify! Redirecting to tracks page');
    } catch (error: any) {
        console.error('❌ Error getting access token:', error.response?.data || error.message);
        res.send('Error logging into Spotify.');
    }
});

app.get('/refresh-token', async (req, res) => {
    // Check if we have a refresh token
    if (!tokenInfo.refresh_token) {
        res.status(401).json({ error: 'No refresh token available' });
        return;
    }
    
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: tokenInfo.refresh_token,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
            },
        });
        
        // Update token information
        tokenInfo.access_token = response.data.access_token;
        tokenInfo.expires_at = Date.now() + (response.data.expires_in * 1000);
        
        // If we got a new refresh token, update it too
        if (response.data.refresh_token) {
            tokenInfo.refresh_token = response.data.refresh_token;
        }
        
        res.json({ access_token: response.data.access_token });
        console.log('✅ Token refreshed successfully');
    } catch (error: any) {
        console.error('❌ Error refreshing token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Add the fetch-metadata endpoint
app.get('/fetch-metadata', (async (req, res) => {
    const trackId = req.query.trackId as string;
    const token = req.query.token as string;
    
    if (!trackId || !token) {
        return res.status(400).send('Missing trackId or token');
    }
    
    try {
        // Import your fetchSpotifyMetaData function
        const { fetchSpotifyTrackMetadata } = await import('./fetchSpotifyMetaData');
        
        // Override the token fetching by passing the existing token
        const metadata = await fetchSpotifyTrackMetadata(trackId, token);
        
        // Display the metadata in a simple page
        res.send(`
            <html>
                <head>
                    <title>Track Metadata</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1>Track Metadata</h1>
                    <pre>${JSON.stringify(metadata, null, 2)}</pre>
                    <p><a href="javascript:history.back()">Back to tracks</a></p>
                </body>
            </html>
        `);
    } catch (error: any) {
        console.error('Error fetching metadata:', error.message);
        res.status(500).send('Error fetching track metadata');
    }
}) as RequestHandler);

// Update your endpoint to write to a file and run the script
app.post('/log-metadata', express.json(), (req, res) => {
    console.log('🎵 Song Metadata from client:', req.body);
    
    // Save the metadata exactly as received from the client
    fs.writeFileSync(
        metadataFilePath, 
        JSON.stringify(req.body, null, 2)
    );
    
    console.log(`Metadata saved to ${metadataFilePath}`);
    
    // Run the simpleMintAndRegisterSpg.ts script with full path
    console.log('Running simpleMintAndRegisterSpg.ts...');
    
    // Get the absolute path to the script
    const scriptPath = path.resolve(__dirname, 'simpleMintAndRegisterSpg.ts');
    console.log(`Script full path: ${scriptPath}`);
    
    // Use exec to run the script with ts-node using the full path
    exec(`npx ts-node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error.message}`);
            return res.status(500).json({ error: 'Failed to run registration script' });
        }
        
        if (stderr) {
            console.error(`Script stderr: ${stderr}`);
        }
        
        console.log(`Script output: ${stdout}`);
        res.json({ 
            success: true, 
            message: 'Metadata processed and registration script executed' 
        });
    });
});

// 🔹 Start Express Server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/login`);
    console.log('Please open this URL in your browser to start the Spotify login');
});