import type { ReactNode } from "react";
import { FileX } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title = "No data available",
  description,
  icon,
  className,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)]/50 p-8 text-center",
        className
      )}
    >
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
        {icon ?? <FileX size={20} />}
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-fg)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-[var(--color-muted)]">{description}</p>
      )}
    </div>
  );
}
