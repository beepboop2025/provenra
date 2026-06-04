import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-brand)]/12 text-[var(--color-brand)]">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
