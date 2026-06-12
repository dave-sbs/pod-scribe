export type SearchFilters = {
  source?: string;
  topic?: string;
  entityIds?: number[];
  dateFrom?: string;
  dateTo?: string;
};

export type SearchResult = {
  chunkId: number;
  episodeId: number;
  episodeNumber: number | null;
  sourceId?: number | null;
  sourceName?: string | null;
  title: string;
  slug: string;
  url: string;
  date: string;
  topic?: string | null;
  entityNames?: string[];
  startTimestamp: string;
  endTimestamp: string;
  text: string;
  rrfScore: number;
};

export type FindingSearchResult = {
  id: number;
  runId: string;
  desk: string;
  claim: string;
  evidence: unknown;
  citations: unknown;
  confidence: number;
  insightType: string;
  score: number;
};
