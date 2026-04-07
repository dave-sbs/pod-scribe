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

// Matches any bracket group containing "Ep. #"
const BRACKET_REGEX = /\[([^\]]*?Ep\.\s*#[^\]]+)\]/g;

// Parses a single citation entry (with or without title, with optional time range)
const SINGLE_CITE_REGEX =
  /Ep\.\s*#(\d+)\s*(?:"([^"]*)"\s*)?@\s*([\d:]+(?:[–-][\d:]+)?)/;

export function parseCitations(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let citationIndex = 0;

  for (const match of text.matchAll(BRACKET_REGEX)) {
    const matchStart = match.index;
    // Split by semicolons to handle multi-citation brackets
    const parts = match[1].split(/;\s*/);
    const parsed: CitationSegment[] = [];

    for (const part of parts) {
      const m = part.trim().match(SINGLE_CITE_REGEX);
      if (m) {
        parsed.push({
          type: "citation",
          episodeNumber: parseInt(m[1], 10),
          title: m[2] ?? `Episode #${m[1]}`,
          timestamp: m[3].split(/[–-]/)[0], // use start of range
          index: citationIndex++,
        });
      }
    }

    // Only replace if we successfully parsed at least one citation
    if (parsed.length > 0) {
      if (matchStart > lastIndex) {
        segments.push({
          type: "text",
          content: text.slice(lastIndex, matchStart),
        });
      }
      segments.push(...parsed);
      lastIndex = matchStart + match[0].length;
    }
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
