import express from 'express';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

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
    res.redirect(`/tracks1.html?token=${access_token}`);
    
  } catch (error) {
    console.error('Error getting access token:', error);
    res.redirect('/#error=invalid_token');
  }
});

// Add the missing endpoint to handle metadata logging from the license button
app.post('/log-metadata', (req, res) => {
  console.log('🎵 Song Metadata:', req.body);
  
  // Define path to metadata.json
  const metadataFilePath = path.join(__dirname, 'metadata.json');
  
  // Save the metadata exactly as received from the client
  fs.writeFileSync(
    metadataFilePath, 
    JSON.stringify(req.body, null, 2)
  );
  
  console.log(`Metadata saved to ${metadataFilePath}`);

  // Define path to licenseimages.json
  const licenseImageFilePath = path.join(__dirname, 'licenseimages.json');
  
  // Check if file exists and has content
  let existingData = [];
  if (fs.existsSync(licenseImageFilePath)) {
    try {
      const fileContent = fs.readFileSync(licenseImageFilePath, 'utf8');
      if (fileContent.trim()) {
        const parsed = JSON.parse(fileContent);
        // Handle both array and single object formats
        existingData = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (error) {
      console.error('Error reading existing license data:', error);
      // Continue with empty array if there's an error
    }
  }
  
  // Check if this track is already in the collection (avoid duplicates)
  const isDuplicate = existingData.some(track => 
    track.name === req.body.name && track.artist === req.body.artist
  );
  
  if (!isDuplicate) {
    // Add new entry
    existingData.push(req.body);
    
    // Save the updated collection
    fs.writeFileSync(
      licenseImageFilePath, 
      JSON.stringify(existingData, null, 2)
    );
    
    console.log(`New track added to license images file: ${req.body.name}`);
  } else {
    console.log(`Track already exists in license collection: ${req.body.name}`);
  }
  
  // Run the simpleMintAndRegisterSpg.ts script
  console.log('Running simpleMintAndRegisterSpg.ts...');
  
  // Get the absolute path to the script
  const scriptPath = path.resolve(__dirname, 'simpleMintAndRegisterSpg.ts');
  console.log(`Script full path: ${scriptPath}`);
  
  // Use exec to run the script with ts-node
  exec(`npx ts-node "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ error: 'Failed to run registration script' });
    }
    
    if (stderr) {
      console.error(`Script stderr: ${stderr}`);
    }
    
    console.log(`Script output: ${stdout}`);

    // Extract IPA ID and explorer link from stdout
    let explorer_link = '';
    const match = stdout.match(/View on the explorer: (https:\/\/aeneid\.explorer\.story\.foundation\/ipa\/0x[a-fA-F0-9]+)/);
    if (match && match[1]) {
      explorer_link = match[1];
      
      // Update the track in licenseimages.json with the explorer link
      const licenseImageFilePath = path.join(__dirname, 'licenseimages.json');
      let existingData = [];
      
      if (fs.existsSync(licenseImageFilePath)) {
        try {
          const fileContent = fs.readFileSync(licenseImageFilePath, 'utf8');
          if (fileContent.trim()) {
            const parsed = JSON.parse(fileContent);
            existingData = Array.isArray(parsed) ? parsed : [parsed];
          }
        } catch (error) {
          console.error('Error reading existing license data:', error);
        }
      }
      
      // Find the track and add the explorer link
      for (let i = 0; i < existingData.length; i++) {
        if (existingData[i].name === req.body.name && existingData[i].artist === req.body.artist) {
          existingData[i].explorer_link = explorer_link;
          break;
        }
      }
      
      // Save the updated collection
      fs.writeFileSync(
        licenseImageFilePath, 
        JSON.stringify(existingData, null, 2)
      );
      
      console.log(`Updated licenseimages.json with explorer link: ${explorer_link}`);
    }

    res.json({ 
      success: true, 
      message: 'Metadata processed and registration script executed' 
    });
  });
});

// Endpoint to serve the licenseimages.json file
app.get('/api/licensed-tracks', (req, res) => {
  try {
    const licenseImageFilePath = path.join(__dirname, 'licenseimages.json');
    
    // Check if the file exists
    if (fs.existsSync(licenseImageFilePath)) {
      // Read the file
      const fileContent = fs.readFileSync(licenseImageFilePath, 'utf8');
      
      // Set the content type header
      res.setHeader('Content-Type', 'application/json');
      
      // Send the file content directly
      res.send(fileContent);
      
      console.log('Served license images data:', fileContent);
    } else {
      // If file doesn't exist, return empty array
      console.log('No license images file found at:', licenseImageFilePath);
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading license images file:', error);
    res.status(500).json({ error: 'Failed to read license data' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`To start the auth flow, go to: http://localhost:${PORT}/login`);
});