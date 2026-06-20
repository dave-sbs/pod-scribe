import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { DeepRunState, DeepRunStatus, DeskKey } from "@/core/types";
import { Card } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import { cn } from "@/web/lib/utils";

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
  return `${value.slice(0, maxLength - 1)}…`;
}

const stepBase =
  "flex size-5 flex-none items-center justify-center rounded-full text-[10px] [&>svg]:size-3";

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
    <Card className="mx-auto mb-4 max-w-[720px] gap-0 overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Deep research
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {target}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Run <span className="font-mono">{run.runId}</span>
          </p>
        </div>
        <div className="text-right">
          <Badge variant="secondary" className="capitalize">
            {formatStatus(run.status)}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatElapsed(run.startedAt, now)}
          </p>
        </div>
      </div>

      <div className="border-t p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {PHASES.map((phase, index) => {
            const isDone = phaseIndex > index || run.status === "completed";
            const isCurrent = phaseIndex === index;
            return (
              <div
                key={phase.status}
                className={cn(
                  "rounded-md border px-3 py-2",
                  isCurrent
                    ? "border-foreground/30 bg-muted"
                    : isDone
                      ? "bg-muted/50"
                      : "bg-transparent"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      stepBase,
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                          ? "bg-foreground/15 text-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check /> : index + 1}
                  </span>
                  <p className="text-xs font-medium text-foreground">
                    {phase.label}
                  </p>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {phase.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 pt-0 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              Research desks
            </p>
            <p className="text-[11px] text-muted-foreground">
              {run.currentDeskIndex ?? 0}/{run.deskTotal ?? run.plan?.desks.length ?? 0}
            </p>
          </div>
          <div className="flex flex-col gap-2">
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
                  className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2"
                >
                  <span
                    className={cn(
                      "mt-0.5",
                      stepBase,
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isRunning
                          ? "animate-pulse bg-foreground/15 text-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check /> : isRunning ? "•" : oneBasedIndex}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {desk.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
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
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Building the desk plan…
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              Live findings
            </p>
            <p className="text-[11px] text-muted-foreground">
              {run.findings.length} total
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/40">
            {[...run.findings].reverse().map((finding, index) => (
              <div
                key={`${finding.desk}-${index}-${finding.claim}`}
                className="border-b px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-foreground">
                    {deskNameByKey.get(finding.desk) ?? finding.desk}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {Math.round(finding.confidence * 100)}%
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {truncate(finding.claim, 180)}
                </p>
              </div>
            ))}
            {run.findings.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                Findings will appear here as each research desk completes.
              </p>
            )}
          </div>
        </div>
      </div>

      {run.error && (
        <p className="px-4 pb-4 text-xs text-destructive">Error: {run.error}</p>
      )}
    </Card>
  );
}
