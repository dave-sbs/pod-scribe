import type {
  ClarificationAnswer,
  ClarificationQuestion,
  Dossier,
  EngagementLexicon,
  Finding,
  ResearchPlan,
  SourceReference,
} from "@/core/types";

type ChatCallbacks = {
  onSources: (sources: SourceReference[]) => void;
  onDelta: (content: string) => void;
  onDone: (content: string, summary?: string) => void;
  onError: (message: string) => void;
  onStatus?: (runId: string, status: string) => void;
  onPlan?: (runId: string, plan: ResearchPlan) => void;
  onDeskStarted?: (
    runId: string,
    desk: string,
    index: number,
    total: number
  ) => void;
  onDeskFinding?: (runId: string, desk: string, finding: Finding) => void;
  onCheckpoint?: (
    runId: string,
    checkpoint: "plan" | "synthesis",
    note?: string
  ) => void;
  onSynthesis?: (runId: string, synthesis: string) => void;
  onArtifact?: (
    runId: string,
    dossier: Dossier,
    lexicon: EngagementLexicon,
    report: string,
    sources: SourceReference[]
  ) => void;
};

type ChatParams = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  conversationId: string;
  mode?: "quick" | "deep";
  summary?: string;
  clarifications?: ClarificationAnswer[];
};

export async function streamChat(
  params: ChatParams,
  callbacks: ChatCallbacks
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    callbacks.onError(`Request failed: ${text}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Empty line = end of SSE message (reset event)
      if (!trimmed) {
        currentEvent = "";
        continue;
      }

      if (trimmed.startsWith("event:")) {
        currentEvent = trimmed.slice(6).trim();
        continue;
      }

      if (trimmed.startsWith("data:")) {
        const payload = trimmed.slice(5).trim();

        try {
          const data = JSON.parse(payload);
          switch (currentEvent) {
            case "sources":
              callbacks.onSources(data as SourceReference[]);
              break;
            case "delta":
              callbacks.onDelta(data.content);
              break;
            case "done":
              callbacks.onDone(data.content, data.summary);
              break;
            case "error":
              callbacks.onError(data.message);
              break;
            case "status":
              callbacks.onStatus?.(data.runId, data.status);
              break;
            case "plan":
              callbacks.onPlan?.(data.runId, data.plan as ResearchPlan);
              break;
            case "desk_started":
              callbacks.onDeskStarted?.(
                data.runId,
                data.desk,
                data.index,
                data.total
              );
              break;
            case "desk_finding":
              callbacks.onDeskFinding?.(
                data.runId,
                data.desk,
                data.finding as Finding
              );
              break;
            case "checkpoint":
              callbacks.onCheckpoint?.(data.runId, data.checkpoint, data.note);
              break;
            case "synthesis":
              callbacks.onSynthesis?.(data.runId, data.synthesis);
              break;
            case "artifact":
              callbacks.onArtifact?.(
                data.runId,
                data.dossier as Dossier,
                data.lexicon as EngagementLexicon,
                data.report,
                (data.sources ?? []) as SourceReference[]
              );
              break;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}

export async function clarifyResearch(
  query: string
): Promise<{ runId: string; questions: ClarificationQuestion[] }> {
  const response = await fetch("/api/research/clarify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    return { runId: "", questions: [] };
  }

  return (await response.json()) as {
    runId: string;
    questions: ClarificationQuestion[];
  };
}

export async function generateTitle(
  firstMessage: string
): Promise<string> {
  const response = await fetch("/api/chat/title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstMessage }),
  });

  if (!response.ok) return "New conversation";

  const data = (await response.json()) as { title: string };
  return data.title;
}

export async function resumeResearch(
  runId: string,
  checkpoint: "plan" | "synthesis",
  note?: string
): Promise<void> {
  await fetch(`/api/research/${runId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkpoint, note }),
  });
}
