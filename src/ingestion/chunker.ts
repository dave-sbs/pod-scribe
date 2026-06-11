import type { TranscriptSegment, Chunk } from "@/core/types";
import { config } from "@/core/config";

export function chunkTranscript(
  slug: string,
  segments: TranscriptSegment[],
): Chunk[] {
  const chunks: Chunk[] = [];
  const step = config.chunkSize - config.chunkOverlap;

  for (let i = 0; i < segments.length; i += step) {
    const window = segments.slice(i, i + config.chunkSize);
    if (window.length === 0) break;

    chunks.push({
      episodeSlug: slug,
      chunkIndex: chunks.length,
      startTimestamp: window[0].timestamp,
      endTimestamp: window[window.length - 1].timestamp,
      text: window.map((s) => s.text).join(" "),
      segmentIndices: window.map((_, j) => i + j),
    });
  }

  return chunks;
}
