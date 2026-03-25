import axios from "axios";
import { config } from "../config";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

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
