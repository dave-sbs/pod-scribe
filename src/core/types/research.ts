import type { SourceReference } from "./conversation";

export type InsightType = "topic" | "discourse";

// Desk keys are dynamically planned per query, so this is a free-form string.
// Template desk keys are provided as constants in the orchestrator.
export type DeskKey = string;

export type DeskPlan = {
  key: DeskKey;
  name: string;
  objective: string;
  subquestions: string[];
  insightType: InsightType;
};

export type ClarificationQuestion = {
  id: string;
  question: string;
  rationale?: string;
  options?: string[];
};

export type ClarificationAnswer = {
  id: string;
  question: string;
  answer: string;
};

export type ResearchPlan = {
  runId: string;
  query: string;
  mode: "brand" | "industry";
  objective: string;
  brief?: string;
  clarifications?: ClarificationAnswer[];
  targetEntity?: {
    id: number;
    name: string;
    type: "brand" | "person" | "org" | "other";
  };
  desks: DeskPlan[];
  createdAt: string;
};

export type FindingCitation = {
  episodeNumber: number | null;
  title: string;
  timestamp: string;
  url: string;
  quote?: string;
};

export type FindingEvidence = {
  quote: string;
  rationale?: string;
};

export type Finding = {
  desk: DeskKey;
  claim: string;
  evidence: FindingEvidence[];
  citations: FindingCitation[];
  confidence: number;
  insightType: InsightType;
  crossSourceRefs: string[];
};

export type DossierSection = {
  title: string;
  summary: string;
  findings: Finding[];
};

export type Dossier = {
  brandOrIndustry: string;
  worldview: string;
  sacredCows: string[];
  taboos: string[];
  sections: DossierSection[];
  contradictions: string[];
};

export type EngagementLexicon = {
  resonantLanguage: string[];
  avoidLanguage: string[];
  doSay: string[];
  neverSay: string[];
  outreachTips: string[];
};

export type DeepRunStatus =
  | "planning"
  | "running_desks"
  | "synthesizing"
  | "verifying"
  | "editing"
  | "completed"
  | "failed";

export type DeepRunState = {
  runId: string;
  query: string;
  status: DeepRunStatus;
  startedAt?: string;
  currentDeskIndex?: number;
  deskTotal?: number;
  plan?: ResearchPlan;
  findings: Finding[];
  synthesis?: string;
  dossier?: Dossier;
  lexicon?: EngagementLexicon;
  report?: string;
  sources?: SourceReference[];
  error?: string;
  updatedAt: string;
};
