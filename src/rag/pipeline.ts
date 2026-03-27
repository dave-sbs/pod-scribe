import { search } from "../search/search";
import { formatContext } from "../search/context";
import { chatCompletion, chatCompletionStream } from "./llm";
import {
  SYSTEM_PROMPT,
  buildPrompt,
  buildConversationMessages,
  buildSummarizationMessages,
  needsSummarization,
} from "./prompt";
import type { SearchResult, SourceReference } from "../types";

export type RagResult = {
  answer: string;
  sources: Array<{
    episodeNumber: number | null;
    title: string;
    timestamp: string;
    url: string;
  }>;
};

export async function ask(question: string): Promise<RagResult> {
  const results: SearchResult[] = await search(question);
  const context = formatContext(results);
  const answer = await chatCompletion(SYSTEM_PROMPT, buildPrompt(question, context));

  return {
    answer,
    sources: results.map((r) => ({
      episodeNumber: r.episodeNumber,
      title:         r.title,
      timestamp:     r.startTimestamp,
      url:           r.url,
    })),
  };
}

// --- Streaming conversation-aware pipeline ---

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamResult = {
  sources: SourceReference[];
  stream: AsyncGenerator<string>;
  summary?: string;
};

export async function askStream(
  question: string,
  history: ConversationMessage[],
  existingSummary?: string
): Promise<StreamResult> {
  const results: SearchResult[] = await search(question);
  const context = formatContext(results);

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
    summary = await chatCompletion(
      summarizeMessages[0].content,
      summarizeMessages[1].content
    );
  }

  const messages = buildConversationMessages(
    history,
    context,
    question,
    summary
  );

  const stream = chatCompletionStream(messages);

  return { sources, stream, summary };
}
