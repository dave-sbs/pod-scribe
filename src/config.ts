import { openrouter } from "@openrouter/ai-sdk-provider";

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "OPENROUTER_API_KEY",
] as const;

const missing = REQUIRED_ENV_KEYS.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nCopy .env.example to .env and fill in the values.`,
  );
}

function env(name: (typeof REQUIRED_ENV_KEYS)[number]): string {
  return process.env[name]!;
}

export const config = {
  supabaseUrl: env("SUPABASE_URL"),
  supabaseKey: env("SUPABASE_KEY"),
  openrouterApiKey: env("OPENROUTER_API_KEY"),
  embeddingModel: "openai/text-embedding-3-small",
  llm: openrouter("google/gemini-3-flash-preview"),
  embeddingDims: 1536,
  chunkSize: 5,   // segments per chunk (~700 tokens)
  chunkOverlap: 1,   // segments shared with previous chunk
  searchTopK: 30,
};
