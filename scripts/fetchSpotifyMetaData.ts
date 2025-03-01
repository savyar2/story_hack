import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Configure dotenv with explicit path to .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;


// 🔑 Encode credentials in Base64
const encodedCredentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');


/**
 * Fetches an access token from Spotify
 */
async function getSpotifyAccessToken(): Promise<string> {
    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({ grant_type: 'client_credentials' }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${encodedCredentials}`,
                },
            }
        );
        console.log("✅ Successfully obtained access token!");
        return response.data.access_token;
    } catch (error: any) {
        console.error('❌ Error fetching Spotify access token:', error.response?.data || error.message);
        throw new Error('Failed to get Spotify access token');
    }
}

export interface TrackMetadata {
    name: string;
    artist: string;
    album: string;
    release_date: string;
    duration_ms: number;
    popularity: number;
    spotify_url: string;
}

/**
 * Fetches song metadata from Spotify
 * @param trackId - The Spotify track ID (found in the Spotify URL)
 */
export async function fetchSpotifyTrackMetadata(trackId: string, providedToken?: string): Promise<TrackMetadata | undefined> {
    try {
        // Use provided token or get a new one
        const accessToken = providedToken || await getSpotifyAccessToken();
        
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const track = response.data;
        const metadata: TrackMetadata = {
            name: track.name,
            artist: track.artists.map((artist: any) => artist.name).join(', '),
            album: track.album.name,
            release_date: track.album.release_date,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            spotify_url: track.external_urls.spotify,
        };

        console.log('🎵 Song Metadata:', metadata);
        return metadata;
    } catch (error: any) {
        console.error('❌ Error fetching song metadata:', error.response?.data || error.message);
    }
}

// 🎵 Example: Fetch metadata for "Blinding Lights" by The Weeknd
const trackId = '0VjIjW4GlUZAMYd2vXMi3b'; // Replace with any valid Spotify track ID
//fetchSpotifyTrackMetadata(trackId);
