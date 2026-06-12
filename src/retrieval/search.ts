import { embedText } from "@/core/embeddings";
import type { FindingSearchResult, SearchFilters, SearchResult } from "@/core/types";
import { config } from "@/core/config";
import { supabase } from "@/db/client";

type SearchCorpusParams = {
  query: string;
  filters?: SearchFilters;
  topK?: number;
};

async function searchCorpusByEmbedding(
  query: string,
  embedding: number[],
  filters: SearchFilters | undefined,
  topK: number,
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("search_corpus", {
    query_text: query,
    query_embedding: embedding,
    match_count: topK,
    rrf_k: config.deep.rrfK,
    filter_source: filters?.source ?? null,
    filter_topic: filters?.topic ?? null,
    filter_entity_ids: filters?.entityIds?.length ? filters.entityIds : null,
    date_from: filters?.dateFrom ?? null,
    date_to: filters?.dateTo ?? null,
  });

  if (!error) {
    return (data ?? []).map((r: Record<string, unknown>) => ({
      chunkId: r.chunk_id as number,
      episodeId: r.episode_id as number,
      sourceId: (r.source_id as number | undefined) ?? null,
      sourceName: (r.source_name as string | undefined) ?? null,
      episodeNumber: r.episode_number as number | null,
      title: r.title as string,
      slug: r.slug as string,
      url: r.url as string,
      date: r.date as string,
      topic: (r.topic as string | undefined) ?? null,
      entityNames: (r.entity_names as string[] | undefined) ?? [],
      startTimestamp: r.start_timestamp as string,
      endTimestamp: r.end_timestamp as string,
      text: r.text as string,
      rrfScore: r.rrf_score as number,
    }));
  }

  // Backward compatibility for environments that still have only legacy RPC.
  const { data: legacyData, error: legacyError } = await supabase.rpc("hybrid_search", {
    query_text: query,
    query_embedding: embedding,
    match_count: topK,
  });

  if (legacyError) {
    const mergedMessage = `${error.message}; fallback failed: ${legacyError.message}`;
    throw new Error(`Search failed: ${mergedMessage}`);
  }

  return (legacyData ?? []).map((r: Record<string, unknown>) => ({
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

export async function searchCorpus({
  query,
  filters,
  topK = config.searchTopK,
}: SearchCorpusParams): Promise<SearchResult[]> {
  const embedding = await embedText(query);
  return searchCorpusByEmbedding(query, embedding, filters, topK);
}

export async function searchFindings(
  query: string,
  options?: { brandEntityId?: number; topK?: number; minConfidence?: number },
): Promise<FindingSearchResult[]> {
  const embedding = await embedText(query);
  const { data, error } = await supabase.rpc("search_findings", {
    query_text: query,
    query_embedding: embedding,
    match_count: options?.topK ?? config.deep.findingsTopK,
    min_confidence: options?.minConfidence ?? 0.5,
    filter_brand_entity_id: options?.brandEntityId ?? null,
  });

  if (error) {
    // Findings are optional. If the RPC doesn't exist yet, silently skip.
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    runId: r.run_id as string,
    desk: r.desk as string,
    claim: r.claim_text as string,
    evidence: r.evidence,
    citations: r.citations,
    confidence: r.confidence as number,
    insightType: r.insight_type as string,
    score: r.score as number,
  }));
}

export async function search(
  query: string,
  topK: number = config.searchTopK,
): Promise<SearchResult[]> {
  return searchCorpus({ query, topK });
}
