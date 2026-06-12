import { openrouter } from "@openrouter/ai-sdk-provider";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;

const missing: string[] = [];
if (!supabaseUrl) missing.push("SUPABASE_URL");
if (!supabaseKey) missing.push("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)");
if (!openrouterApiKey) missing.push("OPENROUTER_API_KEY");

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nCopy .env.example to .env and fill in the values.`,
  );
}

const resolvedSupabaseUrl = supabaseUrl!;
const resolvedSupabaseKey = supabaseKey!;
const resolvedOpenrouterApiKey = openrouterApiKey!;

const fastModelName = "google/gemini-3-flash-preview";
const reasoningModelName =
  process.env.OPENROUTER_REASONING_MODEL ?? "openai/gpt-5.5";

export const config = {
  supabaseUrl: resolvedSupabaseUrl,
  supabaseKey: resolvedSupabaseKey,
  openrouterApiKey: resolvedOpenrouterApiKey,
  embeddingModel: "openai/text-embedding-3-small",
  models: {
    fast: openrouter(fastModelName),
    reasoning: openrouter(reasoningModelName),
  },
  // Backward-compatible alias while call sites migrate.
  llm: openrouter(fastModelName),
  modelNames: {
    fast: fastModelName,
    reasoning: reasoningModelName,
  },
  embeddingDims: 1536,
  chunkSize: 5, // segments per chunk (~700 tokens)
  chunkOverlap: 1, // segments shared with previous chunk
  searchTopK: 30,
  deep: {
    maxDesks: 7,
    subqueriesPerDesk: 3,
    workerConcurrency: 3,
    rrfK: 60,
    findingsTopK: 8,
  },
};
