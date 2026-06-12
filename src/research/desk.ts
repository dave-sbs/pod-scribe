import { generateObject } from "ai";
import { config } from "@/core/config";
import type { DeskPlan, Finding, SearchFilters } from "@/core/types";
import { searchCorpusTool } from "./tools";
import { SourceRegistry, type ResolvedSource } from "./citations";
import { DeskMemoSchema } from "./schemas";
import { DESK_ANALYST_SYSTEM } from "./prompts";

type RunDeskInput = {
  query: string;
  objective: string;
  desk: DeskPlan;
  targetEntityId?: number;
  registry: SourceRegistry;
};

export type DeskResult = {
  desk: DeskPlan;
  findings: Finding[];
  tensions: string[];
  absences: string[];
  summary: string;
};

/**
 * Gather evidence across every subquestion, dedup it into the shared registry,
 * and have an analyst produce a structured, source-id-cited memo.
 */
export async function runDesk(input: RunDeskInput): Promise<DeskResult> {
  const { desk, registry } = input;
  const filters: SearchFilters = {
    entityIds: input.targetEntityId ? [input.targetEntityId] : undefined,
  };

  const subquestions =
    desk.subquestions.length > 0
      ? desk.subquestions
      : [`What does the corpus say about ${desk.name} for: ${input.query}?`];

  // One targeted search per subquestion; collect this desk's evidence pool.
  const deskSources = new Map<string, ResolvedSource>();
  const searchResults = await Promise.all(
    subquestions.map((sq) =>
      searchCorpusTool({
        query: `${sq}\nContext: ${desk.objective}`,
        filters,
        topK: config.deep.findingsTopK,
      }).catch(() => []),
    ),
  );

  for (const results of searchResults) {
    for (const row of results) {
      const resolved = registry.add(row);
      deskSources.set(resolved.sourceId, resolved);
    }
  }

  const pack = [...deskSources.values()];
  if (pack.length === 0) {
    return { desk, findings: [], tensions: [], absences: [], summary: "" };
  }

  // Cap the evidence pack so prompts stay bounded.
  const cappedPack = pack.slice(0, 18);

  let memo;
  try {
    const { object } = await generateObject({
      model: config.models.fast,
      schema: DeskMemoSchema,
      system: DESK_ANALYST_SYSTEM,
      prompt: [
        `Desk: ${desk.name}`,
        `Objective: ${desk.objective}`,
        `Investigation objective: ${input.objective}`,
        "",
        "Subquestions to address:",
        ...subquestions.map((s) => `- ${s}`),
        "",
        "Evidence pack (cite by id):",
        registry.formatForPrompt(cappedPack),
      ].join("\n"),
    });
    memo = object;
  } catch {
    return { desk, findings: [], tensions: [], absences: [], summary: "" };
  }

  const findings: Finding[] = [];
  for (const claim of memo.claims) {
    const validRefs = registry.validateRefs(claim.evidenceRefs);
    if (validRefs.length === 0 || !claim.text.trim()) continue;

    const citations = registry.toFindingCitations(validRefs);
    const slugs = [
      ...new Set(
        validRefs
          .map((id) => registry.resolve(id)?.slug)
          .filter((s): s is string => Boolean(s)),
      ),
    ];

    findings.push({
      desk: desk.key,
      claim: claim.text.trim(),
      evidence: citations.map((c, i) => ({
        quote: c.quote ?? "",
        rationale: i === 0 ? claim.reasoning.trim() : undefined,
      })),
      citations,
      confidence: Math.max(0, Math.min(1, claim.confidence)),
      insightType: desk.insightType,
      crossSourceRefs: slugs,
    });
  }

  return {
    desk,
    findings,
    tensions: (memo.tensions ?? []).map((t) => t.trim()).filter(Boolean),
    absences: (memo.absences ?? []).map((a) => a.trim()).filter(Boolean),
    summary: memo.summary.trim(),
  };
}
