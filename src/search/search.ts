import { embedText } from "../ingest/embedder";
import { hybridSearch } from "../db/chunks";
import type { SearchResult } from "../types";
import { config } from "../config";

export async function search(
  query: string,
  topK: number = config.searchTopK
): Promise<SearchResult[]> {
  const embedding = await embedText(query);
  return hybridSearch(query, embedding, topK);
}
