import type { FindingCitation, SearchResult, SourceReference } from "@/core/types";

export type ResolvedSource = {
  sourceId: string;
  chunkId: number;
  episodeNumber: number | null;
  title: string;
  timestamp: string;
  url: string;
  text: string;
  slug: string;
};

function truncateQuote(text: string): string {
  return text.length > 280 ? `${text.slice(0, 277)}...` : text;
}

/**
 * Assigns stable ids (S1, S2, ...) to retrieved chunks and is the single
 * source of truth for turning agent-emitted source-id references into
 * human-facing citations. Models only ever emit ids; this class deterministically
 * resolves them, so citations can't be fabricated across handoffs.
 */
export class SourceRegistry {
  private byChunk = new Map<number, ResolvedSource>();
  private byId = new Map<string, ResolvedSource>();
  private order: ResolvedSource[] = [];
  private counter = 0;

  add(result: SearchResult): ResolvedSource {
    const existing = this.byChunk.get(result.chunkId);
    if (existing) return existing;

    this.counter += 1;
    const resolved: ResolvedSource = {
      sourceId: `S${this.counter}`,
      chunkId: result.chunkId,
      episodeNumber: result.episodeNumber,
      title: result.title,
      timestamp: result.startTimestamp,
      url: result.url,
      text: result.text,
      slug: result.slug,
    };
    this.byChunk.set(result.chunkId, resolved);
    this.byId.set(resolved.sourceId, resolved);
    this.order.push(resolved);
    return resolved;
  }

  addMany(results: SearchResult[]): ResolvedSource[] {
    return results.map((r) => this.add(r));
  }

  resolve(id: string): ResolvedSource | undefined {
    return this.byId.get(id.trim());
  }

  has(id: string): boolean {
    return this.byId.has(id.trim());
  }

  /** Keep only ids that exist in the registry, de-duplicated, order-preserving. */
  validateRefs(ids: string[]): string[] {
    const seen = new Set<string>();
    const valid: string[] = [];
    for (const raw of ids) {
      const id = raw.trim();
      if (this.byId.has(id) && !seen.has(id)) {
        seen.add(id);
        valid.push(id);
      }
    }
    return valid;
  }

  list(): ResolvedSource[] {
    return [...this.order];
  }

  /** A compact, id-labeled block of evidence to drop into an analyst prompt. */
  formatForPrompt(sources: ResolvedSource[]): string {
    return sources
      .map((s) => {
        const ep = s.episodeNumber != null ? `Ep. #${s.episodeNumber} ` : "";
        return `[${s.sourceId}] ${ep}"${s.title}" @ ${s.timestamp}\n${s.text}`;
      })
      .join("\n\n");
  }

  /** Canonical inline citation string compatible with the web CitationChip parser. */
  renderCitation(id: string): string {
    const s = this.byId.get(id.trim());
    if (!s) return "";
    if (s.episodeNumber == null) {
      return `["${s.title}" @ ${s.timestamp}]`;
    }
    return `[Ep. #${s.episodeNumber} "${s.title}" @ ${s.timestamp}]`;
  }

  /** Render a group of ids as a single combined citation bracket. */
  renderCitations(ids: string[]): string {
    const parts = this.validateRefs(ids)
      .map((id) => {
        const s = this.byId.get(id);
        if (!s) return "";
        const ep = s.episodeNumber != null ? `Ep. #${s.episodeNumber} ` : "";
        return `${ep}"${s.title}" @ ${s.timestamp}`;
      })
      .filter(Boolean);
    return parts.length ? `[${parts.join("; ")}]` : "";
  }

  toFindingCitations(ids: string[]): FindingCitation[] {
    return this.validateRefs(ids).map((id) => {
      const s = this.byId.get(id)!;
      return {
        episodeNumber: s.episodeNumber,
        title: s.title,
        timestamp: s.timestamp,
        url: s.url,
        quote: truncateQuote(s.text),
      };
    });
  }

  /** SourceReference list for the chat message so CitationChip can resolve hovers. */
  toSourceReferences(ids?: string[]): SourceReference[] {
    const sources = ids ? this.validateRefs(ids).map((id) => this.byId.get(id)!) : this.order;
    return sources.map((s) => ({
      episodeNumber: s.episodeNumber,
      title: s.title,
      timestamp: s.timestamp,
      url: s.url,
      text: s.text,
    }));
  }
}

// Matches [S1] or [S1, S3] or [S1; S3] inline markers in synthesized markdown.
const SOURCE_MARKER_REGEX = /\[((?:\s*S\d+\s*[,;]?)+)\]/g;

/**
 * Rewrites every [S#]/[S#, S#] marker in a markdown body into the canonical
 * `[Ep. #N "Title" @ ts]` citation format that the web parser understands.
 * Unknown ids are dropped; markers with no valid ids are removed entirely.
 */
export function rewriteSourceMarkers(
  markdown: string,
  registry: SourceRegistry,
): string {
  return markdown.replace(SOURCE_MARKER_REGEX, (_full, inner: string) => {
    const ids = inner.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    return registry.renderCitations(ids);
  });
}

/** Collect the source ids referenced by [S#] markers in a markdown body. */
export function extractMarkerIds(markdown: string): string[] {
  const ids: string[] = [];
  for (const match of markdown.matchAll(SOURCE_MARKER_REGEX)) {
    for (const part of match[1].split(/[,;]/)) {
      const id = part.trim();
      if (id) ids.push(id);
    }
  }
  return ids;
}
