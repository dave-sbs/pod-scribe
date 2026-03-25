import type { SourceReference } from "../../types";

export type TextSegment = { type: "text"; content: string };
export type CitationSegment = {
  type: "citation";
  episodeNumber: number;
  title: string;
  timestamp: string;
  index: number;
};
export type Segment = TextSegment | CitationSegment;

const CITATION_REGEX = /\[Ep\.\s*#(\d+)\s*"([^"]+)"\s*@\s*([\d:]+)\]/g;

export function parseCitations(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let citationIndex = 0;

  for (const match of text.matchAll(CITATION_REGEX)) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, matchStart) });
    }

    segments.push({
      type: "citation",
      episodeNumber: parseInt(match[1], 10),
      title: match[2],
      timestamp: match[3],
      index: citationIndex++,
    });

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

export function matchCitationToSource(
  episodeNumber: number,
  timestamp: string,
  sources: SourceReference[]
): SourceReference | undefined {
  // Exact episode match, then closest timestamp
  const episodeSources = sources.filter(
    (s) => s.episodeNumber === episodeNumber
  );
  if (episodeSources.length === 0) return undefined;
  if (episodeSources.length === 1) return episodeSources[0];

  // Find closest timestamp
  const targetSeconds = timestampToSeconds(timestamp);
  return episodeSources.reduce((closest, source) => {
    const closestDiff = Math.abs(
      timestampToSeconds(closest.timestamp) - targetSeconds
    );
    const sourceDiff = Math.abs(
      timestampToSeconds(source.timestamp) - targetSeconds
    );
    return sourceDiff < closestDiff ? source : closest;
  });
}

function timestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}
