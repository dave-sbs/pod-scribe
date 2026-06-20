import { useState, useRef, useEffect } from "react";
import type { SourceReference } from "@/core/types";
import { matchCitationToSource } from "../lib/citations";

type CitationChipProps = {
  index: number;
  episodeNumber: number;
  title: string;
  timestamp: string;
  sources: SourceReference[];
};

export function CitationChip({
  index,
  episodeNumber,
  title,
  timestamp,
  sources,
}: CitationChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [popoverSide, setPopoverSide] = useState<"above" | "below">("above");
  const chipRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const source = matchCitationToSource(episodeNumber, timestamp, sources);

  useEffect(() => {
    if (isHovered && chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      // If not enough space above (popover ~160px tall + 8px gap), show below
      setPopoverSide(rect.top < 180 ? "below" : "above");
    }
  }, [isHovered]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 150);
  };

  const displayNumber = index + 1;
  const truncatedText = source?.text
    ? source.text.length > 180
      ? source.text.slice(0, 180) + "..."
      : source.text
    : null;

  return (
    <span
      ref={chipRef}
      className="relative inline-block"
      data-citation-chip
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-lg bg-accent/15 text-accent text-[10px] font-semibold cursor-default align-super ml-0.5 hover:bg-accent/25 transition-colors">
        {displayNumber}
      </span>

      {isHovered && source && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 z-50 w-72 ${
            popoverSide === "above" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span className="block rounded-xl border border-border bg-bg-card shadow-lg p-3">
            {/* Header */}
            <span className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-semibold shrink-0">
                {displayNumber}
              </span>
              <span className="text-xs font-semibold text-text-primary truncate">
                Ep. #{episodeNumber}
              </span>
              <span className="text-xs text-text-muted">@ {timestamp}</span>
            </span>

            {/* Title */}
            <span className="block text-xs font-medium text-text-secondary mb-1.5 line-clamp-1">
              {title}
            </span>

            {/* Excerpt */}
            {truncatedText && (
              <span className="block text-[11px] leading-relaxed text-text-muted font-serif italic">
                &ldquo;{truncatedText}&rdquo;
              </span>
            )}

            {/* Link */}
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[11px] text-accent hover:text-accent-hover transition-colors"
              >
                View transcript
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </span>

          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-border bg-bg-card ${
              popoverSide === "above"
                ? "top-full -mt-1.5 border-b border-r"
                : "bottom-full -mb-1.5 border-t border-l"
            }`}
          />
        </span>
      )}
    </span>
  );
}
