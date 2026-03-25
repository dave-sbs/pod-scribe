import type { SearchResult } from "../types";

export function formatContext(results: SearchResult[]): string {
  // Group by episode, preserving RRF rank order for episode ordering
  const episodeMap = new Map<string, SearchResult[]>();
  for (const r of results) {
    if (!episodeMap.has(r.slug)) episodeMap.set(r.slug, []);
    episodeMap.get(r.slug)!.push(r);
  }

  // Sort chunks within each episode chronologically
  for (const chunks of episodeMap.values()) {
    chunks.sort((a, b) => a.startTimestamp.localeCompare(b.startTimestamp));
  }

  const sections: string[] = [];
  for (const chunks of episodeMap.values()) {
    const ep = chunks[0];
    const header = `[Ep. #${ep.episodeNumber ?? "?"} "${ep.title}" — ${ep.date}]`;
    const body = chunks
      .map((c) => `  [@ ${c.startTimestamp}–${c.endTimestamp}] ${c.text}`)
      .join("\n");
    sections.push(`${header}\n${body}`);
  }

  return sections.join("\n\n");
}
