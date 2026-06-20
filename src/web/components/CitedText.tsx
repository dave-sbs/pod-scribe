import type { SourceReference } from "@/core/types";
import { parseCitations } from "../lib/citations";
import { CitationChip } from "./CitationChip";

type CitedTextProps = {
  text: string;
  sources: SourceReference[];
};

/**
 * Renders inline `[Ep. #N "Title" @ ts]` citations as hover chips, matching the
 * quick-search rendering. Used for compact dossier fields outside the main
 * markdown message.
 */
export function CitedText({ text, sources }: CitedTextProps) {
  const segments = parseCitations(text);

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.content}</span>
        ) : (
          <CitationChip
            key={i}
            index={seg.index}
            episodeNumber={seg.episodeNumber}
            title={seg.title}
            timestamp={seg.timestamp}
            sources={sources}
          />
        ),
      )}
    </>
  );
}
