type LoadingIndicatorProps = {
  phase: "searching" | "generating";
};

export function LoadingIndicator({ phase }: LoadingIndicatorProps) {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-bg-card rounded-2xl rounded-bl-md px-5 py-4 shadow-sm border border-border-light">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-sm text-text-secondary">
            {phase === "searching"
              ? "Searching corpus..."
              : "Generating response..."}
          </span>
        </div>
      </div>
    </div>
  );
}
