import { useMemo, useState, useCallback, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message, SourceReference } from "@/core/types";
import { parseCitations } from "../lib/citations";
import { CitationChip } from "./CitationChip";

type MessageBubbleProps = {
  message: Message;
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
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

  return <AssistantMessage message={message} isStreaming={isStreaming} />;
}

function AssistantMessage({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const proseRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(() => {
    const el = proseRef.current;
    if (!el) return;

    // Clone the rendered HTML and strip citation chip elements
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-citation-chip]").forEach((n) => n.remove());

    const html = clone.innerHTML;
    // Strip any remaining raw citation brackets from plain text
    const rawText = clone.textContent ?? "";
    const plainText = rawText
      .replace(/\[[^\]]*?Ep\.\s*#[^\]]+\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const segments = useMemo(
    () => parseCitations(message.content),
    [message.content]
  );

  // Split content into citation-free text parts for markdown rendering
  // We render the full content as markdown but inject citation chips
  const contentWithPlaceholders = useMemo(() => {
    let result = message.content;
    const citations: Array<{
      episodeNumber: number;
      title: string;
      timestamp: string;
      index: number;
    }> = [];

    for (const seg of segments) {
      if (seg.type === "citation") {
        citations.push(seg);
      }
    }
    // Replace citation brackets (single or multi) with placeholders
    const BRACKET_REGEX = /\[([^\]]*?Ep\.\s*#[^\]]+)\]/g;
    const SINGLE_CITE_REGEX =
      /Ep\.\s*#(\d+)\s*(?:"([^"]*)"\s*)?@\s*([\d:]+(?:[–-][\d:]+)?)/;
    let idx = 0;
    result = result.replace(BRACKET_REGEX, (_full, inner: string) => {
      const parts = inner.split(/;\s*/);
      const placeholders: string[] = [];
      for (const part of parts) {
        if (SINGLE_CITE_REGEX.test(part.trim())) {
          placeholders.push(`%%CITE_${idx++}%%`);
        }
      }
      return placeholders.length > 0 ? placeholders.join("") : _full;
    });
    return { text: result, citations };
  }, [message.content, segments]);

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-full w-full">
        <div className="rounded-2xl rounded-bl-md px-5 py-4">
          <div ref={proseRef} className="prose-assistant prose prose-sm max-w-none prose-headings:text-text-primary prose-p:text-text-primary prose-p:leading-relaxed prose-li:text-text-primary prose-strong:text-text-primary prose-blockquote:border-accent-light prose-blockquote:text-text-secondary">
            <MarkdownWithCitations
              text={contentWithPlaceholders.text}
              citations={contentWithPlaceholders.citations}
              sources={message.sources}
            />
          </div>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>

        {/* Copy button */}
        {!isStreaming && message.content && (
          <div className="px-5 pb-2">
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-secondary transition-colors"
              title="Copy response"
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
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
    index: number;
  }>;
  sources: SourceReference[];
};

function MarkdownWithCitations({
  text,
  citations,
  sources,
}: MarkdownWithCitationsProps) {
  // Custom text renderer that injects citation chips
  const components = useMemo(
    () => ({
      // Override text nodes to inject citations
      p: ({ children, ...props }: React.ComponentProps<"p">) => (
        <p {...props}>{processChildren(children, citations, sources)}</p>
      ),
      li: ({ children, ...props }: React.ComponentProps<"li">) => (
        <li {...props}>{processChildren(children, citations, sources)}</li>
      ),
    }),
    [citations, sources]
  );

  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </Markdown>
  );
}

function processChildren(
  children: React.ReactNode,
  citations: Array<{
    episodeNumber: number;
    title: string;
    timestamp: string;
    index: number;
  }>,
  sources: SourceReference[]
): React.ReactNode {
  if (!children) return children;

  if (typeof children === "string") {
    return replacePlaceholders(children, citations, sources);
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") {
        return (
          <span key={i}>
            {replacePlaceholders(child, citations, sources)}
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
  citations: Array<{
    episodeNumber: number;
    title: string;
    timestamp: string;
    index: number;
  }>,
  sources: SourceReference[]
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
          index={cite.index}
          episodeNumber={cite.episodeNumber}
          title={cite.title}
          timestamp={cite.timestamp}
          sources={sources}
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
