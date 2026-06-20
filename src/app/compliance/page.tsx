"use client";

import { ShieldCheck, Recycle, Factory, FileCheck2, Info, ClipboardCheck } from "lucide-react";
import { TexturaShell } from "@/components/command/textura-shell";
import { Badge, Card, CardHeader, Metric, Progress } from "@/components/ui/primitives";
import { getData } from "@/lib/data/engine";
import { formatDate, formatNumber, formatPct, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ComplianceRequirement, SupplierTier } from "@/lib/types";

const reqTone: Record<ComplianceRequirement["status"], "ok" | "warn" | "critical"> = {
  compliant: "ok",
  at_risk: "warn",
  non_compliant: "critical",
};

const tierTone: Record<SupplierTier, "brand" | "ok" | "warn" | "danger"> = {
  critical: "brand",
  preferred: "ok",
  approved: "warn",
  probation: "danger",
};

export default function CompliancePage() {
  const data = getData();

  const openRecalls = data.recalls.filter((r) => r.status !== "completed");
  const classI = data.recalls.filter((r) => r.recallClass === "I").length;
  const totalAffected = data.recalls.reduce((a, r) => a + r.affectedUnits, 0);
  const totalRetrieved = data.recalls.reduce((a, r) => a + r.retrievedUnits, 0);
  const retrievalRate = totalAffected ? (totalRetrieved / totalAffected) * 100 : 0;

  const atRiskReqs = data.requirements.filter((r) => r.status !== "compliant").length;
  const highRiskSuppliers = data.suppliers.filter((s) => s.riskScore >= 50).length;

  // Schedule M GMP readiness (India suppliers). Research: deadline 31 Dec 2025;
  // only ~26% of MSME units had even filed a gap analysis by late 2025.
  const inSuppliers = data.suppliers.filter((s) => s.market === "IN");
  const gmpBuckets = {
    compliant: inSuppliers.filter((s) => s.gmpReadiness === "compliant").length,
    gap_filed: inSuppliers.filter((s) => s.gmpReadiness === "gap_filed").length,
    in_progress: inSuppliers.filter((s) => s.gmpReadiness === "in_progress").length,
    not_started: inSuppliers.filter((s) => s.gmpReadiness === "not_started").length,
  };
  const gmpReadyPct = inSuppliers.length
    ? Math.round((gmpBuckets.compliant / inSuppliers.length) * 100)
    : 0;

  return (
    <TexturaShell
      eyebrow="Recalls · Schedule M · DSCSA"
      title="Recall & Compliance"
      subtitle="Recall orchestration, supplier risk and multi-market regulatory posture"
      icon={<ShieldCheck size={22} />}
      actions={
        <Badge tone={classI ? "critical" : "ok"} pulse={classI > 0}>
          {classI} Class I recall{classI === 1 ? "" : "s"}
        </Badge>
      }
    >

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric label="Open recalls" value={openRecalls.length} tone="warn" />
        </Card>
        <Card className="p-4">
          <Metric label="Avg retrieval rate" value={formatPct(retrievalRate)} tone={retrievalRate > 80 ? "ok" : "warn"} />
        </Card>
        <Card className="p-4">
          <Metric label="Compliance gaps" value={atRiskReqs} tone="critical" sub="across markets" />
        </Card>
        <Card className="p-4">
          <Metric label="High-risk suppliers" value={highRiskSuppliers} tone="danger" />
        </Card>
      </div>

      {/* Recalls */}
      <Card>
        <CardHeader
          title="Recall Tracker"
          subtitle="Live retrieval progress with regulatory classification"
          icon={<Recycle size={16} />}
        />
        <div className="flex items-start gap-2 border-b border-[var(--color-border)] bg-[var(--color-warn)]/5 px-4 py-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-[var(--color-warn)]" />
          <p className="text-[11px] text-[var(--color-muted)]">
            India has <span className="font-medium text-[var(--color-fg)]">no mandatory nationwide drug-recall law</span> —
            a batch failing in one state has no enforceable national withdrawal pathway. VitalChain operationalizes
            de-facto nationwide recall via cross-state batch traceability and coordinated notification.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                <th className="px-4 py-2 font-medium">Reference</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Markets</th>
                <th className="px-4 py-2 font-medium">Spread</th>
                <th className="px-4 py-2 font-medium">Retrieval</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recalls.map((r) => {
                const pct = Math.round((r.retrievedUnits / r.affectedUnits) * 100);
                return (
                  <tr key={r.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40">
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-brand)]">{r.ref}</td>
                    <td className="px-4 py-2.5 font-medium">{r.productName}</td>
                    <td className="px-4 py-2.5 max-w-[260px] text-xs text-[var(--color-muted)]">{r.reason}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.recallClass === "I" ? "critical" : r.recallClass === "II" ? "warn" : "neutral"}>
                        Class {r.recallClass}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{r.markets.join(", ")}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs tabular-nums text-[var(--color-fg)]">
                        {r.affectedStates.length} states
                      </span>
                      <div className="mt-0.5">
                        {r.nationwideCoordination ? (
                          <span className="text-[10px] text-[var(--color-ok)]">✓ coordinated</span>
                        ) : (
                          <span className="text-[10px] text-[var(--color-danger)]">⨯ uncoordinated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex w-32 items-center gap-2">
                        <Progress value={pct} tone={pct > 80 ? "ok" : "info"} />
                        <span className="text-[10px] tabular-nums text-[var(--color-faint)]">{pct}%</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-faint)]">
                        {formatNumber(r.retrievedUnits)} / {formatNumber(r.affectedUnits)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.status === "completed" ? "ok" : r.status === "in_progress" ? "info" : "warn"}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Supplier risk */}
        <Card>
          <CardHeader
            title="Supplier Risk Register"
            subtitle="Composite quality / delivery / audit risk"
            icon={<Factory size={16} />}
          />
          <ul className="max-h-[420px] divide-y divide-[var(--color-border)] overflow-auto">
            {data.suppliers.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-[var(--color-faint)]">
                      {s.market} · OTIF {formatPct(s.onTimeDelivery)} · reject {formatPct(s.qualityRejectRate)} · {s.openCapas} CAPAs
                      {s.nsqFlags > 0 && (
                        <span className="ml-1 text-[var(--color-danger)]">· {s.nsqFlags} NSQ</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={tierTone[s.tier]}>{s.tier}</Badge>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        s.riskScore >= 50 ? "text-[var(--color-danger)]" : s.riskScore >= 30 ? "text-[var(--color-warn)]" : "text-[var(--color-ok)]"
                      )}
                    >
                      {s.riskScore}
                    </span>
                  </div>
                </div>
                <Progress
                  className="mt-2"
                  value={s.riskScore}
                  tone={s.riskScore >= 50 ? "danger" : s.riskScore >= 30 ? "warn" : "ok"}
                />
                <p className="mt-1 text-[10px] text-[var(--color-faint)]">
                  Last audited {formatRelative(s.lastAuditAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        {/* Regulatory requirements */}
        <Card>
          <CardHeader
            title="Regulatory Posture"
            subtitle="India-first, multi-market readiness"
            icon={<FileCheck2 size={16} />}
          />
          <ul className="max-h-[420px] divide-y divide-[var(--color-border)] overflow-auto">
            {data.requirements.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{r.market}</Badge>
                      <span className="text-sm font-medium">{r.framework}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{r.title}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-faint)]">
                      Owner: {r.owner} · due {formatDate(r.dueDate)}
                    </p>
                  </div>
                  <Badge tone={reqTone[r.status]}>{r.status.replace("_", " ")}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Schedule M GMP readiness tracker */}
      <Card>
        <CardHeader
          title="Revised Schedule M GMP Readiness"
          subtitle="India MSME compliance deadline 31 Dec 2025 — only ~26% had filed a gap analysis"
          icon={<ClipboardCheck size={16} />}
          action={
            <Badge tone={gmpReadyPct >= 60 ? "ok" : "warn"}>{gmpReadyPct}% compliant</Badge>
          }
        />
        <div className="grid gap-4 p-4 lg:grid-cols-4">
          <GmpStat label="Compliant" value={gmpBuckets.compliant} tone="ok" />
          <GmpStat label="Gap analysis filed" value={gmpBuckets.gap_filed} tone="info" />
          <GmpStat label="Upgrade in progress" value={gmpBuckets.in_progress} tone="warn" />
          <GmpStat label="Not started" value={gmpBuckets.not_started} tone="critical" />
        </div>
        <div className="border-t border-[var(--color-border)]">
          <ul className="divide-y divide-[var(--color-border)]">
            {inSuppliers
              .filter((s) => s.gmpReadiness !== "compliant")
              .slice(0, 6)
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-[var(--color-faint)]">
                      {s.tier} · risk {s.riskScore}
                      {s.nsqFlags > 0 && <span className="text-[var(--color-danger)]"> · {s.nsqFlags} NSQ</span>}
                    </p>
                  </div>
                  <Badge
                    tone={
                      s.gmpReadiness === "not_started"
                        ? "critical"
                        : s.gmpReadiness === "in_progress"
                          ? "warn"
                          : "info"
                    }
                  >
                    {s.gmpReadiness.replace("_", " ")}
                  </Badge>
                </li>
              ))}
          </ul>
        </div>
      </Card>
    </TexturaShell>
  );
}

function GmpStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "info" | "warn" | "critical";
}) {
  const color = {
    ok: "text-[var(--color-ok)]",
    info: "text-[var(--color-info)]",
    warn: "text-[var(--color-warn)]",
    critical: "text-[var(--color-critical)]",
  }[tone];
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 p-3">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
