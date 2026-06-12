import { nanoid } from "nanoid";
import { config } from "@/core/config";
import type {
  ClarificationAnswer,
  DeepRunStatus,
  Finding,
  SourceReference,
} from "@/core/types";
import { buildResearchPlan } from "./orchestrator";
import { runDesk, type DeskResult } from "./desk";
import { synthesizeFindings } from "./synthesize";
import { verifyFindings } from "./verify";
import { composeArtifacts } from "./editor";
import { SourceRegistry } from "./citations";
import {
  initRunState,
  persistArtifact,
  persistFindings,
  persistRunStatus,
} from "./state";

export type DeepResearchEvent =
  | { event: "status"; data: { runId: string; status: DeepRunStatus } }
  | { event: "plan"; data: { runId: string; plan: Awaited<ReturnType<typeof buildResearchPlan>> } }
  | {
      event: "desk_started";
      data: { runId: string; desk: string; index: number; total: number };
    }
  | { event: "desk_finding"; data: { runId: string; desk: string; finding: Finding } }
  | {
      event: "checkpoint";
      data: {
        runId: string;
        checkpoint: "plan" | "synthesis";
        status: "pending" | "auto-approved";
        note?: string;
      };
    }
  | { event: "synthesis"; data: { runId: string; synthesis: string } }
  | { event: "sources"; data: SourceReference[] }
  | {
      event: "artifact";
      data: {
        runId: string;
        dossier: ReturnType<typeof composeArtifacts>["dossier"];
        lexicon: ReturnType<typeof composeArtifacts>["lexicon"];
        report: string;
        sources: SourceReference[];
      };
    };

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export async function* runDeepResearch(
  query: string,
  clarifications?: ClarificationAnswer[],
): AsyncGenerator<DeepResearchEvent, { runId: string; report: string }, void> {
  const runId = nanoid();
  const registry = new SourceRegistry();

  await initRunState(runId, query);
  await persistRunStatus(runId, "planning");
  yield { event: "status", data: { runId, status: "planning" } };

  const plan = await buildResearchPlan(runId, query, clarifications);
  await persistRunStatus(runId, "planning", { plan });
  yield { event: "plan", data: { runId, plan } };
  yield {
    event: "checkpoint",
    data: {
      runId,
      checkpoint: "plan",
      status: "auto-approved",
      note: "Plan scoped from your answers; desks dispatched automatically.",
    },
  };

  await persistRunStatus(runId, "running_desks");
  yield { event: "status", data: { runId, status: "running_desks" } };

  // Run desks with bounded concurrency, preserving plan order for the UI.
  const deskResults: DeskResult[] = [];
  const batches = chunk(plan.desks, Math.max(1, config.deep.workerConcurrency));
  let completed = 0;

  for (const batch of batches) {
    const startIndex = completed;
    for (let i = 0; i < batch.length; i++) {
      yield {
        event: "desk_started",
        data: {
          runId,
          desk: batch[i].name,
          index: startIndex + i + 1,
          total: plan.desks.length,
        },
      };
    }

    const results = await Promise.all(
      batch.map((desk) =>
        runDesk({
          query,
          objective: plan.objective,
          desk,
          targetEntityId: plan.targetEntity?.id,
          registry,
        }),
      ),
    );

    for (const result of results) {
      deskResults.push(result);
      for (const finding of result.findings) {
        yield { event: "desk_finding", data: { runId, desk: result.desk.name, finding } };
      }
    }
    completed += batch.length;
  }

  // Fact-check across all findings before synthesis so the editor only works
  // with verified material.
  await persistRunStatus(runId, "verifying");
  yield { event: "status", data: { runId, status: "verifying" } };

  const allFindings = deskResults.flatMap((d) => d.findings);
  const verification = await verifyFindings(allFindings);

  const survivors = new Set(verification.findings);
  const verifiedByDesk = new Map<string, Finding[]>();
  for (const finding of verification.findings) {
    const list = verifiedByDesk.get(finding.desk) ?? [];
    list.push(finding);
    verifiedByDesk.set(finding.desk, list);
  }
  // Map each desk to its surviving (and possibly rewritten) findings.
  const verifiedDeskResults: DeskResult[] = deskResults.map((d) => ({
    ...d,
    findings: (verifiedByDesk.get(d.desk.key) ?? []).length
      ? verifiedByDesk.get(d.desk.key)!
      : d.findings.filter((f) => survivors.has(f)),
  }));

  await persistFindings(runId, verification.findings, plan.targetEntity?.id);

  await persistRunStatus(runId, "synthesizing");
  yield { event: "status", data: { runId, status: "synthesizing" } };

  const { synthesis, absences } = await synthesizeFindings(
    plan,
    verifiedDeskResults,
    registry,
  );
  const synthesisText = [synthesis.thesis, synthesis.executiveSummary]
    .filter(Boolean)
    .join("\n\n");
  yield { event: "synthesis", data: { runId, synthesis: synthesisText } };

  await persistRunStatus(runId, "editing", { synthesis: synthesisText });
  yield { event: "status", data: { runId, status: "editing" } };

  const artifact = composeArtifacts({
    plan,
    synthesis,
    findings: verification.findings,
    deskResults: verifiedDeskResults,
    registry,
    absences,
    droppedClaims: verification.droppedClaims,
  });

  yield { event: "sources", data: artifact.sources };

  await persistArtifact(runId, artifact.dossier, artifact.lexicon, artifact.report);
  yield {
    event: "artifact",
    data: {
      runId,
      dossier: artifact.dossier,
      lexicon: artifact.lexicon,
      report: artifact.report,
      sources: artifact.sources,
    },
  };
  yield { event: "status", data: { runId, status: "completed" } };

  return { runId, report: artifact.report };
}
