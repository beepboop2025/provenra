import { Skeleton } from "@/components/ui/skeleton";

export default function IntelLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 pb-24 pt-10 lg:px-10">
      {/* Header placeholder */}
      <div className="space-y-3 py-8 text-center">
        <Skeleton className="mx-auto h-4 w-40" />
        <Skeleton className="mx-auto h-10 w-3/4 max-w-2xl" />
        <Skeleton className="mx-auto h-4 w-2/3 max-w-xl" />
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>

      {/* Briefing card */}
      <Skeleton className="h-48" />

      {/* Feed table */}
      <Skeleton className="h-80" />

      <p className="text-center text-[11px] text-[var(--color-faint)]">
        Collecting live pharma intelligence from openFDA and CDSCO…
      </p>
    </div>
  );
}
