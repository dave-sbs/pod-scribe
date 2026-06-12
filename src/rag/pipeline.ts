import { resolveEntities, rewriteQueryWithEntities } from "@/retrieval/entities";
import { searchCorpus, searchFindings } from "@/retrieval/search";
import { formatContext } from "@/retrieval/context";
import {
  buildConversationMessages,
  buildSummarizationMessages,
  needsSummarization,
} from "./prompt";
import type { FindingSearchResult, SearchResult, SourceReference } from "@/core/types";
import { generateText, streamText } from "ai";
import { config } from "@/core/config";

export type RagResult = {
  answer: string;
  sources: Array<{
    episodeNumber: number | null;
    title: string;
    timestamp: string;
    url: string;
  }>;
};

// --- Streaming conversation-aware pipeline ---

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamResult = {
  sources: SourceReference[];
  stream: AsyncIterable<string>;
  summary?: string;
};

export async function ask(question: string): Promise<RagResult> {
  const { sources, stream } = await askStream(question, [
    { role: "user", content: question },
  ]);

  let answer = "";
  for await (const token of stream) {
    answer += token;
  }

  return {
    answer,
    sources: sources.map((s) => ({
      episodeNumber: s.episodeNumber,
      title: s.title,
      timestamp: s.timestamp,
      url: s.url,
    })),
  };
}

export async function askStream(
  question: string,
  history: ConversationMessage[],
  existingSummary?: string,
): Promise<StreamResult> {
  const resolvedEntities = await resolveEntities(question);
  const rewrittenQuery = rewriteQueryWithEntities(question, resolvedEntities);
  const entityIds = resolvedEntities.map((entity) => entity.id);

  const results: SearchResult[] = await searchCorpus({
    query: rewrittenQuery,
    filters: {
      entityIds: entityIds.length > 0 ? entityIds : undefined,
    },
  });
  const findings: FindingSearchResult[] = await searchFindings(rewrittenQuery, {
    brandEntityId: entityIds[0],
  });
  const findingsContext = findingsToContext(findings);
  const context = [findingsContext, formatContext(results)].filter(Boolean).join("\n\n");

  const sources: SourceReference[] = results.map((r) => ({
    episodeNumber: r.episodeNumber,
    title: r.title,
    timestamp: r.startTimestamp,
    url: r.url,
    text: r.text,
  }));

  let summary = existingSummary;

  // Summarize old history if it's too long
  if (needsSummarization(history) && !existingSummary) {
    const summarizeMessages = buildSummarizationMessages(history);
    const { text } = await generateText({
      model: config.models.fast,
      system: summarizeMessages[0].content, // System prompt for summarization
      prompt: summarizeMessages[1].content, // User prompt with conversation transcript
    });

    summary = text.trim();
  }

  const messages = buildConversationMessages(
    history,
    context,
    question,
    summary,
  );

  const stream = streamText({
    model: config.models.fast,
    messages,
  });

  return { sources, stream: stream.textStream, summary };
}

function findingsToContext(findings: FindingSearchResult[]): string {
  if (findings.length === 0) return "";
  const lines = findings.map((finding, index) => {
    return `${index + 1}. ${finding.claim} (desk: ${finding.desk}, confidence: ${finding.confidence.toFixed(2)})`;
  });
  return `Previously mined findings:\n${lines.join("\n")}`;
}
