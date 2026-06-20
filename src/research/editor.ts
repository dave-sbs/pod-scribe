import type {
  Dossier,
  EngagementLexicon,
  Finding,
  ResearchPlan,
  SourceReference,
} from "@/core/types";
import type { DeskResult } from "./desk";
import type { SynthesisOutput } from "./schemas";
import {
  SourceRegistry,
  extractMarkerIds,
  rewriteSourceMarkers,
} from "./citations";

type ComposeInput = {
  plan: ResearchPlan;
  synthesis: SynthesisOutput;
  findings: Finding[];
  deskResults: DeskResult[];
  registry: SourceRegistry;
  absences: string[];
  droppedClaims: string[];
};

export type ComposedArtifacts = {
  dossier: Dossier;
  lexicon: EngagementLexicon;
  report: string;
  sources: SourceReference[];
};

function bulletList(items: string[]): string {
  return items.filter(Boolean).map((item) => `- ${item}`).join("\n");
}

export function composeArtifacts(input: ComposeInput): ComposedArtifacts {
  const { plan, synthesis, findings, deskResults, registry, absences } = input;
  const subject = plan.targetEntity?.name ?? plan.query;

  // Collect every source id referenced before we rewrite markers into citations.
  const citedIds = new Set<string>();
  const collect = (text: string) => {
    for (const id of extractMarkerIds(text)) citedIds.add(id);
  };
  collect(synthesis.thesis);
  collect(synthesis.executiveSummary);
  collect(synthesis.worldview);
  synthesis.sections.forEach((s) => collect(s.body));
  synthesis.contradictions.forEach(collect);
  synthesis.sacredCows.forEach(collect);
  synthesis.implications.forEach(collect);
  // Findings always carry valid citations; include their sources too.
  for (const finding of findings) {
    for (const c of finding.citations) {
      const match = registry
        .list()
        .find((s) => s.episodeNumber === c.episodeNumber && s.timestamp === c.timestamp);
      if (match) citedIds.add(match.sourceId);
    }
  }

  const rw = (text: string) => rewriteSourceMarkers(text, registry);

  // --- Narrative report ---
  const reportParts: string[] = [
    `# Research Dossier: ${subject}`,
    "",
    "## Thesis",
    rw(synthesis.thesis),
    "",
    "## Executive summary",
    rw(synthesis.executiveSummary),
  ];

  for (const section of synthesis.sections) {
    reportParts.push("", `## ${section.heading}`, rw(section.body));
  }

  if (synthesis.contradictions.length > 0) {
    reportParts.push(
      "",
      "## Tensions and contradictions",
      bulletList(synthesis.contradictions.map(rw)),
    );
  }

  const avoided = [...new Set([...synthesis.taboos, ...absences])];
  if (avoided.length > 0) {
    reportParts.push("", "## What the corpus avoids", bulletList(avoided.map(rw)));
  }

  if (synthesis.implications.length > 0) {
    reportParts.push("", "## Implications", bulletList(synthesis.implications.map(rw)));
  }

  const report = reportParts.join("\n");

  // --- Structured dossier appendix ---
  const dossier: Dossier = {
    brandOrIndustry: subject,
    worldview: rw(synthesis.worldview) || rw(synthesis.thesis),
    sacredCows: synthesis.sacredCows.map(rw),
    taboos: avoided.map(rw),
    sections: deskResults
      .filter((d) => d.findings.length > 0 || d.summary)
      .map((d) => ({
        title: d.desk.name,
        summary:
          rw(d.summary) ||
          `No high-confidence evidence was identified for ${d.desk.name.toLowerCase()}.`,
        findings: d.findings,
      })),
    contradictions: synthesis.contradictions.map(rw),
  };

  const lexicon: EngagementLexicon = {
    resonantLanguage: synthesis.lexicon.resonantLanguage,
    avoidLanguage: synthesis.lexicon.avoidLanguage,
    doSay: synthesis.lexicon.doSay,
    neverSay: synthesis.lexicon.neverSay,
    outreachTips: synthesis.lexicon.outreachTips,
  };

  const sources = registry.toSourceReferences(
    citedIds.size > 0 ? [...citedIds] : undefined,
  );

  return { dossier, lexicon, report, sources };
}
