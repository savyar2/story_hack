// agent_discussion.ts
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import { getSongDescription } from './song_to_description';

dotenv.config();

// Create a single OpenAI instance for all calls
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the interface for the agents' output
export interface AgentOutput {
  licensingCost: number;
  royaltiesPercent: number;
  description: string;
}

// Utility function to clean markdown code fences from a string
function cleanMarkdown(text: string): string {
  let cleaned = text.trim();
  // Extract JSON part if wrapped in markdown code fences
  const jsonMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})/i);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").trim();
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3).trim();
    }
  }
  // Extract the first JSON object if there's additional text
  const jsonObjectMatch = cleaned.match(/(\{[\s\S]*?\})/);
  return jsonObjectMatch ? jsonObjectMatch[1].trim() : cleaned;
}

/**
 * Agent A: The best analyzer for artist profiles and songs.
 * It receives the song description, monthly listeners, and optionally Agent B's previous output,
 * then returns a JSON object with licensingCost, royaltiesPercent, and a description.
 */
async function getAgentAOutput(
  songDesc: string,
  monthlyListeners: number,
  previousBOutput?: AgentOutput
): Promise<AgentOutput> {
  let prompt = `You are Agent A, widely considered the best analyzer for artists' profiles and songs.
Based on the song description: "${songDesc}" and given that the song has ${monthlyListeners} monthly listeners,
generate a JSON object with:
  - "licensingCost": licensing cost in dollars (integer),
  - "royaltiesPercent": royalty percentage (integer),
  - "description": a brief explanation of your reasoning.
Respond using markdown code fences containing valid JSON.`;
  
  if (previousBOutput) {
    prompt += ` Consider the previous recommendation from Agent B: ${JSON.stringify(previousBOutput)}.`;
  }
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // Use appropriate model: "gpt-4o-mini" or "gpt-3.5-turbo" if needed
    messages: [
      { role: 'system', content: 'You are Agent A, a music analysis expert.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });
  
  const rawText = response.choices[0].message?.content || "";
  const cleanedText = cleanMarkdown(rawText);
  
  try {
    const output: AgentOutput = JSON.parse(cleanedText);
    return output;
  } catch (err) {
    console.error("Agent A JSON parsing error. Cleaned response was:", cleanedText);
    throw err;
  }
}

/**
 * Agent B: The best royalties negotiator.
 * It receives the song description, monthly listeners, and optionally Agent A's previous output,
 * then returns a JSON object with licensingCost, royaltiesPercent, and a description.
 */
async function getAgentBOutput(
  songDesc: string,
  monthlyListeners: number,
  previousAOutput?: AgentOutput
): Promise<AgentOutput> {
  let prompt = `You are Agent B, widely considered the best royalties negotiator.
Based on the song description: "${songDesc}" and given that the song has ${monthlyListeners} monthly listeners,
generate a JSON object with:
  - "licensingCost": licensing cost in dollars (integer),
  - "royaltiesPercent": royalty percentage (integer),
  - "description": a brief explanation of your reasoning.
Respond using markdown code fences containing valid JSON.`;
  
  if (previousAOutput) {
    prompt += ` Consider the previous recommendation from Agent A: ${JSON.stringify(previousAOutput)}.`;
  }
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are Agent B, a royalties negotiation expert.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });
  
  const rawText = response.choices[0].message?.content || "";
  const cleanedText = cleanMarkdown(rawText);
  
  try {
    const output: AgentOutput = JSON.parse(cleanedText);
    return output;
  } catch (err) {
    console.error("Agent B JSON parsing error. Cleaned response was:", cleanedText);
    throw err;
  }
}

/**
 * Checks whether Agent A's and Agent B's outputs have converged.
 * Convergence is defined as both licensingCost and royaltiesPercent being within a specified threshold.
 */
function hasConverged(a: AgentOutput, b: AgentOutput, threshold: number = 5): boolean {
  return (
    Math.abs(a.licensingCost - b.licensingCost) <= threshold &&
    Math.abs(a.royaltiesPercent - b.royaltiesPercent) <= threshold
  );
}

/**
 * getAgentRecommendation() exchanges outputs between Agent A and Agent B until convergence,
 * and then returns the final agreed licensingCost and royaltiesPercent.
 */
export async function getAgentRecommendation(): Promise<{ licensingCost: number, royaltiesPercent: number }> {
  // First, obtain a song description from the audio file
  const filePath = 'song.mp3';
  console.log("Generating song description...");
  const songDesc = await getSongDescription(filePath);
  console.log("Song Description:\n", songDesc);

  const monthlyListeners = 100000; // hardcoded monthly listener count

  let agentAOutput: AgentOutput | undefined;
  let agentBOutput: AgentOutput | undefined;
  const maxIterations = 5;
  let iteration = 0;

  while (iteration < maxIterations) {
    console.log(`\nIteration ${iteration + 1}:`);
    agentAOutput = await getAgentAOutput(songDesc, monthlyListeners, agentBOutput);
    console.log("Agent A Output:", agentAOutput);

    agentBOutput = await getAgentBOutput(songDesc, monthlyListeners, agentAOutput);
    console.log("Agent B Output:", agentBOutput);

    if (agentAOutput && agentBOutput && hasConverged(agentAOutput, agentBOutput)) {
      console.log("Convergence reached!");
      break;
    }
    iteration++;
  }

  if (!agentAOutput || !agentBOutput) {
    throw new Error("Failed to obtain agent recommendations");
  }

  // Average the two outputs for final recommendation
  const finalLicensingCost = Math.round((agentAOutput.licensingCost + agentBOutput.licensingCost) / 2);
  const finalRoyaltiesPercent = Math.round((agentAOutput.royaltiesPercent + agentBOutput.royaltiesPercent) / 2);

  return {
    licensingCost: finalLicensingCost,
    royaltiesPercent: finalRoyaltiesPercent,
  };
}

// Main entry point wrapped in an IIFE
(async function main() {
  try {
    const result = await getAgentRecommendation();
    console.log("\nFinal agreed values:");
    console.log("Licensing Cost:", result.licensingCost);
    console.log("Royalties Percent:", result.royaltiesPercent);
  } catch (err) {
    console.error("Error in main:", err);
  }
})();
