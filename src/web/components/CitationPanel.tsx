import { useEffect, useRef } from "react";
import type { SourceReference } from "../../types";

type CitationPanelProps = {
  source: SourceReference | null;
  onClose: () => void;
};

export function CitationPanel({ source, onClose }: CitationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (source) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [source, onClose]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[420px] max-w-full bg-bg-card border-l border-border shadow-2xl z-40 transition-transform duration-300 ease-out ${
        source ? "translate-x-0" : "translate-x-full"
      }`}
      ref={panelRef}
    >
      {source && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div className="pr-4">
              <p className="text-xs font-medium text-accent uppercase tracking-wider mb-1">
                Source
              </p>
              <h3 className="text-lg font-semibold text-text-primary leading-snug">
                {source.episodeNumber != null && (
                  <span className="text-text-secondary">
                    #{source.episodeNumber}{" "}
                  </span>
                )}
                {source.title}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                @ {source.timestamp}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Transcript excerpt */}
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
              Transcript Excerpt
            </p>
            <blockquote className="font-serif text-[15px] leading-relaxed text-text-primary border-l-2 border-accent-light pl-4 italic">
              {source.text}
            </blockquote>
          </div>

          {/* Footer with link */}
          <div className="p-6 border-t border-border">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
            >
              View full episode transcript
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
