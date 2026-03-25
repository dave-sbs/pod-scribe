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

// --- Conversation ---

export type SourceReference = {
  episodeNumber: number | null;
  title: string;
  timestamp: string;
  url: string;
  text: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceReference[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
};

// --- API ---

export type ChatRequest = {
  conversationId: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  summary?: string;
};

export type SSEEvent =
  | { type: "sources"; data: SourceReference[] }
  | { type: "delta"; data: { content: string } }
  | { type: "done"; data: { content: string; summary?: string } }
  | { type: "error"; data: { message: string } };
