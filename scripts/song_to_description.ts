import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const filePath = 'song.mp3';
/**
 * Create an OpenAI instance using openai@4.x style.
 * Make sure you have OPENAI_API_KEY in your .env file.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
      const transcript = await getAudioTranscription(filePath);
      const description = await generateAudioDescription(transcript);
      return description;
    } catch (error) {
      console.error('Error:', error);
      return 'No description available.';
    }
  }
  
  // Call this function in your main logic
  (async () => {
    const filePath = 'song.mp3';
    const description = await getSongDescription(filePath);
    console.log('Audio Description:\n', description + '\nMonthly Listeners: 100000');
  })();
