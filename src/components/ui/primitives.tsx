import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Card ─────────────────────────────────────────────────────────────── */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "vc-card rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-[var(--color-brand)] shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-fg)] truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--color-muted)] truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── Badge ────────────────────────────────────────────────────────────── */

type Tone =
  | "neutral"
  | "brand"
  | "ok"
  | "warn"
  | "danger"
  | "critical"
  | "info"
  | "violet";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-muted)] border-[var(--color-border)]",
  brand: "bg-[var(--color-brand)]/12 text-[var(--color-brand)] border-[var(--color-brand)]/30",
  ok: "bg-[var(--color-ok)]/12 text-[var(--color-ok)] border-[var(--color-ok)]/30",
  warn: "bg-[var(--color-warn)]/12 text-[var(--color-warn)] border-[var(--color-warn)]/30",
  danger: "bg-[var(--color-danger)]/12 text-[var(--color-danger)] border-[var(--color-danger)]/30",
  critical: "bg-[var(--color-critical)]/15 text-[var(--color-critical)] border-[var(--color-critical)]/40",
  info: "bg-[var(--color-info)]/12 text-[var(--color-info)] border-[var(--color-info)]/30",
  violet: "bg-[var(--color-violet)]/12 text-[var(--color-violet)] border-[var(--color-violet)]/30",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  pulse,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        toneStyles[tone],
        className
      )}
    >
      {pulse && (
        <span className="vc-pulse inline-block h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}

/* ── Progress bar ─────────────────────────────────────────────────────── */

export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number; // 0–100
  tone?: Tone;
  className?: string;
}) {
  const fill: Record<Tone, string> = {
    neutral: "bg-[var(--color-muted)]",
    brand: "bg-[var(--color-brand)]",
    ok: "bg-[var(--color-ok)]",
    warn: "bg-[var(--color-warn)]",
    danger: "bg-[var(--color-danger)]",
    critical: "bg-[var(--color-critical)]",
    info: "bg-[var(--color-info)]",
    violet: "bg-[var(--color-violet)]",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]", className)}>
      <div
        className={cn("h-full rounded-full transition-all", fill[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ── Sparkline (dependency-free inline SVG) ──────────────────────────── */

export function Sparkline({
  data,
  color = "var(--color-brand)",
  width = 120,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = `M ${points.join(" L ")}`;
  const areaD = `${d} L ${width},${height} L 0,${height} Z`;
  const id = React.useId();
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── Section header ───────────────────────────────────────────────────── */

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-[11px] font-semibold uppercase tracking-widest text-[var(--color-faint)]",
        className
      )}
    >
      {children}
    </h2>
  );
}

/* ── Empty / stat helpers ─────────────────────────────────────────────── */

export function Metric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
}) {
  const color: Record<Tone, string> = {
    neutral: "text-[var(--color-fg)]",
    brand: "text-[var(--color-brand)]",
    ok: "text-[var(--color-ok)]",
    warn: "text-[var(--color-warn)]",
    danger: "text-[var(--color-danger)]",
    critical: "text-[var(--color-critical)]",
    info: "text-[var(--color-info)]",
    violet: "text-[var(--color-violet)]",
  };
  return (
    <div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className={cn("text-xl font-semibold tabular-nums", color[tone])}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-faint)]">{sub}</div>}
    </div>
  );
}
