// --- Scraped episode data ---

export type TranscriptSegment = {
  timestamp: string;
  text: string;
};

export type EpisodeMetadata = {
  episodeNumber: number | null;
  title: string;
  slug: string;
  url: string;
  date: string;
  category: string;
};

export type Episode = {
  metadata: EpisodeMetadata;
  transcript: TranscriptSegment[];
  scrapedAt: string;
};

// --- Chunked transcript ---

export type Chunk = {
  episodeSlug: string;
  chunkIndex: number;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
  segmentIndices: number[];
};

export type ChunkWithEmbedding = Chunk & {
  embedding: number[];
};

// --- Search ---

export type SearchResult = {
  chunkId: number;
  episodeId: number;
  episodeNumber: number | null;
  title: string;
  slug: string;
  url: string;
  date: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
  rrfScore: number;
};
