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
