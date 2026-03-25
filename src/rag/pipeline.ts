import { search } from "../search/search";
import { formatContext } from "../search/context";
import { chatCompletion } from "./llm";
import { SYSTEM_PROMPT, buildPrompt } from "./prompt";
import type { SearchResult } from "../types";

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
