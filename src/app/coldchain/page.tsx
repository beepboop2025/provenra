"use client";

import { useMemo, useState } from "react";
import { Snowflake, Thermometer, AlertTriangle, Droplets } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge, Card, CardHeader, Metric, Progress } from "@/components/ui/primitives";
import { TempProfileChart } from "@/components/charts/charts";
import { getData, sensorSeries } from "@/lib/data/engine";
import { formatDateTime, formatRelative, formatTemp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Shipment } from "@/lib/types";

export default function ColdChainPage() {
  const data = getData();
  const coldShipments = useMemo(
    () =>
      data.shipments
        .filter((s) => {
          const p = data.products.find((x) => x.id === s.productId);
          return p?.tempRange != null;
        })
        .sort((a, b) => b.excursionCount - a.excursionCount),
    [data]
  );

  const [selectedId, setSelectedId] = useState(coldShipments[0]?.id);
  const selected = coldShipments.find((s) => s.id === selectedId) ?? coldShipments[0];
  const product = data.products.find((p) => p.id === selected?.productId);
  const series = useMemo(() => (selected ? sensorSeries(selected) : []), [selected]);

  const liveBreaches = coldShipments.filter((s) => s.status === "exception").length;
  const freezeCount = data.excursions.filter((e) => e.kind === "freeze").length;
  const stabilityImpacted = data.excursions.filter((e) => e.stabilityImpacted).length;
  const inTolerance = coldShipments.length
    ? Math.round(
        ((coldShipments.length - liveBreaches) / coldShipments.length) * 100
      )
    : 100;

  const breachCount = series.filter((r) => r.breach).length;
  const avgHumidity = series.length
    ? Math.round(series.reduce((a, r) => a + r.humidity, 0) / series.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cold Chain Monitoring"
        subtitle="WHO-GDP temperature integrity for vaccines, biologics & insulin"
        icon={<Snowflake size={22} />}
      >
        {liveBreaches > 0 ? (
          <Badge tone="critical" pulse>
            {liveBreaches} live breach{liveBreaches > 1 ? "es" : ""}
          </Badge>
        ) : (
          <Badge tone="ok">In tolerance</Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric label="Cold-chain shipments" value={coldShipments.length} tone="info" />
        </Card>
        <Card className="p-4">
          <Metric label="Fleet in tolerance" value={`${inTolerance}%`} tone="ok" />
        </Card>
        <Card className="p-4">
          <Metric label="Freeze excursions" value={freezeCount} tone="critical" sub="silent biologic damage" />
        </Card>
        <Card className="p-4">
          <Metric label="Stability impacted" value={stabilityImpacted} tone="critical" sub="QA review required" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Shipment list */}
        <Card className="lg:col-span-1">
          <CardHeader title="Monitored Shipments" subtitle="Sorted by excursion count" />
          <ul className="max-h-[520px] overflow-auto">
            {coldShipments.map((s) => {
              const p = data.products.find((x) => x.id === s.productId);
              const active = s.id === selected?.id;
              const breaching = s.status === "exception";
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-surface-2)]/60"
                        : "border-transparent hover:bg-[var(--color-surface-2)]/30"
                    )}
                  >
                    <Thermometer
                      size={16}
                      className={breaching ? "text-[var(--color-critical)]" : "text-[var(--color-info)]"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p?.name}</p>
                      <p className="truncate text-xs text-[var(--color-faint)]">
                        {s.ref} · {s.origin.location.city}→{s.destination.location.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          breaching ? "text-[var(--color-critical)]" : "text-[var(--color-fg)]"
                        )}
                      >
                        {formatTemp(s.lastTemp)}
                      </div>
                      <div className="text-[10px] text-[var(--color-faint)]">
                        {s.tempRange.min}–{s.tempRange.max}°C
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Selected detail */}
        <Card className="lg:col-span-2">
          {selected && product ? (
            <>
              <CardHeader
                title={`${product.name} — ${selected.ref}`}
                subtitle={`${selected.carrier} · ${selected.units.toLocaleString("en-IN")} units · required ${selected.tempRange.min}–${selected.tempRange.max}°C`}
                icon={<Thermometer size={16} />}
                action={
                  <Badge
                    tone={
                      selected.status === "exception"
                        ? "critical"
                        : selected.status === "delayed"
                          ? "warn"
                          : "info"
                    }
                    pulse={selected.status === "exception"}
                  >
                    {selected.status.replace("_", " ")}
                  </Badge>
                }
              />
              <div className="p-4">
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Current temp" value={formatTemp(selected.lastTemp)} tone={selected.status === "exception" ? "critical" : "ok"} />
                  <Metric label="Excursions" value={selected.excursionCount} tone={selected.excursionCount ? "warn" : "ok"} />
                  <Metric label="Readings in breach" value={breachCount} tone={breachCount ? "danger" : "ok"} />
                  <Metric label="Avg humidity" value={`${avgHumidity}%`} />
                </div>
                <TempProfileChart data={series} range={selected.tempRange} />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted)]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded bg-[#38bdf8]" /> Sensor temperature
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded border border-dashed border-[#34d399] bg-[#34d39922]" />
                    Acceptable band
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Droplets size={12} /> Humidity logged at {series.length} points
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center p-8 text-sm text-[var(--color-muted)]">
              Select a shipment to inspect its temperature profile.
            </div>
          )}
        </Card>
      </div>

      {/* Excursion log */}
      <Card>
        <CardHeader
          title="Excursion Log"
          subtitle="Mean Kinetic Temperature (MKT) used to judge product impact"
          icon={<AlertTriangle size={16} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Shipment</th>
                <th className="px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Peak Δ</th>
                <th className="px-4 py-2 font-medium">MKT</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {data.excursions.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40"
                >
                  <td className="px-4 py-2.5 font-medium">{e.productName}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={e.kind === "freeze" ? "info" : "warn"}>
                      {e.kind === "freeze" ? "❄ freeze" : "heat"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-brand)]">{e.shipmentRef}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{formatRelative(e.startedAt)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">{e.durationMin} min</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs text-[var(--color-warn)]">
                    {e.kind === "freeze" ? "−" : "+"}{e.peakDeviation}°C
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">{e.mkt}°C</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={e.severity === "critical" ? "critical" : e.severity === "major" ? "warn" : "neutral"}>
                      {e.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {e.stabilityImpacted ? (
                      <span className="text-xs text-[var(--color-danger)]">Quarantine / QA</span>
                    ) : (
                      <span className="text-xs text-[var(--color-ok)]">Within stability budget</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
