"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Map as MapIcon,
  BellRing,
  Snowflake,
  PackageSearch,
  ShieldAlert,
  ClipboardCheck,
  Warehouse,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiGrid } from "@/components/dashboard/kpi-card";
import { AlertFeed } from "@/components/dashboard/alert-feed";
import { NetworkMap } from "@/components/map/network-map";
import { DonutChart } from "@/components/charts/charts";
import { Badge, Card, CardHeader, Metric, Progress } from "@/components/ui/primitives";
import { getData } from "@/lib/data/engine";
import { overviewKpis } from "@/lib/kpis";
import { fefoPickRate, pickFillRate } from "@/lib/analytics";
import { THERAPEUTIC_COLORS } from "@/lib/data/seed";
import { formatCompact, formatDate } from "@/lib/format";

export default function CommandCenter() {
  const data = getData();
  const kpis = overviewKpis(data);

  // Category mix by units under management.
  const catMap = new Map<string, number>();
  for (const b of data.batches) {
    const p = data.products.find((x) => x.id === b.productId);
    if (!p) continue;
    catMap.set(p.therapeuticCategory, (catMap.get(p.therapeuticCategory) ?? 0) + b.quantity);
  }
  const catData = [...catMap.entries()]
    .map(([name, value]) => ({ name, value, color: THERAPEUTIC_COLORS[name] ?? "#5a6a82" }))
    .sort((a, b) => b.value - a.value);

  const topShortages = data.shortages.slice(0, 4);
  const openRecalls = data.recalls.filter((r) => r.status !== "completed").slice(0, 3);
  const criticalExcursions = data.excursions
    .filter((e) => e.severity !== "minor")
    .slice(0, 4);

  // QMS snapshot: open deviations, critical first then oldest.
  const sevRank = { critical: 0, major: 1, minor: 2 } as const;
  const openDeviations = data.deviations.filter((d) => d.status !== "closed");
  const overdueCapas = data.capas.filter((c) => c.status === "overdue");
  const topDeviations = [...openDeviations]
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.ageDays - a.ageDays)
    .slice(0, 4);

  // WMS snapshot: FEFO + fulfilment health.
  const fefoAccuracy = fefoPickRate(data.pickTasks);
  const fillRate = pickFillRate(data.pickTasks);
  const fefoViolations = data.pickTasks.filter((t) => !t.fefoCompliant && t.status !== "short").length;
  const shortPicks = data.pickTasks.filter((t) => t.status === "short").length;
  const activePicks = data.pickTasks.filter((t) => t.status === "picking" || t.status === "queued").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="Unified view across track & trace, cold chain, inventory and compliance"
        icon={<LayoutDashboard size={22} />}
      >
        <Badge tone="ok" pulse>
          All systems live
        </Badge>
      </PageHeader>

      <KpiGrid kpis={kpis} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="National Distribution Network"
            subtitle="Live shipments across India · manufacturing hubs and demand centers"
            icon={<MapIcon size={16} />}
            action={
              <Link
                href="/coldchain"
                className="flex items-center gap-1 text-xs text-[var(--color-brand)] hover:underline"
              >
                Cold chain <ArrowRight size={13} />
              </Link>
            }
          />
          <NetworkMap facilities={data.facilities} shipments={data.shipments} />
        </Card>

        {/* Alerts */}
        <Card className="flex flex-col">
          <CardHeader
            title="Priority Alerts"
            subtitle={`${data.alerts.filter((a) => !a.acknowledged).length} active`}
            icon={<BellRing size={16} />}
          />
          <div className="flex-1 overflow-auto">
            <AlertFeed alerts={data.alerts} limit={7} />
          </div>
        </Card>
      </div>

      {/* Module snapshots */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Cold-Chain Excursions"
            subtitle="Highest severity, unresolved"
            icon={<Snowflake size={16} />}
            action={<Link href="/coldchain" className="text-xs text-[var(--color-brand)] hover:underline">View</Link>}
          />
          <ul className="divide-y divide-[var(--color-border)]">
            {criticalExcursions.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.productName}</p>
                  <p className="text-xs text-[var(--color-faint)]">
                    {e.shipmentRef} · MKT {e.mkt}°C · {e.durationMin}min
                  </p>
                </div>
                <Badge tone={e.severity === "critical" ? "critical" : "warn"}>
                  +{e.peakDeviation}°C
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Shortage Watchlist"
            subtitle="Predicted stockout risk"
            icon={<PackageSearch size={16} />}
            action={<Link href="/inventory" className="text-xs text-[var(--color-brand)] hover:underline">View</Link>}
          />
          <ul className="divide-y divide-[var(--color-border)]">
            {topShortages.map((s) => (
              <li key={s.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {s.productName}
                    {s.essential && (
                      <span className="ml-1.5 text-[10px] text-[var(--color-warn)]">NLEM</span>
                    )}
                  </p>
                  <span className="text-xs font-semibold tabular-nums text-[var(--color-danger)]">
                    {s.riskScore}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress
                    value={s.riskScore}
                    tone={s.riskScore >= 80 ? "critical" : "warn"}
                  />
                  <span className="shrink-0 text-[10px] text-[var(--color-faint)]">
                    {formatDate(s.projectedStockout)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Active Recalls"
            subtitle="Retrieval progress"
            icon={<ShieldAlert size={16} />}
            action={<Link href="/compliance" className="text-xs text-[var(--color-brand)] hover:underline">View</Link>}
          />
          <ul className="divide-y divide-[var(--color-border)]">
            {openRecalls.length ? (
              openRecalls.map((r) => {
                const pct = Math.round((r.retrievedUnits / r.affectedUnits) * 100);
                return (
                  <li key={r.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.productName}</p>
                      <Badge tone={r.recallClass === "I" ? "critical" : "warn"}>
                        Class {r.recallClass}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={pct} tone="info" />
                      <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-faint)]">
                        {pct}%
                      </span>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">
                No active recalls
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* QMS & WMS snapshots */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Quality Actions (QMS)"
            subtitle={`${openDeviations.length} open deviations · ${overdueCapas.length} overdue CAPAs`}
            icon={<ClipboardCheck size={16} />}
            action={<Link href="/qms" className="text-xs text-[var(--color-brand)] hover:underline">View</Link>}
          />
          <ul className="divide-y divide-[var(--color-border)]">
            {topDeviations.length ? (
              topDeviations.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-[11px] text-[var(--color-faint)]">
                      {d.ref} · {d.source} · {d.ageDays}d open
                    </p>
                  </div>
                  <Badge tone={d.severity === "critical" ? "critical" : d.severity === "major" ? "danger" : "warn"}>
                    {d.severity}
                  </Badge>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">No open deviations</li>
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Warehouse Throughput (WMS)"
            subtitle="FEFO compliance and order fulfilment"
            icon={<Warehouse size={16} />}
            action={<Link href="/warehouse" className="text-xs text-[var(--color-brand)] hover:underline">View</Link>}
          />
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="FEFO accuracy" value={`${fefoAccuracy}%`} tone={fefoAccuracy >= 95 ? "ok" : "warn"} />
              <Metric label="Fill rate" value={`${fillRate}%`} tone={fillRate >= 95 ? "ok" : "warn"} />
              <Metric label="Active picks" value={activePicks} tone="info" />
              <Metric label="Short picks" value={shortPicks} tone={shortPicks ? "danger" : "ok"} />
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                <span>FEFO compliance</span>
                <span className="tabular-nums">{fefoViolations} violation{fefoViolations === 1 ? "" : "s"}</span>
              </div>
              <Progress value={fefoAccuracy} tone={fefoAccuracy >= 95 ? "ok" : fefoAccuracy >= 85 ? "warn" : "critical"} />
            </div>
          </div>
        </Card>
      </div>

      {/* Portfolio mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Portfolio by Therapeutic Area" subtitle="Units under management" />
          <div className="p-4">
            <DonutChart data={catData.slice(0, 6)} />
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {catData.slice(0, 6).map((c) => (
                <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  <span className="truncate text-[var(--color-muted)]">{c.name}</span>
                  <span className="ml-auto tabular-nums text-[var(--color-faint)]">
                    {formatCompact(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="In-Transit Shipments"
            subtitle="Real-time consignment status"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                  <th className="px-4 py-2 font-medium">Ref</th>
                  <th className="px-4 py-2 font-medium">Route</th>
                  <th className="px-4 py-2 font-medium">Carrier</th>
                  <th className="px-4 py-2 font-medium">Progress</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.shipments
                  .filter((s) => s.status !== "delivered")
                  .slice(0, 7)
                  .map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-brand)]">
                        {s.ref}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">
                        {s.origin.location.city} → {s.destination.location.city}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">
                        {s.carrier.split(" ")[0]}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex w-28 items-center gap-2">
                          <Progress value={s.progress * 100} />
                          <span className="text-[10px] tabular-nums text-[var(--color-faint)]">
                            {Math.round(s.progress * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={
                            s.status === "exception"
                              ? "critical"
                              : s.status === "delayed"
                                ? "warn"
                                : "info"
                          }
                        >
                          {s.status.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
