"use client";

import { ShieldCheck, Recycle, Factory, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recall & Compliance"
        subtitle="Recall orchestration, supplier risk and multi-market regulatory posture"
        icon={<ShieldCheck size={22} />}
      >
        <Badge tone={classI ? "critical" : "ok"} pulse={classI > 0}>
          {classI} Class I recall{classI === 1 ? "" : "s"}
        </Badge>
      </PageHeader>

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                <th className="px-4 py-2 font-medium">Reference</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Markets</th>
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
                      {s.market} · OTIF {formatPct(s.onTimeDelivery)} · reject {formatPct(s.qualityRejectRate)} · {s.openCapas} open CAPAs
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
    </div>
  );
}
