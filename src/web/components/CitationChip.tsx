import { useState } from "react";
import type { SourceReference } from "../../types";
import { matchCitationToSource } from "../lib/citations";

type CitationChipProps = {
  episodeNumber: number;
  title: string;
  timestamp: string;
  sources: SourceReference[];
  onOpenPanel: (source: SourceReference) => void;
};

export function CitationChip({
  episodeNumber,
  title,
  timestamp,
  sources,
  onOpenPanel,
}: CitationChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const source = matchCitationToSource(episodeNumber, timestamp, sources);

  return (
    <span className="relative inline-block">
      <button
        className="inline-flex items-center gap-0.5 rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer align-baseline"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => source && onOpenPanel(source)}
      >
        <span>#{episodeNumber}</span>
        <span className="text-accent/60">@</span>
        <span>{timestamp}</span>
      </button>

      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-text-primary text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg pointer-events-none">
          Ep. #{episodeNumber} "{title}"
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-primary" />
        </span>
      )}
    </span>
  );
}
