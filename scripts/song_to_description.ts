import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Define the path to the metadata file
const metadataFilePath = path.join(__dirname, 'metadata.json');

// Function to get the popularity from metadata.json
function getPopularityFromMetadata(): number {
  try {
    if (fs.existsSync(metadataFilePath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
      return metadata.popularity || 0;
    }
  } catch (error) {
    console.error('Error reading metadata file:', error);
  }
  return 0; // Default value if metadata cannot be read
}

const filePath = 'scripts/song.mp3';
/**
 * Create an OpenAI instance using openai@4.x style.
 * Make sure you have OPENAI_API_KEY in your .env file.
 */
// Ensure the API key is available
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY is not set in environment variables or .env file');
  console.error('Current environment variables:', Object.keys(process.env));
}

const openai = new OpenAI({
  apiKey: apiKey,
});

/**
 * Transcribe an audio file using Whisper (audio.transcriptions.create).
 * @param filePath Path to the local .mp3 file.
 * @returns The transcript text from Whisper.
 */
async function getAudioTranscription(filePath: string): Promise<string> {
  // Read the audio file as a stream
  const audioStream = fs.createReadStream(filePath);

  // Use the Whisper model for transcription
  const response = await openai.audio.transcriptions.create({
    file: audioStream,
    model: 'whisper-1',
  });

  return response.text;
}

/**
 * Generate a descriptive analysis of the audio using GPT-4 (chat.completions.create).
 * If the transcript is empty, it assumes the file is instrumental.
 * @param transcript The transcribed text from the audio file.
 * @returns A detailed audio description.
 */
async function generateAudioDescription(transcript: string): Promise<string> {
  // We'll build a "system" + "user" prompt for GPT-4
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a music and audio analysis expert.',
    },
    {
      role: 'user' as const,
      content: `
Given the following transcript from an audio file, provide a detailed description of the audio:
- If there is spoken content, describe the words, tone, and context.
- If the transcript is empty or minimal, assume the audio is instrumental and describe the music style, mood, instruments, and any background sounds.
Transcript: "${transcript}"
Please provide a clear and organized description.
      `,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',       // or "gpt-3.5-turbo" if you don't have GPT-4 access
    messages,
    temperature: 0.7,
  });

  // Safely retrieve the assistant's response
  return completion.choices[0].message?.content ?? 'No description available.';
}

/**
 * Main function to tie it all together.
 */
export async function getSongDescription(filePath: string): Promise<string> {
  try {
    // Check if file exists before proceeding
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist at: ${filePath}`);
      return 'No description available.';
    }
    
    console.log(`Processing audio file at: ${filePath}`);
    const transcript = await getAudioTranscription(filePath);
    const description = await generateAudioDescription(transcript);
    return description;
  } catch (error) {
    console.error('Error in getSongDescription:', error);
    return 'No description available.';
  }
}

// Optional self-test when running directly
if (require.main === module) {
  (async () => {
    // Use __dirname to ensure correct path when run directly
    const songPath = path.join(__dirname, 'song.mp3');
    console.log(`Testing with song at: ${songPath}`);
    const description = await getSongDescription(songPath);
    const popularity = getPopularityFromMetadata();
    console.log('Audio Description:\n', description + `\nPopularity: ${popularity}`);
  })();
}
