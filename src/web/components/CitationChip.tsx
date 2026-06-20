import { ExternalLink } from "lucide-react";
import type { SourceReference } from "@/core/types";
import { matchCitationToSource } from "../lib/citations";
import { Badge } from "@/web/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/web/components/ui/hover-card";

type CitationChipProps = {
  index: number;
  episodeNumber: number;
  title: string;
  timestamp: string;
  sources: SourceReference[];
};

const chipClass =
  "h-[18px] min-w-[18px] cursor-default rounded-full px-1 align-super text-[10px] font-semibold";

export function CitationChip({
  index,
  episodeNumber,
  title,
  timestamp,
  sources,
}: CitationChipProps) {
  const source = matchCitationToSource(episodeNumber, timestamp, sources);
  const displayNumber = index + 1;

  const chip = (
    <Badge
      data-citation-chip
      variant="secondary"
      className={`${chipClass} ml-0.5`}
    >
      {displayNumber}
    </Badge>
  );

  if (!source) return chip;

  const truncatedText = source.text
    ? source.text.length > 180
      ? source.text.slice(0, 180) + "…"
      : source.text
    : null;

  return (
    <HoverCard openDelay={80} closeDelay={120}>
      <HoverCardTrigger asChild>{chip}</HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className={chipClass}>
            {displayNumber}
          </Badge>
          <span className="truncate text-xs font-semibold text-foreground">
            Ep. #{episodeNumber}
          </span>
          <span className="text-xs text-muted-foreground">@ {timestamp}</span>
        </div>

        <p className="mt-1.5 line-clamp-1 text-xs font-medium text-muted-foreground">
          {title}
        </p>

        {truncatedText && (
          <p className="mt-1.5 font-serif text-[11px] leading-relaxed text-muted-foreground italic">
            &ldquo;{truncatedText}&rdquo;
          </p>
        )}

        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-foreground hover:underline"
          >
            View transcript
            <ExternalLink className="size-3" />
          </a>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
