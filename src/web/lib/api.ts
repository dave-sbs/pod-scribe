import type { SourceReference } from "../../types";

type ChatCallbacks = {
  onSources: (sources: SourceReference[]) => void;
  onDelta: (content: string) => void;
  onDone: (content: string, summary?: string) => void;
  onError: (message: string) => void;
};

type ChatParams = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  conversationId: string;
  summary?: string;
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
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
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
