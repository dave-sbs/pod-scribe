import { useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message, SourceReference } from "../../types";
import { parseCitations } from "../lib/citations";
import { CitationChip } from "./CitationChip";

type MessageBubbleProps = {
  message: Message;
  isStreaming?: boolean;
  onOpenCitation: (source: SourceReference) => void;
};

export function MessageBubble({
  message,
  isStreaming,
  onOpenCitation,
}: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[85%] bg-bg-card rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AssistantMessage
      message={message}
      isStreaming={isStreaming}
      onOpenCitation={onOpenCitation}
    />
  );
}

function AssistantMessage({
  message,
  isStreaming,
  onOpenCitation,
}: MessageBubbleProps) {
  const segments = useMemo(
    () => parseCitations(message.content),
    [message.content]
  );

  // Collect unique episodes for the sources row
  const uniqueEpisodes = useMemo(() => {
    const seen = new Set<number>();
    return message.sources.filter((s) => {
      if (s.episodeNumber == null || seen.has(s.episodeNumber)) return false;
      seen.add(s.episodeNumber);
      return true;
    });
  }, [message.sources]);

  // Split content into citation-free text parts for markdown rendering
  // We render the full content as markdown but inject citation chips
  const contentWithPlaceholders = useMemo(() => {
    let result = message.content;
    const citations: Array<{
      episodeNumber: number;
      title: string;
      timestamp: string;
    }> = [];

    for (const seg of segments) {
      if (seg.type === "citation") {
        citations.push(seg);
      }
    }
    // Replace citations with placeholders for markdown
    const CITATION_REGEX = /\[Ep\.\s*#(\d+)\s*"([^"]+)"\s*@\s*([\d:]+)\]/g;
    let idx = 0;
    result = result.replace(CITATION_REGEX, () => `%%CITE_${idx++}%%`);
    return { text: result, citations };
  }, [message.content, segments]);

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-full w-full">
        <div className="rounded-2xl rounded-bl-md px-5 py-4">
          <div className="prose-assistant prose prose-sm max-w-none prose-headings:text-text-primary prose-p:text-text-primary prose-p:leading-relaxed prose-li:text-text-primary prose-strong:text-text-primary prose-blockquote:border-accent-light prose-blockquote:text-text-secondary">
            <MarkdownWithCitations
              text={contentWithPlaceholders.text}
              citations={contentWithPlaceholders.citations}
              sources={message.sources}
              onOpenCitation={onOpenCitation}
            />
          </div>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>

        {/* Sources row */}
        {uniqueEpisodes.length > 0 && !isStreaming && (
          <div className="flex items-center gap-2 mt-2 px-2 flex-wrap">
            <span className="text-xs text-text-muted">Sources:</span>
            {uniqueEpisodes.map((ep) => (
              <button
                key={`${ep.episodeNumber}-${ep.timestamp}`}
                className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
                onClick={() => onOpenCitation(ep)}
              >
                Ep. #{ep.episodeNumber} &ldquo;{ep.title}&rdquo;
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type MarkdownWithCitationsProps = {
  text: string;
  citations: Array<{
    episodeNumber: number;
    title: string;
    timestamp: string;
  }>;
  sources: SourceReference[];
  onOpenCitation: (source: SourceReference) => void;
};

function MarkdownWithCitations({
  text,
  citations,
  sources,
  onOpenCitation,
}: MarkdownWithCitationsProps) {
  // Custom text renderer that injects citation chips
  const components = useMemo(
    () => ({
      // Override text nodes to inject citations
      p: ({ children, ...props }: React.ComponentProps<"p">) => (
        <p {...props}>{processChildren(children, citations, sources, onOpenCitation)}</p>
      ),
      li: ({ children, ...props }: React.ComponentProps<"li">) => (
        <li {...props}>{processChildren(children, citations, sources, onOpenCitation)}</li>
      ),
    }),
    [citations, sources, onOpenCitation]
  );

  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </Markdown>
  );
}

function processChildren(
  children: React.ReactNode,
  citations: Array<{ episodeNumber: number; title: string; timestamp: string }>,
  sources: SourceReference[],
  onOpenCitation: (source: SourceReference) => void
): React.ReactNode {
  if (!children) return children;

  if (typeof children === "string") {
    return replacePlaceholders(children, citations, sources, onOpenCitation);
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") {
        return (
          <span key={i}>
            {replacePlaceholders(child, citations, sources, onOpenCitation)}
          </span>
        );
      }
      return child;
    });
  }

  return children;
}

function replacePlaceholders(
  text: string,
  citations: Array<{ episodeNumber: number; title: string; timestamp: string }>,
  sources: SourceReference[],
  onOpenCitation: (source: SourceReference) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /%%CITE_(\d+)%%/g;
  let lastIdx = 0;

  for (const match of text.matchAll(regex)) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const citeIdx = parseInt(match[1], 10);
    const cite = citations[citeIdx];
    if (cite) {
      parts.push(
        <CitationChip
          key={`cite-${citeIdx}-${match.index}`}
          episodeNumber={cite.episodeNumber}
          title={cite.title}
          timestamp={cite.timestamp}
          sources={sources}
          onOpenPanel={onOpenCitation}
        />
      );
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts;
}
