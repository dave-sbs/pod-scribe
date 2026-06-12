import type { SourceReference } from "./conversation";
import type {
  ClarificationAnswer,
  DeepRunStatus,
  Dossier,
  EngagementLexicon,
  Finding,
  ResearchPlan,
} from "./research";

export type ChatRequest = {
  conversationId: string;
  mode?: "quick" | "deep";
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  summary?: string;
  clarifications?: ClarificationAnswer[];
};

export type CheckpointType = "plan" | "synthesis";

export type SSEEvent =
  | { type: "sources"; data: SourceReference[] }
  | { type: "delta"; data: { content: string } }
  | { type: "done"; data: { content: string; summary?: string } }
  | { type: "status"; data: { runId: string; status: DeepRunStatus } }
  | { type: "plan"; data: { runId: string; plan: ResearchPlan } }
  | {
      type: "desk_started";
      data: { runId: string; desk: string; index: number; total: number };
    }
  | { type: "desk_finding"; data: { runId: string; desk: string; finding: Finding } }
  | {
      type: "checkpoint";
      data: {
        runId: string;
        checkpoint: CheckpointType;
        status: "pending" | "auto-approved";
        note?: string;
      };
    }
  | { type: "synthesis"; data: { runId: string; synthesis: string } }
  | {
      type: "artifact";
      data: {
        runId: string;
        dossier: Dossier;
        lexicon: EngagementLexicon;
        report: string;
        sources: SourceReference[];
      };
    }
  | { type: "error"; data: { message: string } };
