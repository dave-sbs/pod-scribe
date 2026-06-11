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
