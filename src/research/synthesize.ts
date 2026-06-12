import { generateObject } from "ai";
import { config } from "@/core/config";
import type { ResearchPlan } from "@/core/types";
import type { DeskResult } from "./desk";
import type { SourceRegistry } from "./citations";
import { SynthesisSchema, type SynthesisOutput } from "./schemas";
import { SENIOR_EDITOR_SYSTEM } from "./prompts";

function fallbackSynthesis(
  plan: ResearchPlan,
  deskResults: DeskResult[],
): SynthesisOutput {
  const sections = deskResults
    .filter((d) => d.findings.length > 0 || d.summary)
    .map((d) => ({
      heading: d.desk.name,
      body:
        d.summary ||
        d.findings
          .map((f) => `- ${f.claim} ${f.citations.length ? "[S?]" : ""}`)
          .join("\n"),
    }));

  const allTensions = deskResults.flatMap((d) => d.tensions);
  const allAbsences = deskResults.flatMap((d) => d.absences);

  return {
    thesis: plan.objective || `Findings for: ${plan.query}`,
    executiveSummary: deskResults.map((d) => d.summary).filter(Boolean).join(" "),
    sections,
    contradictions: allTensions,
    worldview: deskResults.find((d) => d.summary)?.summary ?? "",
    sacredCows: [],
    taboos: allAbsences,
    lexicon: {
      resonantLanguage: [],
      avoidLanguage: [],
      doSay: [],
      neverSay: [],
      outreachTips: [],
    },
    implications: [],
  };
}

export async function synthesizeFindings(
  plan: ResearchPlan,
  deskResults: DeskResult[],
  registry: SourceRegistry,
): Promise<{ synthesis: SynthesisOutput; absences: string[] }> {
  const aggregatedAbsences = [
    ...new Set(deskResults.flatMap((d) => d.absences)),
  ];

  const deskBriefs = deskResults
    .filter((d) => d.findings.length > 0)
    .map((d) => {
      const claims = d.findings
        .map((f) => `  - ${f.claim} (confidence ${f.confidence.toFixed(2)})`)
        .join("\n");
      const tensions = d.tensions.length
        ? `\n  Tensions: ${d.tensions.join("; ")}`
        : "";
      const absences = d.absences.length
        ? `\n  Absences: ${d.absences.join("; ")}`
        : "";
      return `### ${d.desk.name}\nSummary: ${d.summary}\nClaims:\n${claims}${tensions}${absences}`;
    })
    .join("\n\n");

  // Give the editor the evidence ids so it can cite with [S#] markers.
  const evidencePack = registry.formatForPrompt(registry.list().slice(0, 60));

  if (!deskBriefs.trim()) {
    return { synthesis: fallbackSynthesis(plan, deskResults), absences: aggregatedAbsences };
  }

  try {
    const { object } = await generateObject({
      model: config.models.reasoning,
      schema: SynthesisSchema,
      system: SENIOR_EDITOR_SYSTEM,
      prompt: [
        `Investigation objective: ${plan.objective}`,
        `Original request: "${plan.query}"`,
        plan.brief ? `\nBrief:\n${plan.brief}` : "",
        "",
        "Desk memos:",
        deskBriefs,
        "",
        "Evidence available for citation (cite by id, e.g. [S3]):",
        evidencePack,
        "",
        "Write the synthesis. Connect findings across desks, surface tensions, and cite with [S#] markers.",
      ].join("\n"),
    });

    return { synthesis: object, absences: aggregatedAbsences };
  } catch {
    return { synthesis: fallbackSynthesis(plan, deskResults), absences: aggregatedAbsences };
  }
}
