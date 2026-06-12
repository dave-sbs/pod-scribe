import { generateObject } from "ai";
import { config } from "@/core/config";
import type { ClarificationQuestion } from "@/core/types";
import { ClarificationQuestionsSchema } from "./schemas";
import { ENGAGEMENT_MANAGER_SYSTEM } from "./prompts";
import { resolveEntities } from "@/retrieval/entities";

const FALLBACK_QUESTIONS: ClarificationQuestion[] = [
  {
    id: "intent",
    question:
      "What will you use this research for? (e.g. outreach/positioning, competitive prep, due diligence, or general understanding)",
  },
  {
    id: "emphasis",
    question:
      "Which dimensions matter most to you — origin story, philosophy and values, business model, culture, competitors, or key people?",
  },
  {
    id: "stance",
    question:
      "Should the report stay descriptive, or do you want pointed strategic recommendations?",
    options: ["Descriptive only", "Include recommendations"],
  },
];

export async function generateClarifyingQuestions(
  query: string,
): Promise<ClarificationQuestion[]> {
  let entityHint = "";
  try {
    const entities = await resolveEntities(query);
    if (entities[0]) {
      entityHint = `\nResolved primary subject: ${entities[0].canonicalName} (${entities[0].type}).`;
    }
  } catch {
    // entity resolution is best-effort context only
  }

  try {
    const { object } = await generateObject({
      model: config.models.reasoning,
      schema: ClarificationQuestionsSchema,
      system: ENGAGEMENT_MANAGER_SYSTEM,
      prompt: `Client research request:\n"${query}"${entityHint}\n\nProduce 3-5 scoping questions.`,
    });

    const questions = object.questions
      .filter((q) => q.question.trim().length > 0)
      .slice(0, 5)
      .map((q, i) => ({
        id: q.id?.trim() || `q${i + 1}`,
        question: q.question.trim(),
        rationale: q.rationale?.trim() || undefined,
        options:
          q.options && q.options.length > 0
            ? q.options.map((o) => o.trim()).filter(Boolean)
            : undefined,
      }));

    return questions.length > 0 ? questions : FALLBACK_QUESTIONS;
  } catch {
    return FALLBACK_QUESTIONS;
  }
}
