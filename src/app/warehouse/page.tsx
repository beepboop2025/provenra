"use client";

import { useMemo, useState } from "react";
import {
  Warehouse,
  ScanBarcode,
  Truck,
  ArrowDownToLine,
  Snowflake,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { CommandShell } from "@/components/command/command-shell";
import { Badge, Card, CardHeader, Metric, Progress } from "@/components/ui/primitives";
import { getData } from "@/lib/data/engine";
import { fefoPickRate, pickFillRate } from "@/lib/analytics";
import { formatNumber, shelfLifeLabel, formatRelative, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PickStatus, WarehouseZone } from "@/lib/types";

const zoneMeta: Record<WarehouseZone, { label: string; tone: "info" | "brand" | "violet" | "warn" | "neutral" }> = {
  ambient: { label: "Ambient", tone: "neutral" },
  cold: { label: "Cold 2–8°C", tone: "info" },
  frozen: { label: "Frozen −25°C", tone: "violet" },
  quarantine: { label: "Quarantine", tone: "warn" },
  dispatch: { label: "Dispatch", tone: "brand" },
};

const pickTone: Record<PickStatus, "neutral" | "info" | "brand" | "violet" | "ok" | "critical"> = {
  queued: "neutral",
  picking: "info",
  picked: "brand",
  staged: "violet",
  dispatched: "ok",
  short: "critical",
};

export default function WarehousePage() {
  const data = getData();
  const [onlyViolations, setOnlyViolations] = useState(false);

  const fefoAccuracy = fefoPickRate(data.pickTasks);
  const fillRate = pickFillRate(data.pickTasks);
  const shortPicks = data.pickTasks.filter((t) => t.status === "short");
  const violations = data.pickTasks.filter((t) => !t.fefoCompliant && t.status !== "short");
  const coldPicks = data.pickTasks.filter((t) => t.zone === "cold" || t.zone === "frozen").length;
  const pendingPutaway = data.putawayTasks.filter((t) => t.status !== "stored").length;

  const picks = useMemo(
    () => (onlyViolations ? data.pickTasks.filter((t) => !t.fefoCompliant) : data.pickTasks),
    [data.pickTasks, onlyViolations]
  );

  return (
    <CommandShell
      eyebrow="FEFO execution"
      title="Warehouse Management"
      subtitle="FEFO-enforced picking, zoned putaway and dispatch — the physical execution layer"
      icon={<Warehouse size={22} />}
      actions={
        <Badge tone={fefoAccuracy >= 95 ? "ok" : fefoAccuracy >= 85 ? "warn" : "critical"} pulse>
          FEFO accuracy {fefoAccuracy}%
        </Badge>
      }
    >

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric label="FEFO pick accuracy" value={`${fefoAccuracy}%`} tone={fefoAccuracy >= 95 ? "ok" : "warn"} sub={`${violations.length} violations`} />
        </Card>
        <Card className="p-4">
          <Metric label="Pick fill rate" value={`${fillRate}%`} tone={fillRate >= 95 ? "ok" : "warn"} sub="units picked / ordered" />
        </Card>
        <Card className="p-4">
          <Metric label="Short picks" value={shortPicks.length} tone={shortPicks.length ? "danger" : "ok"} sub="stock unavailable" />
        </Card>
        <Card className="p-4">
          <Metric label="Cold-chain picks" value={coldPicks} tone="info" sub={`${pendingPutaway} putaway pending`} />
        </Card>
      </div>

      {/* FEFO pick queue */}
      <Card>
        <CardHeader
          title="Pick Queue — FEFO Enforced"
          subtitle="Each task must pull the earliest-expiry batch; violations strand older stock for write-off"
          icon={<ScanBarcode size={16} />}
          action={
            <button
              onClick={() => setOnlyViolations((v) => !v)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                onlyViolations
                  ? "border-[var(--color-critical)]/40 bg-[var(--color-critical)]/10 text-[var(--color-critical)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
              )}
            >
              {onlyViolations ? "Showing FEFO violations" : "Show FEFO violations only"}
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                <th className="px-4 py-2 font-medium">Pick</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Batch · expiry</th>
                <th className="px-4 py-2 font-medium">Zone</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">FEFO</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Picker</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((t) => (
                <tr
                  key={t.id}
                  className={cn(
                    "border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40",
                    !t.fefoCompliant && "bg-[var(--color-critical)]/5"
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-brand)]">{t.ref}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-muted)]">{t.orderRef}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{t.productName}</p>
                    <p className="text-[11px] capitalize text-[var(--color-faint)]">{t.priority.replace("_", " ")} · {t.destination}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-[11px] text-[var(--color-muted)]">{t.batchNo}</p>
                    <p className="text-[11px] text-[var(--color-faint)]">{shelfLifeLabel(t.expiryDate)}</p>
                  </td>
                  <td className="px-4 py-2.5"><Badge tone={zoneMeta[t.zone].tone}>{zoneMeta[t.zone].label}</Badge></td>
                  <td className="px-4 py-2.5">
                    <div className="flex w-24 items-center gap-2">
                      <Progress value={(t.qtyPicked / t.qtyOrdered) * 100} tone={t.status === "short" ? "critical" : "brand"} />
                      <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-faint)]">{formatNumber(t.qtyOrdered)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {t.fefoCompliant ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ok)]"><CheckCircle2 size={13} /> ok</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-critical)]"><AlertTriangle size={13} /> violation</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5"><Badge tone={pickTone[t.status]}>{t.status}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{t.picker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Putaway */}
        <Card>
          <CardHeader
            title="Inbound Putaway"
            subtitle="Received goods routed to the correct temperature zone"
            icon={<ArrowDownToLine size={16} />}
          />
          <ul className="max-h-[420px] divide-y divide-[var(--color-border)] overflow-auto">
            {data.putawayTasks.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.productName}</p>
                  <p className="font-mono text-[11px] text-[var(--color-faint)]">
                    {p.ref} · {p.batchNo} · {formatNumber(p.units)} units
                  </p>
                  <p className="text-[11px] text-[var(--color-faint)]">received {formatRelative(p.receivedAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={zoneMeta[p.suggestedZone].tone}>
                    {(p.suggestedZone === "cold" || p.suggestedZone === "frozen") && <Snowflake size={11} />}
                    {zoneMeta[p.suggestedZone].label}
                  </Badge>
                  <Badge tone={p.status === "stored" ? "ok" : p.status === "in_progress" ? "info" : "neutral"}>
                    {p.status.replace("_", " ")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Dispatch lanes */}
        <Card>
          <CardHeader
            title="Dispatch Docks"
            subtitle="Outbound lanes and cut-off times"
            icon={<Truck size={16} />}
          />
          <ul className="max-h-[420px] divide-y divide-[var(--color-border)] overflow-auto">
            {data.dispatchLanes.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)]/12 text-xs font-bold text-[var(--color-brand)]">
                    {l.dock.replace("Dock ", "")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {l.destination}
                      {l.coldChain && <Snowflake size={12} className="ml-1 inline text-[var(--color-info)]" />}
                    </p>
                    <p className="text-[11px] text-[var(--color-faint)]">
                      {l.carrier} · {formatNumber(l.units)} units · cut-off {formatDateTime(l.cutoff)}
                    </p>
                  </div>
                </div>
                <Badge tone={l.status === "departed" ? "ok" : l.status === "staged" ? "violet" : "info"}>
                  {l.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </CommandShell>
  );
}
