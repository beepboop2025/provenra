import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 text-center shadow-[var(--shadow-panel)] backdrop-blur-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
          <Compass size={22} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[var(--color-fg)]">
          404
        </h1>
        <p className="mt-2 text-base font-medium text-[var(--color-fg)]">
          Page not found
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[#04121a] transition-colors hover:bg-[var(--color-brand)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
