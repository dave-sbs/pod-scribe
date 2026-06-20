import type { DeepRunState } from "./research";

export type SourceReference = {
  episodeNumber: number | null;
  title: string;
  timestamp: string;
  url: string;
  text: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceReference[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  summary?: string;
  deepRuns?: Record<string, DeepRunState>;
  activeDeepRunId?: string;
  createdAt: string;
  updatedAt: string;
};
