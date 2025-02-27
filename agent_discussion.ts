import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getSongDescription } from './song_to_description';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AgentOutput {
  licensingCost: number;
  royaltiesPercent: number;
  description: string;
}

const songDesc = "this song is great, monthly listeners = 100000";

/**
 * Utility function to clean markdown code fences from a string.
 * If the response is wrapped in ``` or ```json ... ```, remove those markers.
 */
function cleanMarkdown(text: string): string {
  let cleaned = text.trim();
  // First, try to extract just the JSON part if there are multiple code blocks
  const jsonMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})/i);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  } else if (cleaned.startsWith("```")) {
    // Fallback to original cleaning logic
    cleaned = cleaned.replace(/^```(?:json)?/i, "").trim();
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3).trim();
    }
  }
  
  // Extract just the first JSON object if there's additional text
  const jsonObjectMatch = cleaned.match(/(\{[\s\S]*?\})/);
  return jsonObjectMatch ? jsonObjectMatch[1].trim() : cleaned;
}

/**
 * Agent A: The best analyzer for artist profiles and songs.
 * It receives the song description (and optionally Agent B's previous output),
 * then returns a JSON object with licensingCost and royaltiesPercent plus a description.
 */
async function getAgentAOutput(previousBOutput?: AgentOutput): Promise<AgentOutput> {
  let prompt = `You are Agent A, widely considered the best analyzer when it comes to artists' profiles and songs. Based on the song description: "${songDesc}",`;
  if (previousBOutput) {
    prompt += ` and considering the previous recommendation from Agent B: ${JSON.stringify(previousBOutput)},`;
  }
  prompt += ` generate a JSON object with two keys: "licensingCost" (licensing cost in dollars) and "royaltiesPercent" (royalty percentage), and also include a brief description of your reasoning. Respond using markdown code fences containing valid JSON.`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
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
 * It receives the song description (and optionally Agent A's previous output),
 * then returns a JSON object with licensingCost and royaltiesPercent plus a description.
 */
async function getAgentBOutput(previousAOutput?: AgentOutput): Promise<AgentOutput> {
  let prompt = `You are Agent B, widely considered the best royalties negotiator. Based on the song description: "${songDesc}",`;
  if (previousAOutput) {
    prompt += ` and considering the previous recommendation from Agent A: ${JSON.stringify(previousAOutput)},`;
  }
  prompt += ` generate a JSON object with two keys: "licensingCost" (licensing cost in dollars) and "royaltiesPercent" (royalty percentage), and also include a brief description of your reasoning. Respond using markdown code fences containing valid JSON.`;
  
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
 * Convergence is defined as both licensingCost and royaltiesPercent being within a threshold.
 */
function hasConverged(a: AgentOutput, b: AgentOutput, threshold: number = 5): boolean {
  return Math.abs(a.licensingCost - b.licensingCost) <= threshold &&
         Math.abs(a.royaltiesPercent - b.royaltiesPercent) <= threshold;
}

/**
 * Main function that simulates the negotiation between Agent A and Agent B.
 * They exchange JSON outputs until convergence (or until max iterations is reached),
 * and then the final agreed values are averaged.
 */
async function main() {
  const result = await getAgentRecommendation();
  console.log("Final agreed values:");
  console.log("Licensing Cost:", result.licensingCost);
  console.log("Royalties Percent:", result.royaltiesPercent);
}

export async function getAgentRecommendation(): Promise<{ licensingCost: number, royaltiesPercent: number }> {
  let agentAOutput: AgentOutput | undefined;
  let agentBOutput: AgentOutput | undefined;

  const maxIterations = 5;
  let iteration = 0;

  while (iteration < maxIterations) {
    agentAOutput = await getAgentAOutput(agentBOutput);
    agentBOutput = await getAgentBOutput(agentAOutput);

    if (agentAOutput && agentBOutput && hasConverged(agentAOutput, agentBOutput)) {
      break;
    }
    iteration++;
  }

  if (!agentAOutput || !agentBOutput) {
    throw new Error("Failed to get agent recommendations");
  }

  return {
    licensingCost: Math.round((agentAOutput.licensingCost + agentBOutput.licensingCost) / 2),
    royaltiesPercent: Math.round((agentAOutput.royaltiesPercent + agentBOutput.royaltiesPercent) / 2)
  };
}

main().catch(err => console.error("Error in main:", err));
