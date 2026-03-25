export const SYSTEM_PROMPT = `You are a research assistant with access to transcripts from the Founders podcast. Answer questions using only the provided transcript excerpts.

Rules:
- Answer only from the provided sources. Do not use outside knowledge.
- Cite every claim with an inline citation in this exact format: [Ep. #N "Title" @ HH:MM:SS]
- If multiple sources support a point, cite all of them.
- Organize your answer thematically, not episode-by-episode.
- If the sources don't contain enough information to answer, say so clearly.
- Be specific and concrete. Quote directly when it adds value.`;

export function buildPrompt(question: string, context: string): string {
  return `Transcript excerpts:\n\n${context}\n\n---\n\nQuestion: ${question}`;
}

// --- Conversation-aware prompt building ---

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const SUMMARIZE_PROMPT = `Summarize the following conversation between a user and a research assistant about the Founders podcast. Preserve: key topics discussed, specific episodes and people mentioned, conclusions reached, and any corrections made. Be concise but complete.`;

const MAX_HISTORY_CHARS = 80_000; // ~20K tokens

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildConversationMessages(
  history: ConversationMessage[],
  context: string,
  question: string,
  summary?: string
): LLMMessage[] {
  const messages: LLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (summary) {
    messages.push({
      role: "user",
      content: `Previous conversation context:\n${summary}`,
    });
    messages.push({
      role: "assistant",
      content: "Understood. I'll use this context to inform my responses.",
    });
  }

  // Add conversation history (excluding the latest user message which gets context appended)
  const priorMessages = history.slice(0, -1);
  for (const msg of priorMessages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Latest user message with fresh search context
  messages.push({
    role: "user",
    content: `Transcript excerpts:\n\n${context}\n\n---\n\nQuestion: ${question}`,
  });

  return messages;
}

export function needsSummarization(history: ConversationMessage[]): boolean {
  const totalChars = history.reduce((sum, m) => sum + m.content.length, 0);
  return totalChars > MAX_HISTORY_CHARS;
}

export function buildSummarizationMessages(
  history: ConversationMessage[]
): LLMMessage[] {
  // Keep the most recent 4 exchanges (8 messages) out of summarization
  const cutoff = Math.max(0, history.length - 8);
  const toSummarize = history.slice(0, cutoff);

  const transcript = toSummarize
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  return [
    { role: "system", content: SUMMARIZE_PROMPT },
    { role: "user", content: transcript },
  ];
}
