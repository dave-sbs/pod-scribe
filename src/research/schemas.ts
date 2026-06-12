import { z } from "zod";

// All structured agent outputs are validated against these schemas via
// `generateObject`. Models reference evidence ONLY by stable source ids
// (e.g. "S3"); they never author citation strings directly. Unknown ids are
// dropped downstream by the SourceRegistry, so citations cannot be fabricated
// during agent handoffs.

export const ClarificationQuestionSchema = z.object({
  id: z.string().describe("short stable id, e.g. 'scope' or 'audience'"),
  question: z.string().describe("the question to ask the user"),
  rationale: z
    .string()
    .optional()
    .describe("one short clause on why this matters for the research"),
  options: z
    .array(z.string())
    .optional()
    .describe("optional suggested answers the user can pick from"),
});

export const ClarificationQuestionsSchema = z.object({
  questions: z
    .array(ClarificationQuestionSchema)
    .describe("3-5 high-leverage scoping questions"),
});

export const PlannedDeskSchema = z.object({
  key: z
    .string()
    .describe("snake_case identifier unique within the plan, e.g. 'founding_origins'"),
  name: z.string().describe("human-readable desk name, e.g. 'Founding & origins desk'"),
  angle: z
    .string()
    .describe("the distinct investigative angle this desk owns, 1 sentence"),
  objective: z
    .string()
    .describe("what this desk must establish, grounded in the brief"),
  subquestions: z
    .array(z.string())
    .describe("3-5 concrete, separately-searchable questions"),
  insightType: z.enum(["topic", "discourse"]),
});

export const DeskPlanSchema = z.object({
  desks: z
    .array(PlannedDeskSchema)
    .describe("4-7 non-overlapping desks that together cover the brief"),
});

export const DeskClaimSchema = z.object({
  text: z
    .string()
    .describe("a specific, falsifiable claim — not a vague summary"),
  evidenceRefs: z
    .array(z.string())
    .describe("source ids (e.g. 'S2') that directly support this claim"),
  reasoning: z
    .string()
    .describe("why the cited evidence supports the claim, 1-2 sentences"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0-1 confidence given the strength of the evidence"),
});

export const DeskMemoSchema = z.object({
  summary: z
    .string()
    .describe("2-4 sentence analyst summary of what this desk found"),
  claims: z.array(DeskClaimSchema),
  tensions: z
    .array(z.string())
    .describe("contradictions or unresolved tensions surfaced by the evidence; [] if none"),
  absences: z
    .array(z.string())
    .describe("notable things the corpus is silent on for this angle; [] if none"),
});

export const SynthesisSectionSchema = z.object({
  heading: z.string(),
  // Markdown body. Claims must carry inline source-id markers like [S3] or
  // [S3, S7]. These are deterministically rewritten into citation chips.
  body: z.string().describe("markdown; cite evidence with [S#] markers"),
});

export const LexiconSchema = z.object({
  resonantLanguage: z.array(z.string()),
  avoidLanguage: z.array(z.string()),
  doSay: z.array(z.string()),
  neverSay: z.array(z.string()),
  outreachTips: z.array(z.string()),
});

export const SynthesisSchema = z.object({
  thesis: z
    .string()
    .describe("the single throughline of the entire investigation, with [S#] markers"),
  executiveSummary: z
    .string()
    .describe("3-5 sentence executive summary with [S#] markers"),
  sections: z
    .array(SynthesisSectionSchema)
    .describe("thematically-organized narrative that connects desks"),
  contradictions: z
    .array(z.string())
    .describe("cross-desk tensions worth flagging, with [S#] markers"),
  worldview: z.string().describe("how this brand/industry sees the world, with [S#] markers"),
  sacredCows: z.array(z.string()).describe("beliefs treated as non-negotiable"),
  taboos: z.array(z.string()).describe("things avoided or never said"),
  lexicon: LexiconSchema,
  implications: z
    .array(z.string())
    .describe("actionable implications / recommended next moves"),
});

export const VerificationVerdictSchema = z.object({
  index: z.number().describe("the index of the claim being judged"),
  verdict: z.enum(["supported", "partial", "unsupported"]),
  rewrite: z
    .string()
    .optional()
    .describe("for 'partial': a tightened claim the quotes DO support"),
});

export const VerificationSchema = z.object({
  verdicts: z.array(VerificationVerdictSchema),
});

export type VerificationOutput = z.infer<typeof VerificationSchema>;
export type ClarificationQuestionsOutput = z.infer<typeof ClarificationQuestionsSchema>;
export type DeskPlanOutput = z.infer<typeof DeskPlanSchema>;
export type DeskMemoOutput = z.infer<typeof DeskMemoSchema>;
export type DeskClaimOutput = z.infer<typeof DeskClaimSchema>;
export type SynthesisOutput = z.infer<typeof SynthesisSchema>;
