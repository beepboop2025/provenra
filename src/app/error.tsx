"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-5">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 text-center shadow-[var(--shadow-panel)] backdrop-blur-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]">
          <AlertTriangle size={22} />
        </div>
        <h2 className="mt-4 text-base font-semibold text-[var(--color-fg)]">
          Something went wrong loading this page.
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          We&apos;ve logged the issue. You can try reloading the segment below.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-[var(--color-faint)]">
            digest {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[#04121a] transition-colors hover:bg-[var(--color-brand)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
