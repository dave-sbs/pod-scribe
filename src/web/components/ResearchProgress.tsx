import { useEffect, useMemo, useState } from "react";
import type { DeepRunState, DeepRunStatus, DeskKey } from "@/core/types";

type ResearchProgressProps = {
  run?: DeepRunState;
};

const PHASES: Array<{
  status: DeepRunStatus;
  label: string;
  description: string;
}> = [
  {
    status: "planning",
    label: "Plan",
    description: "Resolve target and build desk plan",
  },
  {
    status: "running_desks",
    label: "Research desks",
    description: "Gather cited evidence by desk",
  },
  {
    status: "verifying",
    label: "Fact-check",
    description: "Challenge load-bearing claims",
  },
  {
    status: "synthesizing",
    label: "Synthesize",
    description: "Connect desks into one narrative",
  },
  {
    status: "editing",
    label: "Compose",
    description: "Assemble report, dossier, lexicon",
  },
];

const TERMINAL_STATUSES: DeepRunStatus[] = ["completed", "failed"];

function getPhaseIndex(status: DeepRunStatus): number {
  if (status === "completed") return PHASES.length;
  if (status === "failed") return -1;
  return PHASES.findIndex((phase) => phase.status === status);
}

function formatStatus(status: DeepRunStatus): string {
  return status.replace(/_/g, " ");
}

function formatElapsed(startedAt?: string, now = Date.now()): string {
  if (!startedAt) return "0:00";
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

export function ResearchProgress({ run }: ResearchProgressProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!run || TERMINAL_STATUSES.includes(run.status)) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [run?.runId, run?.status]);

  const deskNameByKey = useMemo(() => {
    const map = new Map<DeskKey, string>();
    for (const desk of run?.plan?.desks ?? []) {
      map.set(desk.key, desk.name);
    }
    return map;
  }, [run?.plan?.desks]);

  if (!run) return null;

  const target = run.plan?.targetEntity?.name ?? run.query;
  const phaseIndex = getPhaseIndex(run.status);
  const findingsByDesk = new Map<DeskKey, number>();
  for (const finding of run.findings) {
    findingsByDesk.set(finding.desk, (findingsByDesk.get(finding.desk) ?? 0) + 1);
  }

  return (
    <div className="max-w-[720px] mx-auto mb-4 rounded-2xl border border-border bg-bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="px-4 pt-4">
          <p className="text-[11px] uppercase tracking-wide text-text-muted">
            Deep research
          </p>
          <h3 className="mt-1 text-base font-semibold text-text-primary">
            {target}
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Run <span className="font-mono">{run.runId}</span>
          </p>
        </div>
        <div className="px-4 pt-4 text-right">
          <span className="inline-flex rounded-full bg-accent-light text-accent px-2.5 py-1 text-xs font-medium capitalize">
            {formatStatus(run.status)}
          </span>
          <p className="mt-1 text-xs text-text-muted">
            {formatElapsed(run.startedAt, now)}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-border-light mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {PHASES.map((phase, index) => {
            const isDone = phaseIndex > index || run.status === "completed";
            const isCurrent = phaseIndex === index;
            return (
              <div
                key={phase.status}
                className={`rounded-xl border px-3 py-2 ${
                  isCurrent
                    ? "border-accent bg-accent-light/40"
                    : isDone
                      ? "border-border bg-bg-secondary"
                      : "border-border-light bg-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      isDone
                        ? "bg-accent text-white"
                        : isCurrent
                          ? "bg-accent-light text-accent"
                          : "bg-bg-secondary text-text-muted"
                    }`}
                  >
                    {isDone ? "✓" : index + 1}
                  </span>
                  <p className="text-xs font-medium text-text-primary">
                    {phase.label}
                  </p>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-text-muted">
                  {phase.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 pb-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-primary">
              Research desks
            </p>
            <p className="text-[11px] text-text-muted">
              {run.currentDeskIndex ?? 0}/{run.deskTotal ?? run.plan?.desks.length ?? 0}
            </p>
          </div>
          <div className="space-y-2">
            {(run.plan?.desks ?? []).map((desk, index) => {
              const oneBasedIndex = index + 1;
              const deskFindings = findingsByDesk.get(desk.key) ?? 0;
              const isRunning =
                run.status === "running_desks" &&
                run.currentDeskIndex === oneBasedIndex;
              const isDone =
                run.status === "completed" ||
                deskFindings > 0 ||
                (run.currentDeskIndex ?? 0) > oneBasedIndex;
              return (
                <div
                  key={desk.key}
                  className="flex items-start gap-2 rounded-lg border border-border-light bg-bg-primary/40 px-3 py-2"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] ${
                      isDone
                        ? "bg-accent text-white"
                        : isRunning
                          ? "bg-accent-light text-accent animate-pulse"
                          : "bg-bg-secondary text-text-muted"
                    }`}
                  >
                    {isDone ? "✓" : isRunning ? "•" : oneBasedIndex}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary">
                      {desk.name}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {isRunning
                        ? "Running now"
                        : isDone
                          ? `${deskFindings || 1} finding${deskFindings === 1 ? "" : "s"} captured`
                          : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
            {(!run.plan?.desks || run.plan.desks.length === 0) && (
              <div className="rounded-lg border border-border-light bg-bg-primary/40 px-3 py-2">
                <p className="text-xs text-text-muted">
                  Building the desk plan...
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-primary">
              Live findings
            </p>
            <p className="text-[11px] text-text-muted">
              {run.findings.length} total
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border-light bg-bg-primary/40">
            {[...run.findings].reverse().map((finding, index) => (
              <div
                key={`${finding.desk}-${index}-${finding.claim}`}
                className="border-b border-border-light last:border-b-0 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-accent">
                    {deskNameByKey.get(finding.desk) ?? finding.desk}
                  </p>
                  <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-muted">
                    {Math.round(finding.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {truncate(finding.claim, 180)}
                </p>
              </div>
            ))}
            {run.findings.length === 0 && (
              <p className="px-3 py-4 text-xs text-text-muted">
                Findings will appear here as each research desk completes.
              </p>
            )}
          </div>
        </div>
      </div>

      {run.error && (
        <p className="px-4 pb-4 text-xs text-error">Error: {run.error}</p>
      )}
    </div>
  );
}
