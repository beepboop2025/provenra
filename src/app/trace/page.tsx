"use client";

import { useMemo, useState } from "react";
import {
  ScanLine,
  Search,
  ShieldCheck,
  ShieldAlert,
  Link2,
  MapPin,
  PackageCheck,
} from "lucide-react";
import { CommandShell } from "@/components/command/command-shell";
import { Badge, Card, CardHeader, Metric } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { SimulatedBanner } from "@/components/ui/simulated-banner";
import { DonutChart } from "@/components/charts/charts";
import { getData, chainOfCustody } from "@/lib/data/engine";
import { riskBand } from "@/lib/risk";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SerialStatus } from "@/lib/types";

const statusTone: Record<SerialStatus, "ok" | "info" | "warn" | "critical" | "neutral" | "brand"> = {
  commissioned: "neutral",
  in_transit: "info",
  at_facility: "brand",
  dispensed: "ok",
  recalled: "critical",
  suspect: "critical",
  decommissioned: "neutral",
};

const bandTone = {
  low: "ok",
  elevated: "warn",
  high: "danger",
  critical: "critical",
} as const;

export default function TracePage() {
  const data = getData();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [...data.serials].sort((a, b) => b.riskScore - a.riskScore);
    if (!q) return base.slice(0, 40);
    return base
      .filter((s) => {
        const batch = data.batches.find((b) => b.id === s.batchId);
        const product = data.products.find((p) => p.id === batch?.productId);
        return (
          s.serial.toLowerCase().includes(q) ||
          batch?.batchNo.toLowerCase().includes(q) ||
          product?.name.toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [query, data]);

  const [selectedId, setSelectedId] = useState(filtered[0]?.id);
  const selected = data.serials.find((s) => s.id === selectedId) ?? filtered[0];
  const selBatch = data.batches.find((b) => b.id === selected?.batchId);
  const selProduct = data.products.find((p) => p.id === selBatch?.productId);
  const events = useMemo(
    () => (selected ? chainOfCustody(selected, data.facilities) : []),
    [selected, data.facilities]
  );

  // status mix
  const statusMix = useMemo(() => {
    const m = new Map<SerialStatus, number>();
    for (const s of data.serials) m.set(s.status, (m.get(s.status) ?? 0) + 1);
    const colors: Record<string, string> = {
      dispensed: "#7fe0c2",
      in_transit: "#a1ecff",
      at_facility: "#7fc8e8",
      recalled: "#ff7a63",
      suspect: "#ff9d88",
      commissioned: "#8a99b0",
      decommissioned: "#5a6a82",
    };
    return [...m.entries()].map(([name, value]) => ({ name, value, color: colors[name] ?? "#5a6a82" }));
  }, [data.serials]);

  const suspectCount = data.serials.filter((s) => s.status === "suspect" || s.riskScore >= 70).length;

  if (data.serials.length === 0) {
    return (
      <CommandShell
        eyebrow="GS1 · Chain of custody"
        title="Track & Trace"
        subtitle="GS1 serialization, batch genealogy and anti-counterfeit intelligence"
        icon={<ScanLine size={22} />}
      >
        <EmptyState
          title="No serialized units"
          description="The trace dataset is empty. Seed data should populate serials, batches and products."
        />
      </CommandShell>
    );
  }

  return (
    <CommandShell
      eyebrow="GS1 · Chain of custody"
      title="Track & Trace"
      subtitle="GS1 serialization, batch genealogy and anti-counterfeit intelligence"
      icon={<ScanLine size={22} />}
      actions={
        <Badge tone={suspectCount ? "critical" : "ok"} pulse={suspectCount > 0}>
          {suspectCount} suspect units
        </Badge>
      }
    >
      <SimulatedBanner />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric label="Serialized units (sample)" value={data.serials.length} tone="brand" />
        </Card>
        <Card className="p-4">
          <Metric label="Batches in genealogy" value={data.batches.length} />
        </Card>
        <Card className="p-4">
          <Metric label="Recalled in field" value={data.serials.filter((s) => s.status === "recalled").length} tone="critical" />
        </Card>
        <Card className="p-4">
          <Metric label="Anti-counterfeit flags" value={suspectCount} tone="danger" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Serial explorer */}
        <Card className="lg:col-span-1">
          <CardHeader title="Serial Explorer" subtitle="Highest risk first" icon={<Search size={16} />} />
          <div className="border-b border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <Search size={15} className="text-[var(--color-faint)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Serial, batch or product…"
                className="w-full bg-transparent text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-faint)]"
              />
            </div>
          </div>
          <ul className="max-h-[460px] overflow-auto">
            {filtered.map((s) => {
              const batch = data.batches.find((b) => b.id === s.batchId);
              const product = data.products.find((p) => p.id === batch?.productId);
              const active = s.id === selected?.id;
              const band = riskBand(s.riskScore);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 border-l-2 px-4 py-2.5 text-left transition-colors",
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-surface-2)]/60"
                        : "border-transparent hover:bg-[var(--color-surface-2)]/30"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product?.name}</p>
                      <p className="truncate font-mono text-[10px] text-[var(--color-faint)]">{s.serial}</p>
                    </div>
                    <Badge tone={bandTone[band]}>{s.riskScore}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Detail: chain of custody + risk */}
        <Card className="lg:col-span-2">
          {selected && selProduct ? (
            <>
              <CardHeader
                title={`${selProduct.name} ${selProduct.strength}`}
                subtitle={`Batch ${selBatch?.batchNo} · GTIN ${selected.gtin}`}
                icon={<PackageCheck size={16} />}
                action={<Badge tone={statusTone[selected.status]}>{selected.status.replace("_", " ")}</Badge>}
              />
              <div className="p-4">
                {/* risk verdict */}
                <div
                  className={cn(
                    "mb-4 flex items-center gap-3 rounded-xl border p-3",
                    selected.riskScore >= 70
                      ? "border-[var(--color-critical)]/40 bg-[var(--color-critical)]/10"
                      : "border-[var(--color-ok)]/30 bg-[var(--color-ok)]/8"
                  )}
                >
                  {selected.riskScore >= 70 ? (
                    <ShieldAlert className="text-[var(--color-critical)]" size={28} />
                  ) : (
                    <ShieldCheck className="text-[var(--color-ok)]" size={28} />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {selected.riskScore >= 70
                        ? "Suspect — anomalous scan pattern detected"
                        : "Authentic — consistent chain of custody"}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Counterfeit risk score {selected.riskScore}/100 ({riskBand(selected.riskScore)})
                    </p>
                  </div>
                  <span className="font-mono text-3xl font-bold tabular-nums">
                    {selected.riskScore}
                  </span>
                </div>

                {/* chain of custody timeline */}
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-faint)]">
                  <Link2 size={13} /> Hash-Chained Chain of Custody
                </h4>
                <ol className="relative ml-2 space-y-4 border-l border-[var(--color-border)] pl-5">
                  {events.map((e, i) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[27px] grid h-4 w-4 place-items-center rounded-full bg-[var(--color-brand)]/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-sm font-medium capitalize">{e.step}</span>
                        <span className="text-[11px] text-[var(--color-faint)]">{formatDateTime(e.timestamp)}</span>
                      </div>
                      <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                        <MapPin size={11} /> {e.facilityName}, {e.location.city}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--color-faint)]">
                        hash {e.hash} ← prev {e.prevHash}
                      </p>
                      {i === events.length - 1 && (
                        <span className="mt-1 inline-block text-[10px] text-[var(--color-ok)]">
                          ✓ chain verified — no tampering detected
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center p-8 text-sm text-[var(--color-muted)]">
              Select a serial to trace its full genealogy.
            </div>
          )}
        </Card>
      </div>

      {/* status mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Unit Status Distribution" subtitle="Across the serialized sample" />
          <div className="p-4">
            <DonutChart data={statusMix} />
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {statusMix.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="truncate capitalize text-[var(--color-muted)]">{s.name.replace("_", " ")}</span>
                  <span className="ml-auto tabular-nums text-[var(--color-faint)]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="High-Risk Units" subtitle="Flagged by the anti-counterfeit engine for investigation" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                  <th className="px-4 py-2 font-medium">Serial</th>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {[...data.serials]
                  .filter((s) => s.riskScore >= 40)
                  .sort((a, b) => b.riskScore - a.riskScore)
                  .slice(0, 8)
                  .map((s) => {
                    const batch = data.batches.find((b) => b.id === s.batchId);
                    const product = data.products.find((p) => p.id === batch?.productId);
                    return (
                      <tr
                        key={s.id}
                        className="cursor-pointer border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40"
                        onClick={() => setSelectedId(s.id)}
                      >
                        <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-brand)]">{s.serial}</td>
                        <td className="px-4 py-2.5">{product?.name}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={statusTone[s.status]}>{s.status.replace("_", " ")}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={bandTone[riskBand(s.riskScore)]}>{s.riskScore}</Badge>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </CommandShell>
  );
}
