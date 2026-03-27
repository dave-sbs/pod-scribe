type ErrorBannerProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] bg-error-light rounded-2xl rounded-bl-md px-5 py-4 border border-error/20">
        <p className="text-sm text-error font-medium mb-2">
          Something went wrong
        </p>
        <p className="text-sm text-error/80 mb-3">{message}</p>
        <button
          onClick={onRetry}
          className="text-sm font-medium text-error hover:text-error/80 underline underline-offset-2 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
