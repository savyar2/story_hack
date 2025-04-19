import express, { RequestHandler, Request, Response } from 'express';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import React from 'react';
import { renderToString } from 'react-dom/server';
import FrontEnd from '../public/FrontEnd';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3000;

// Configure middleware and static file serving
const publicPath = path.join(__dirname, '../public');
console.log('[DEBUG] Serving static files from:', publicPath);
app.use(express.static(publicPath));
app.use(express.json());

// 🔑 Spotify API Credentials
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:3000/callback'; // Must match your Spotify app settings

// Store token information in memory
let tokenInfo = {
  access_token: null as string | null,
  refresh_token: null as string | null,
  expires_at: 0,
};

console.log('[DEBUG] Initial tokenInfo:', tokenInfo);

// Path to metadata file
const metadataFilePath = path.join(__dirname, 'metadata.json');
console.log('[DEBUG] metadataFilePath =', metadataFilePath);

// 🔹 /login: Redirect user to Spotify OAuth
app.get('/login', (req, res) => {
  console.log('[DEBUG] GET /login triggered');
  const scope = 'user-read-private user-read-email user-top-read';
  const authURL = `https://accounts.spotify.com/authorize?${querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
  })}`;
  console.log('[DEBUG] Redirecting to Spotify login URL:', authURL);
  res.redirect(authURL);
});

// 🔹 /callback: Handle Spotify OAuth callback and exchange code for tokens
app.get(
  '/callback',
  (async (req, res) => {
    console.log('[DEBUG] GET /callback triggered');
    const code = req.query.code as string;
    console.log('[DEBUG] Received code:', code);

    try {
      console.log('[DEBUG] Exchanging code for access token...');
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        querystring.stringify({
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
          },
        }
      );

      console.log('[DEBUG] Token response from Spotify:', response.data);
      tokenInfo.access_token = response.data.access_token;
      tokenInfo.refresh_token = response.data.refresh_token;
      tokenInfo.expires_at = Date.now() + response.data.expires_in * 1000;
      console.log('[DEBUG] Updated tokenInfo:', tokenInfo);

      // Redirect to dashboard (SSR page) without passing token in URL
      console.log('[DEBUG] Redirecting to /dashboard now...');
      res.redirect('/dashboard');
    } catch (error: any) {
      console.error('[DEBUG] Error getting access token:', error.response?.data || error.message);
      res.send('Error logging into Spotify.');
    }
  }) as RequestHandler
);

// 🔹 /refresh-token: Refresh the access token using the refresh token
app.get(
  '/refresh-token',
  (async (_, res) => {
    console.log('[DEBUG] GET /refresh-token triggered');
    if (!tokenInfo.refresh_token) {
      console.log('[DEBUG] No refresh token available');
      return res.status(401).json({ error: 'No refresh token available' });
    }
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: tokenInfo.refresh_token,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
          },
        }
      );
      console.log('[DEBUG] Refresh token response:', response.data);
      tokenInfo.access_token = response.data.access_token;
      tokenInfo.expires_at = Date.now() + response.data.expires_in * 1000;
      if (response.data.refresh_token) {
        tokenInfo.refresh_token = response.data.refresh_token;
      }
      console.log('[DEBUG] Updated tokenInfo after refresh:', tokenInfo);
      res.json({ access_token: response.data.access_token });
    } catch (error: any) {
      console.error('[DEBUG] Error refreshing token:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }) as RequestHandler
);

// 🔹 /api/token-status: Let client check if a valid token exists
app.get(
  '/api/token-status',
  (async (_, res) => {
    console.log('[DEBUG] GET /api/token-status triggered');
    const now = Date.now();
    const hasAccessToken = tokenInfo.access_token !== null;
    const isExpired = now > tokenInfo.expires_at;
    console.log('[DEBUG] hasAccessToken:', hasAccessToken, 'isExpired:', isExpired);
    if (!hasAccessToken || isExpired) {
      return res.status(401).json({ isValid: false });
    }
    const expiresIn = Math.floor((tokenInfo.expires_at - now) / 1000);
    res.json({ isValid: true, access_token: tokenInfo.access_token, expires_in: expiresIn });
  }) as RequestHandler
);

// 🔹 /fetch-metadata: Fetch track metadata using a helper module
app.get(
  '/fetch-metadata',
  (async (req, res) => {
    console.log('[DEBUG] GET /fetch-metadata triggered');
    const trackId = req.query.trackId as string;
    const token = req.query.token as string;
    console.log('[DEBUG] trackId:', trackId, 'token:', token);
    if (!trackId || !token) {
      return res.status(400).send('Missing trackId or token');
    }
    try {
      const { fetchSpotifyTrackMetadata } = await import('./fetchSpotifyMetaData');
      const metadata = await fetchSpotifyTrackMetadata(trackId, token);
      console.log('[DEBUG] Received metadata:', metadata);
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
      console.error('[DEBUG] Error fetching metadata:', error.message);
      res.status(500).send('Error fetching track metadata');
    }
  }) as RequestHandler
);

// 🔹 /log-metadata: Save track metadata and execute a script
app.post('/log-metadata', express.json(), (req, res) => {
  console.log('[DEBUG] POST /log-metadata triggered');
  console.log('🎵 Song Metadata from client:', req.body);
  fs.writeFileSync(metadataFilePath, JSON.stringify(req.body, null, 2));
  console.log('[DEBUG] Metadata saved to', metadataFilePath);
  const scriptPath = path.resolve(__dirname, 'simpleMintAndRegisterSpg.ts');
  console.log('[DEBUG] Running script at:', scriptPath);
  exec(`npx ts-node "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('[DEBUG] Error executing script:', error.message);
      return res.status(500).json({ error: 'Failed to run registration script' });
    }
    if (stderr) {
      console.error('[DEBUG] Script stderr:', stderr);
    }
    console.log('[DEBUG] Script output:', stdout);
    res.json({ success: true, message: 'Metadata processed and script executed' });
  });
});

// 🔹 /dashboard: Render the SSR React app and add hydration scripts
app.get('/dashboard', (req, res) => {
  console.log('[DEBUG] GET /dashboard triggered');
  const category = (req.query.category as string) || 'spotify';
  console.log('[DEBUG] category =', category);
  const now = Date.now();
  const isAuthenticated = !!(tokenInfo.access_token && now < tokenInfo.expires_at);
  console.log('[DEBUG] isAuthenticated =', isAuthenticated);

  const FrontEndWithProps = () => {
    console.log('[DEBUG] Rendering FrontEnd with props:', { initialCategory: category, initialIsAuthenticated: isAuthenticated });
    const Component = FrontEnd as any;
    return React.createElement(Component, {
      initialCategory: category,
      initialIsAuthenticated: isAuthenticated,
    });
  };

  const reactApp = renderToString(React.createElement(FrontEndWithProps));
  console.log('[DEBUG] SSR output length:', reactApp.length);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiMe Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .bg-background { background-color: white; }
    .bg-primary { background-color: #0070f3; }
    .text-primary-foreground { color: white; }
    .bg-muted\\/50 { background-color: rgba(243, 244, 246, 0.5); }
    .text-muted-foreground { color: #6b7280; }
    .bg-secondary { background-color: #f3f4f6; }
    .bg-accent { background-color: #f9fafb; }
    .border-input { border-color: #e5e7eb; }
  </style>
  <script>
    window.INITIAL_STATE = {
      isAuthenticated: ${isAuthenticated}
    };
  </script>
</head>
<body>
  <div id="root">${reactApp}</div>
  <script src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>
  <script>
    console.log('[DEBUG] Hydrating React component...');
    ReactDOM.hydrate(
      React.createElement(window.LimeDashboard, {
        initialCategory: "spotify",
        initialIsAuthenticated: window.INITIAL_STATE ? window.INITIAL_STATE.isAuthenticated : false
      }),
      document.getElementById('root')
    );
  </script>
</body>
</html>`;

  console.log('[DEBUG] Sending HTML response to client');
  res.send(html);
});

// 🔹 /api/tracks: Fetch top tracks (or recommendations if none found)
app.get(
  '/api/tracks',
  (async (_: Request, res: Response) => {
    console.log('[DEBUG] GET /api/tracks triggered');
    try {
      if (!tokenInfo.access_token || Date.now() > tokenInfo.expires_at) {
        console.log('[DEBUG] No valid token in /api/tracks');
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      console.log('[DEBUG] Fetching top tracks from Spotify (medium_term, limit 20)...');
      let tracks: any[] = [];
      try {
        const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
          headers: { Authorization: `Bearer ${tokenInfo.access_token}` },
          params: { limit: 20, time_range: 'medium_term' },
        });
        if (topTracksResponse.data?.items?.length > 0) {
          console.log('[DEBUG] Fetched top tracks:', topTracksResponse.data.items.length);
          tracks = topTracksResponse.data.items;
        } else {
          console.log('[DEBUG] No top tracks found');
        }
      } catch (e) {
        console.log('[DEBUG] Error fetching top tracks, trying recommendations...');
      }
      if (tracks.length === 0) {
        console.log('[DEBUG] Fetching recommended tracks (limit 20)...');
        try {
          const recommendationsResponse = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { Authorization: `Bearer ${tokenInfo.access_token}` },
            params: { seed_genres: 'pop,rock,hip-hop', limit: 20 },
          });
          if (recommendationsResponse.data?.tracks) {
            console.log('[DEBUG] Fetched recommended tracks:', recommendationsResponse.data.tracks.length);
            tracks = recommendationsResponse.data.tracks;
          } else {
            console.log('[DEBUG] No recommended tracks found');
          }
        } catch (err) {
          console.log('[DEBUG] Error fetching recommendations:', err);
        }
      }
      if (tracks.length > 0) {
        console.log(`[DEBUG] Returning ${tracks.length} tracks`);
        res.json({ items: tracks });
      } else {
        console.log('[DEBUG] No tracks found, returning empty array');
        res.json({ items: [] });
      }
    } catch (error: any) {
      console.error('[DEBUG] Error in /api/tracks:', error.message);
      res.status(500).json({ error: 'Failed to fetch tracks' });
    }
  }) as RequestHandler
);

// 🔹 /api/top-tracks: Dedicated endpoint for top tracks only
app.get(
  '/api/top-tracks',
  (async (_: Request, res: Response) => {
    console.log('[DEBUG] GET /api/top-tracks triggered');
    try {
      if (!tokenInfo.access_token || Date.now() > tokenInfo.expires_at) {
        console.log('[DEBUG] No valid token in /api/top-tracks');
        return res.status(401).json({ error: 'Please log in with Spotify first' });
      }
      console.log('[DEBUG] Fetching top tracks from Spotify (medium_term, limit 20) for /api/top-tracks...');
      const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers: { Authorization: `Bearer ${tokenInfo.access_token}` },
        params: { limit: 20, time_range: 'medium_term' },
      });
      if (response.data && response.data.items) {
        console.log('[DEBUG] Fetched top tracks:', response.data.items.length);
        res.json({ items: response.data.items });
      } else {
        console.log('[DEBUG] No items in top tracks response, returning empty array');
        res.json({ items: [] });
      }
    } catch (error: any) {
      console.error('[DEBUG] Error in /api/top-tracks:', error.message);
      res.status(500).json({ error: 'Failed to fetch your top tracks' });
    }
  }) as RequestHandler
);

app.listen(PORT, () => {
  console.log(`\n🚀 [DEBUG] Server running at http://localhost:${PORT}/login`);
  console.log('[DEBUG] Please open this URL in your browser to start the Spotify login');
});
