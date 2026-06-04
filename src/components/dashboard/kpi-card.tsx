import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, Sparkline } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/types";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  // A delta is "good" or "bad" depending on the metric's semantics.
  // e.g. for "On-Time delivery" up is good; for "Breaches" up is bad.
  const positive = kpi.delta >= 0;
  const isGood = kpi.deltaGood === "up" ? positive : !positive;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  const color = isGood ? "var(--color-ok)" : "var(--color-danger)";

  return (
    <Card className="vc-rise p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-muted)]">
          {kpi.label}
        </span>
        <span
          className="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums"
          style={{ color }}
        >
          <Arrow size={13} />
          {Math.abs(kpi.delta).toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tabular-nums tracking-tight">
          {kpi.value}
        </span>
        <Sparkline data={kpi.spark} color={color} width={84} height={30} />
      </div>
    </Card>
  );
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4")}>
      {kpis.map((k) => (
        <KpiCard key={k.label} kpi={k} />
      ))}
    </div>
  );
}
