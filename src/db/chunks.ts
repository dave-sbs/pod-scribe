import { supabase } from "./client";
import type { ChunkWithEmbedding, SearchResult } from "../types";
import { config } from "../config";

export async function upsertChunks(
  episodeId: number,
  chunks: ChunkWithEmbedding[]
): Promise<void> {
  const rows = chunks.map((c) => ({
    episode_id: episodeId,
    chunk_index: c.chunkIndex,
    start_timestamp: c.startTimestamp,
    end_timestamp: c.endTimestamp,
    text: c.text,
    embedding: c.embedding,
  }));

  const { error } = await supabase
    .from("founders_ep_chunks")
    .upsert(rows, { onConflict: "episode_id,chunk_index" });

  if (error) throw new Error(`upsertChunks: ${error.message}`);
}

export async function hybridSearch(
  queryText: string,
  queryEmbedding: number[],
  topK: number = config.searchTopK
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("hybrid_search", {
    query_text: queryText,
    query_embedding: queryEmbedding,
    match_count: topK,
  });

  if (error) throw new Error(`hybridSearch: ${error.message}`);

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
