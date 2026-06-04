"use client";

import {
  Snowflake,
  PackageSearch,
  ShieldCheck,
  ScanLine,
  AlertTriangle,
  FlaskConical,
} from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { formatRelative } from "@/lib/format";
import type { Alert, AlertModule } from "@/lib/types";

const moduleIcon: Record<AlertModule, React.ComponentType<{ size?: number }>> = {
  trace: ScanLine,
  coldchain: Snowflake,
  inventory: PackageSearch,
  compliance: ShieldCheck,
  quality: FlaskConical,
};

const sevTone = {
  info: "info",
  warning: "warn",
  critical: "critical",
} as const;

export function AlertFeed({ alerts, limit }: { alerts: Alert[]; limit?: number }) {
  const list = limit ? alerts.slice(0, limit) : alerts;

  if (!list.length) {
    return (
      <div className="grid place-items-center gap-2 py-10 text-center">
        <ShieldCheck className="text-[var(--color-ok)]" size={28} />
        <p className="text-sm text-[var(--color-muted)]">
          No active alerts. Supply chain operating within tolerance.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {list.map((a) => {
        const Icon = moduleIcon[a.module] ?? AlertTriangle;
        const iconTone =
          a.severity === "critical"
            ? "bg-[var(--color-critical)]/15 text-[var(--color-critical)]"
            : a.severity === "warning"
              ? "bg-[var(--color-warn)]/12 text-[var(--color-warn)]"
              : "bg-[var(--color-info)]/12 text-[var(--color-info)]";
        return (
          <li key={a.id} className="flex gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]/40">
            <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconTone}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-[var(--color-fg)]">
                  {a.title}
                </p>
                <Badge tone={sevTone[a.severity]}>{a.severity}</Badge>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">
                {a.detail}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-faint)]">
                {formatRelative(a.timestamp)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
