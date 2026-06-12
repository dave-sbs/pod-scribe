import { generateObject, generateText } from "ai";
import { config } from "@/core/config";
import type {
  ClarificationAnswer,
  DeskPlan,
  ResearchPlan,
} from "@/core/types";
import { resolveEntities } from "@/retrieval/entities";
import { DeskPlanSchema } from "./schemas";
import { RESEARCH_DIRECTOR_SYSTEM } from "./prompts";

// Fallback desks used when dynamic planning fails. These mirror the original
// brand-research template but now carry real subquestions.
const FALLBACK_DESKS: DeskPlan[] = [
  {
    key: "heritage_founding",
    name: "Heritage and founding desk",
    insightType: "topic",
    objective: "Establish the origin story, founding motivations, and early decisions.",
    subquestions: [
      "How and why was it founded, and by whom?",
      "What early decisions or constraints shaped its trajectory?",
      "What founding values are repeatedly invoked?",
    ],
  },
  {
    key: "culture_values",
    name: "Culture and values desk",
    insightType: "discourse",
    objective: "Characterize the stated values and the language used to express them.",
    subquestions: [
      "What values are explicitly championed?",
      "What language and metaphors recur when describing the mission?",
      "Where do stated values conflict with described actions?",
    ],
  },
  {
    key: "business_model_services",
    name: "Business model and economics desk",
    insightType: "topic",
    objective: "Explain how it makes money and what the economic model rewards.",
    subquestions: [
      "What are the core products, services, or revenue streams?",
      "What does the model optimize for, and what trade-offs does it accept?",
      "How is pricing or value capture discussed, if at all?",
    ],
  },
  {
    key: "competitive_landscape",
    name: "Competitive landscape desk",
    insightType: "topic",
    objective: "Map rivals, differentiation, and positioning.",
    subquestions: [
      "Who are the named competitors or alternatives?",
      "How is differentiation framed?",
      "What competitive threats or pressures are acknowledged?",
    ],
  },
  {
    key: "leadership_people",
    name: "Leadership and key people desk",
    insightType: "topic",
    objective: "Profile the people who shape decisions and culture.",
    subquestions: [
      "Who are the key figures and what are they known for?",
      "What leadership philosophy or decision style appears?",
      "How do these people describe their own motivations?",
    ],
  },
];

function formatClarifications(answers?: ClarificationAnswer[]): string {
  if (!answers || answers.length === 0) {
    return "(The client did not provide additional scoping answers.)";
  }
  return answers
    .filter((a) => a.answer.trim().length > 0)
    .map((a) => `- ${a.question}\n  → ${a.answer.trim()}`)
    .join("\n");
}

function uniqueKey(base: string, used: Set<string>): string {
  let key = base.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!key) key = "desk";
  let candidate = key;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${key}_${i++}`;
  }
  used.add(candidate);
  return candidate;
}

async function planDesksDynamically(
  brief: string,
): Promise<DeskPlan[] | null> {
  try {
    const { object } = await generateObject({
      model: config.models.reasoning,
      schema: DeskPlanSchema,
      system: RESEARCH_DIRECTOR_SYSTEM,
      prompt: `Client brief:\n${brief}\n\nDesign the research desks.`,
    });

    const usedKeys = new Set<string>();
    const desks: DeskPlan[] = object.desks
      .filter((d) => d.name.trim() && d.subquestions.length > 0)
      .slice(0, config.deep.maxDesks)
      .map((d) => ({
        key: uniqueKey(d.key || d.name, usedKeys),
        name: d.name.trim(),
        objective: `${d.objective.trim()}${d.angle ? ` Angle: ${d.angle.trim()}` : ""}`,
        subquestions: d.subquestions
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, config.deep.subqueriesPerDesk + 2),
        insightType: d.insightType,
      }));

    return desks.length >= 2 ? desks : null;
  } catch {
    return null;
  }
}

export async function buildResearchPlan(
  runId: string,
  query: string,
  clarifications?: ClarificationAnswer[],
): Promise<ResearchPlan> {
  const entities = await resolveEntities(query);
  const targetEntity = entities[0];

  const clarificationBlock = formatClarifications(clarifications);
  const subjectLine = targetEntity
    ? `Primary subject: ${targetEntity.canonicalName} (${targetEntity.type}).`
    : "Primary subject: inferred from the request.";

  const brief = [
    `Original request: "${query}"`,
    subjectLine,
    "Scoping answers:",
    clarificationBlock,
  ].join("\n");

  let objectiveLine = "";
  try {
    const { text } = await generateText({
      model: config.models.reasoning,
      system:
        "You are a research director. In 1-2 sentences, state the precise objective of this investigation, reflecting the client's intent and scope.",
      prompt: brief,
    });
    objectiveLine = text.trim();
  } catch {
    objectiveLine = `Investigate the corpus to answer: ${query}`;
  }

  const dynamicDesks = await planDesksDynamically(brief);
  const desks = dynamicDesks ?? FALLBACK_DESKS;

  return {
    runId,
    query,
    mode: query.toLowerCase().includes("industry") ? "industry" : "brand",
    objective: objectiveLine,
    brief,
    clarifications,
    targetEntity: targetEntity
      ? {
          id: targetEntity.id,
          name: targetEntity.canonicalName,
          type: targetEntity.type,
        }
      : undefined,
    desks,
    createdAt: new Date().toISOString(),
  };
}
