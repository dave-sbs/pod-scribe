import type { SourceReference } from "./conversation";

export type ChatRequest = {
  conversationId: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  summary?: string;
};

export type SSEEvent =
  | { type: "sources"; data: SourceReference[] }
  | { type: "delta"; data: { content: string } }
  | { type: "done"; data: { content: string; summary?: string } }
  | { type: "error"; data: { message: string } };
