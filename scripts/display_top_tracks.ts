import express from 'express';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Add middleware to parse JSON bodies
app.use(express.json());

// Spotify API credentials - make sure these are in your .env file
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// Login route - redirects user to Spotify authorization page
app.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email user-top-read';
  
  res.redirect('https://accounts.spotify.com/authorize?' + 
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI
    })
  );
});

// Callback route - handles the response from Spotify
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  
  if (!code) {
    return res.redirect('/#error=invalid_token');
  }

  try {
    // Exchange code for access token
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      querystring.stringify({
        code: code as string,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        }
      }
    );

    // Get the access token from the response
    const access_token = response.data.access_token;
    
    // Redirect to tracks.html with the token included
    res.redirect(`/tracks.html?token=${access_token}`);
    
  } catch (error) {
    console.error('Error getting access token:', error);
    res.redirect('/#error=invalid_token');
  }
});

// Add the missing endpoint to handle metadata logging from the license button
app.post('/log-metadata', (req, res) => {
  console.log('🎵 Song Metadata:', req.body);
  res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`To start the auth flow, go to: http://localhost:${PORT}/login`);
});