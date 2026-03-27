import { supabase } from "./client";
import type { ChunkWithEmbedding } from "../../types";

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
