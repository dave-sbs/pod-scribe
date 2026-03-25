function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseKey: requireEnv("SUPABASE_KEY"),
  openrouterApiKey: requireEnv("OPENROUTER_API_KEY"),
  embeddingModel: "openai/text-embedding-3-small",
  llmModel: "google/gemini-3-flash-preview",
  embeddingDims: 1536,
  chunkSize: 5,   // segments per chunk (~700 tokens)
  chunkOverlap: 1,   // segments shared with previous chunk
  searchTopK: 30,
};
