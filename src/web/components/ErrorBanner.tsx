import { RotateCcw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/web/components/ui/alert";
import { Button } from "@/web/components/ui/button";

type ErrorBannerProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="mb-4 flex justify-start">
      <Alert variant="destructive" className="max-w-[85%]">
        <TriangleAlert />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          <span>{message}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-fit"
          >
            <RotateCcw data-icon="inline-start" />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
