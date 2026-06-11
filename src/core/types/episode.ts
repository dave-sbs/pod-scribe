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
