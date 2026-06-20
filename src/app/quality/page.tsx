"use client";

import { FlaskConical, AlertOctagon, Beaker, ShieldX, Info } from "lucide-react";
import { TexturaShell } from "@/components/command/textura-shell";
import { Badge, Card, CardHeader, Metric } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts/charts";
import { getData } from "@/lib/data/engine";
import { formatNumber } from "@/lib/format";
import type { QualityDefect } from "@/lib/types";

const defectLabel: Record<QualityDefect, string> = {
  nsq: "NSQ",
  spurious: "Spurious",
  deg_eg: "DEG/EG",
  nitrosamine: "Nitrosamine",
  adulterated: "Adulterated",
};

const defectTone: Record<QualityDefect, "warn" | "critical" | "danger" | "violet"> = {
  nsq: "warn",
  spurious: "critical",
  deg_eg: "critical",
  nitrosamine: "danger",
  adulterated: "danger",
};

const actionTone = {
  quarantined: "warn",
  investigating: "info",
  recall_initiated: "critical",
  cleared: "ok",
} as const;

const defectColor: Record<QualityDefect, string> = {
  nsq: "#f0c987",
  spurious: "#ff7a63",
  deg_eg: "#ff9d88",
  nitrosamine: "#c6b4f5",
  adulterated: "#fb923c",
};

export default function QualityPage() {
  const data = getData();
  const alerts = data.qualityAlerts;

  const inInventory = alerts.filter((a) => a.inInventory);
  const degEg = alerts.filter((a) => a.defect === "deg_eg");
  const spurious = alerts.filter((a) => a.defect === "spurious");
  const unitsHeld = alerts.reduce((a, q) => a + q.unitsHeld, 0);

  // Excipient integrity: batches with uncertified excipient or failed DEG/EG test.
  const excipientRisk = data.batches
    .filter((b) => b.excipientGrade === "uncertified" || !b.degEgClear)
    .map((b) => ({ batch: b, product: data.products.find((p) => p.id === b.productId) }))
    .slice(0, 8);

  const defectMix = (Object.keys(defectLabel) as QualityDefect[])
    .map((d) => ({
      name: defectLabel[d],
      value: alerts.filter((a) => a.defect === d).length,
      color: defectColor[d],
    }))
    .filter((d) => d.value > 0);

  return (
    <TexturaShell
      eyebrow="CDSCO · NSQ surveillance"
      title="Quality & NSQ Watch"
      subtitle="CDSCO drug-alert surveillance, batch quality failures & excipient integrity"
      icon={<FlaskConical size={22} />}
      actions={
        <Badge tone="critical" pulse={degEg.length > 0}>
          {inInventory.length} alerts in inventory
        </Badge>
      }
    >

      {/* Research-grounded context banner */}
      <Card className="border-[var(--color-warn)]/30 bg-[var(--color-warn)]/5">
        <div className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 shrink-0 text-[var(--color-warn)]" size={18} />
          <p className="text-sm text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-fg)]">
              Substandard (NSQ) drugs are India&apos;s dominant supply-chain risk — not counterfeits.
            </span>{" "}
            CDSCO surveys show spurious rates under 0.05% but NSQ rates of 3–7%, and CDSCO still flags
            ~150+ failing batches every month. The 2022–25 DEG/EG cough-syrup tragedies (300+ child
            deaths) trace to uncontrolled excipient testing. This module ingests those alerts and
            matches them to held inventory.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric label="Active quality alerts" value={alerts.length} tone="warn" sub="CDSCO monthly feed" />
        </Card>
        <Card className="p-4">
          <Metric label="Matched to inventory" value={inInventory.length} tone="danger" />
        </Card>
        <Card className="p-4">
          <Metric label="DEG/EG contamination" value={degEg.length} tone="critical" sub="cough-syrup risk" />
        </Card>
        <Card className="p-4">
          <Metric label="Units held / quarantined" value={formatNumber(unitsHeld)} tone="warn" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Drug alert table */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="CDSCO Drug-Alert Feed"
            subtitle="Not-of-Standard-Quality, spurious & contamination alerts"
            icon={<AlertOctagon size={16} />}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                  <th className="px-4 py-2 font-medium">Defect</th>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Batch</th>
                  <th className="px-4 py-2 font-medium">Test lab</th>
                  <th className="px-4 py-2 font-medium">Held</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40"
                  >
                    <td className="px-4 py-2.5">
                      <Badge tone={defectTone[q.defect]}>{defectLabel[q.defect]}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{q.productName}</div>
                      <div className="max-w-[220px] truncate text-[11px] text-[var(--color-faint)]">
                        {q.description}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-brand)]">{q.batchNo}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{q.testLab}</td>
                    <td className="px-4 py-2.5 tabular-nums text-xs">
                      {q.inInventory ? formatNumber(q.unitsHeld) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={actionTone[q.action]}>{q.action.replace("_", " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Defect mix */}
        <Card>
          <CardHeader title="Defect Type Mix" subtitle="Across active alerts" icon={<ShieldX size={16} />} />
          <div className="p-4">
            <DonutChart data={defectMix} />
            <div className="mt-3 space-y-1.5">
              {defectMix.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-[var(--color-muted)]">{d.name}</span>
                  <span className="ml-auto tabular-nums text-[var(--color-faint)]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Excipient integrity */}
      <Card>
        <CardHeader
          title="Excipient & Raw-Material Integrity"
          subtitle="DEG/EG gating for liquid orals — the direct lesson of the cough-syrup tragedies"
          icon={<Beaker size={16} />}
        />
        {excipientRisk.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Form</th>
                  <th className="px-4 py-2 font-medium">Batch</th>
                  <th className="px-4 py-2 font-medium">Excipient grade</th>
                  <th className="px-4 py-2 font-medium">DEG/EG test</th>
                  <th className="px-4 py-2 font-medium">Release gate</th>
                </tr>
              </thead>
              <tbody>
                {excipientRisk.map(({ batch, product }) => (
                  <tr key={batch.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40">
                    <td className="px-4 py-2.5 font-medium">{product?.name}</td>
                    <td className="px-4 py-2.5 text-xs capitalize text-[var(--color-muted)]">{product?.dosageForm}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-brand)]">{batch.batchNo}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={batch.excipientGrade === "uncertified" ? "danger" : "ok"}>
                        {batch.excipientGrade}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={batch.degEgClear ? "ok" : "critical"}>
                        {batch.degEgClear ? "clear" : "FAILED"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {batch.degEgClear && batch.excipientGrade === "pharmacopoeial" ? (
                        <span className="text-xs text-[var(--color-ok)]">✓ release permitted</span>
                      ) : (
                        <span className="text-xs font-medium text-[var(--color-critical)]">⨯ release blocked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid place-items-center gap-2 py-10 text-center">
            <Beaker className="text-[var(--color-ok)]" size={26} />
            <p className="text-sm text-[var(--color-muted)]">
              All liquid-oral batches passed excipient & DEG/EG testing.
            </p>
          </div>
        )}
      </Card>
    </TexturaShell>
  );
}
