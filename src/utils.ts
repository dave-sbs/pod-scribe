/**
 * Utility functions for embedding texts using OpenRouter API.
 */

import axios from "axios";
import { config } from "./config";

const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await axios.post<{
    data: Array<{ embedding: number[] }>;
  }>(
    OPENROUTER_EMBEDDINGS_URL,
    { model: config.embeddingModel, input: texts },
    {
      headers: {
        Authorization: `Bearer ${config.openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60_000,
    },
  );
  return response.data.data.map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const results = await embedTexts([text]);
  return results[0];
}
