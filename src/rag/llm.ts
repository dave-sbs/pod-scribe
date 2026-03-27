import axios from "axios";
import { config } from "../config";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await axios.post<{
    choices: Array<{ message: { content: string } }>;
  }>(
    OPENROUTER_CHAT_URL,
    {
      model:    config.llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
    },
    {
      headers: {
        Authorization:  `Bearer ${config.openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 120_000,
    }
  );

  const content = response.data.choices[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

export async function* chatCompletionStream(
  messages: LLMMessage[]
): AsyncGenerator<string> {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openrouterApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.llmModel,
      messages,
      stream: true,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body from OpenRouter");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") return;

      const parsed = JSON.parse(payload) as {
        choices: Array<{ delta: { content?: string } }>;
      };
      const content = parsed.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
