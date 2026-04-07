import { search } from "../search/search";
import { formatContext } from "../search/context";
import {
  SYSTEM_PROMPT,
  buildPrompt,
  buildConversationMessages,
  buildSummarizationMessages,
  needsSummarization,
} from "./prompt";
import type { SearchResult, SourceReference } from "../types";
import { generateText, streamText } from "ai";
import { config } from "../config";

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

export async function askStream(
  question: string,
  history: ConversationMessage[],
  existingSummary?: string,
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
    const { text } = await generateText({
      model: config.llm,
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
    model: config.llm,
    messages,
  });

  return { sources, stream: stream.textStream, summary };
}
