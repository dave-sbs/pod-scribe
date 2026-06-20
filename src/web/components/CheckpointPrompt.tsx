type CheckpointPromptProps = {
  runId: string;
  checkpoint: "plan" | "synthesis";
  note?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onResume: (checkpoint: "plan" | "synthesis") => void;
};

export function CheckpointPrompt({
  runId,
  checkpoint,
  note,
  collapsed,
  onToggleCollapsed,
  onResume,
}: CheckpointPromptProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-card shadow-sm px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="min-w-0 flex items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-light text-accent text-xs">
            {collapsed ? ">" : "v"}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-text-primary">
              Checkpoint: {checkpoint} review
            </span>
            <span className="block truncate text-xs text-text-muted">
              Run <span className="font-mono">{runId}</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onResume(checkpoint)}
          className="flex-none rounded-lg bg-accent text-white px-3 py-1.5 text-xs hover:bg-accent-hover transition-colors"
        >
          Approve and continue
        </button>
      </div>
      {!collapsed && (
        <p className="text-xs text-text-secondary mt-3 pl-8">
          {note ?? "Review the checkpoint before continuing."}
        </p>
      )}
    </div>
  );
}
