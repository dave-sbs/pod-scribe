import type { SearchFilters, SearchResult } from "@/core/types";
import { searchCorpus } from "@/retrieval/search";

export type SearchCorpusToolInput = {
  query: string;
  filters?: SearchFilters;
  topK?: number;
};

export async function searchCorpusTool(
  input: SearchCorpusToolInput,
): Promise<SearchResult[]> {
  return searchCorpus({
    query: input.query,
    filters: input.filters,
    topK: input.topK,
  });
}
