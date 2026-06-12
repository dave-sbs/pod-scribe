import { generateObject } from "ai";
import { config } from "@/core/config";
import type { Finding } from "@/core/types";
import { VerificationSchema } from "./schemas";
import { FACT_CHECKER_SYSTEM } from "./prompts";

export type VerificationResult = {
  findings: Finding[];
  droppedClaims: string[];
};

const LOAD_BEARING = 0.7;

function heuristicPass(findings: Finding[]): VerificationResult {
  const droppedClaims: string[] = [];
  const verified: Finding[] = [];

  for (const finding of findings) {
    const hasEvidence = finding.evidence.length > 0 && finding.citations.length > 0;
    const loadBearing = finding.confidence >= LOAD_BEARING;

    if (loadBearing && !hasEvidence) {
      droppedClaims.push(finding.claim);
      continue;
    }

    if (!hasEvidence) {
      verified.push({
        ...finding,
        confidence: Math.max(0.2, finding.confidence - 0.25),
      });
      continue;
    }

    verified.push(finding);
  }

  return { findings: verified, droppedClaims };
}

/**
 * Heuristic structural check, then an LLM fact-checker that challenges
 * load-bearing claims against their own cited quotes. Unsupported claims are
 * dropped; partial ones are tightened to what the evidence supports.
 */
export async function verifyFindings(findings: Finding[]): Promise<VerificationResult> {
  const base = heuristicPass(findings);
  const candidates = base.findings;

  // Only spend a model call on load-bearing claims that actually carry quotes.
  const indexed = candidates
    .map((finding, index) => ({ finding, index }))
    .filter(({ finding }) => finding.confidence >= LOAD_BEARING && finding.citations.length > 0);

  if (indexed.length === 0) {
    return base;
  }

  let verdictsByIndex = new Map<
    number,
    { verdict: "supported" | "partial" | "unsupported"; rewrite?: string }
  >();

  try {
    const { object } = await generateObject({
      model: config.models.reasoning,
      schema: VerificationSchema,
      system: FACT_CHECKER_SYSTEM,
      prompt: indexed
        .map(({ finding, index }) => {
          const quotes = finding.citations
            .map((c) => `  - "${c.quote ?? ""}"`)
            .join("\n");
          return `Claim ${index}: ${finding.claim}\nCited quotes:\n${quotes}`;
        })
        .join("\n\n"),
    });
    verdictsByIndex = new Map(
      object.verdicts.map((v) => [v.index, { verdict: v.verdict, rewrite: v.rewrite }]),
    );
  } catch {
    // If the fact-check call fails, fall back to the heuristic result.
    return base;
  }

  const droppedClaims = [...base.droppedClaims];
  const finalFindings: Finding[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const finding = candidates[i];
    const verdict = verdictsByIndex.get(i);

    if (!verdict) {
      finalFindings.push(finding);
      continue;
    }

    if (verdict.verdict === "unsupported") {
      droppedClaims.push(finding.claim);
      continue;
    }

    if (verdict.verdict === "partial") {
      finalFindings.push({
        ...finding,
        claim: verdict.rewrite?.trim() || finding.claim,
        confidence: Math.max(0.3, finding.confidence - 0.2),
      });
      continue;
    }

    finalFindings.push(finding);
  }

  return { findings: finalFindings, droppedClaims };
}
