import { ChevronDown } from "lucide-react";

import { Card } from "@/web/components/ui/card";
import { Button } from "@/web/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/web/components/ui/collapsible";

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
    <Card className="px-4 py-3">
      <Collapsible open={!collapsed} onOpenChange={onToggleCollapsed}>
        <div className="flex items-center justify-between gap-3">
          <CollapsibleTrigger className="group flex min-w-0 items-center gap-2 text-left">
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                Checkpoint: {checkpoint} review
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Run <span className="font-mono">{runId}</span>
              </span>
            </span>
          </CollapsibleTrigger>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => onResume(checkpoint)}
          >
            Approve and continue
          </Button>
        </div>
        <CollapsibleContent className="mt-3 pl-6 text-xs text-muted-foreground">
          {note ?? "Review the checkpoint before continuing."}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
