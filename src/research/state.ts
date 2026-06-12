import { supabase } from "@/db/client";
import { embedText } from "@/core/embeddings";
import type {
  DeepRunState,
  DeepRunStatus,
  Dossier,
  EngagementLexicon,
  Finding,
  ResearchPlan,
} from "@/core/types";

function nowIso(): string {
  return new Date().toISOString();
}

export async function initRunState(
  runId: string,
  query: string,
): Promise<DeepRunState> {
  const state: DeepRunState = {
    runId,
    query,
    status: "planning",
    findings: [],
    updatedAt: nowIso(),
  };

  try {
    await supabase.from("research_runs").upsert(
      {
        id: runId,
        query_text: query,
        mode: "deep",
        status: state.status,
        updated_at: state.updatedAt,
      },
      { onConflict: "id" },
    );
  } catch {
    // Best-effort persistence.
  }

  return state;
}

export async function persistRunStatus(
  runId: string,
  status: DeepRunStatus,
  patch?: { plan?: ResearchPlan; synthesis?: string; report?: string },
): Promise<void> {
  try {
    await supabase
      .from("research_runs")
      .update({
        status,
        plan_json: patch?.plan ?? null,
        synthesis_json: patch?.synthesis ? { text: patch.synthesis } : null,
        artifact_json: patch?.report ? { report: patch.report } : null,
        updated_at: nowIso(),
      })
      .eq("id", runId);
  } catch {
    // Best-effort persistence.
  }
}

export async function persistFindings(
  runId: string,
  findings: Finding[],
  brandEntityId?: number,
): Promise<void> {
  if (findings.length === 0) return;

  try {
    const rows = await Promise.all(
      findings.map(async (finding) => ({
        run_id: runId,
        brand_entity_id: brandEntityId ?? null,
        desk: finding.desk,
        claim_text: finding.claim,
        evidence: finding.evidence,
        citations: finding.citations,
        confidence: finding.confidence,
        insight_type: finding.insightType,
        cross_source_refs: finding.crossSourceRefs,
        embedding: await embedText(finding.claim),
      })),
    );
    await supabase.from("research_findings").insert(rows);
  } catch {
    // Best-effort persistence.
  }
}

export async function persistArtifact(
  runId: string,
  dossier: Dossier,
  lexicon: EngagementLexicon,
  report: string,
): Promise<void> {
  try {
    await supabase
      .from("research_runs")
      .update({
        status: "completed",
        artifact_json: { dossier, lexicon, report },
        updated_at: nowIso(),
      })
      .eq("id", runId);
  } catch {
    // Best-effort persistence.
  }
}

export async function getRunById(runId: string): Promise<DeepRunState | null> {
  const { data, error } = await supabase
    .from("research_runs")
    .select("id, query_text, status, plan_json, synthesis_json, artifact_json, updated_at")
    .eq("id", runId)
    .maybeSingle();

  if (error || !data) return null;

  const artifact = (data.artifact_json ?? {}) as {
    dossier?: Dossier;
    lexicon?: EngagementLexicon;
    report?: string;
  };

  return {
    runId: data.id as string,
    query: data.query_text as string,
    status: data.status as DeepRunStatus,
    plan: (data.plan_json as ResearchPlan | null) ?? undefined,
    findings: [],
    synthesis: ((data.synthesis_json as { text?: string } | null)?.text ?? undefined),
    dossier: artifact.dossier,
    lexicon: artifact.lexicon,
    report: artifact.report,
    updatedAt: (data.updated_at as string) ?? nowIso(),
  };
}
