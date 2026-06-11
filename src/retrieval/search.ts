import { embedText } from "@/core/embeddings";
import type { SearchResult } from "@/core/types";
import { config } from "@/core/config";
import { supabase } from "@/db/client";

async function hybridSearch(
  queryText: string,
  queryEmbedding: number[],
  topK: number = config.searchTopK,
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("hybrid_search", {
    query_text: queryText,
    query_embedding: queryEmbedding,
    match_count: topK,
  });

  if (error) {
    const isConnectError =
      error.message.toLowerCase().includes("unable to connect") ||
      error.message.toLowerCase().includes("fetch failed") ||
      error.message.toLowerCase().includes("econnrefused");

    if (isConnectError) {
      throw new Error(
        `Database is unreachable. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for your remote project, and confirm network access. Original error: ${error.message}`,
      );
    }

    throw new Error(`Search failed: ${error.message}`);
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    chunkId: r.chunk_id as number,
    episodeId: r.episode_id as number,
    episodeNumber: r.episode_number as number | null,
    title: r.title as string,
    slug: r.slug as string,
    url: r.url as string,
    date: r.date as string,
    startTimestamp: r.start_timestamp as string,
    endTimestamp: r.end_timestamp as string,
    text: r.text as string,
    rrfScore: r.rrf_score as number,
  }));
}

export async function search(
  query: string,
  topK: number = config.searchTopK,
): Promise<SearchResult[]> {
  const embedding = await embedText(query);
  return hybridSearch(query, embedding, topK);
}
