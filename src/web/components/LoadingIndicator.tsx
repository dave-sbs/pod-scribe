import { Spinner } from "@/web/components/ui/spinner";

type LoadingIndicatorProps = {
  phase: "searching" | "generating";
};

export function LoadingIndicator({ phase }: LoadingIndicatorProps) {
  return (
    <div className="mb-4 flex justify-start">
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Spinner />
        <span>
          {phase === "searching"
            ? "Searching corpus…"
            : "Generating response…"}
        </span>
      </div>
    </div>
  );
}
