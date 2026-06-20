"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  GitBranch,
  ShieldCheck,
  FileCheck2,
  AlertOctagon,
  Link2,
} from "lucide-react";
import { CommandShell } from "@/components/command/command-shell";
import { Badge, Card, CardHeader, Metric, Progress } from "@/components/ui/primitives";
import { getData } from "@/lib/data/engine";
import { qmsHealthScore } from "@/lib/analytics";
import { formatDate, formatRelative, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  CapaStatus,
  DeviationSeverity,
  DeviationStatus,
  BmrStatus,
} from "@/lib/types";

const sevTone: Record<DeviationSeverity, "critical" | "danger" | "warn"> = {
  critical: "critical",
  major: "danger",
  minor: "warn",
};

const devStatusTone: Record<DeviationStatus, "danger" | "warn" | "info" | "ok"> = {
  open: "danger",
  investigating: "warn",
  capa_assigned: "info",
  closed: "ok",
};

const bmrTone: Record<BmrStatus, "ok" | "warn" | "critical" | "info"> = {
  released: "ok",
  in_review: "info",
  on_hold: "warn",
  rejected: "critical",
};

const CAPA_COLUMNS: { key: CapaStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "effectiveness_check", label: "Effectiveness Check" },
  { key: "closed", label: "Closed" },
];

export default function QmsPage() {
  const data = getData();
  const [sevFilter, setSevFilter] = useState<DeviationSeverity | "all">("all");

  const openDeviations = data.deviations.filter((d) => d.status !== "closed");
  const overdueCapas = data.capas.filter((c) => c.status === "overdue");
  const criticalOpen = openDeviations.filter((d) => d.severity === "critical").length;
  const blockedBatches = data.batchRecords.filter(
    (b) => b.status === "on_hold" || b.status === "rejected"
  );
  const health = qmsHealthScore(openDeviations.length, overdueCapas.length, criticalOpen);

  const deviations = useMemo(
    () =>
      sevFilter === "all"
        ? data.deviations
        : data.deviations.filter((d) => d.severity === sevFilter),
    [data.deviations, sevFilter]
  );

  // CAPAs grouped for the board; overdue ones surface inside their workflow column.
  const capasByCol = (col: CapaStatus) =>
    data.capas.filter((c) => (col === "open" ? c.status === "open" || c.status === "overdue" : c.status === col));

  return (
    <CommandShell
      eyebrow="Deviations · CAPA · Audit"
      title="Quality Management System"
      subtitle="Deviations, CAPA lifecycle, batch release records and a tamper-evident audit trail"
      icon={<ClipboardCheck size={22} />}
      actions={
        <Badge tone={health >= 75 ? "ok" : health >= 50 ? "warn" : "critical"} pulse>
          QMS health {health}/100
        </Badge>
      }
    >

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric label="Open deviations" value={openDeviations.length} tone="warn" sub={`${criticalOpen} critical`} />
        </Card>
        <Card className="p-4">
          <Metric label="Overdue CAPAs" value={overdueCapas.length} tone={overdueCapas.length ? "critical" : "ok"} sub="past SLA due date" />
        </Card>
        <Card className="p-4">
          <Metric label="Batches blocked" value={blockedBatches.length} tone="danger" sub="on hold / rejected" />
        </Card>
        <Card className="p-4">
          <Metric
            label="Released this period"
            value={data.batchRecords.filter((b) => b.status === "released").length}
            tone="ok"
          />
        </Card>
      </div>

      {/* CAPA board */}
      <Card>
        <CardHeader
          title="CAPA Board"
          subtitle="Corrective & preventive actions by lifecycle stage · due dates driven by deviation-severity SLA"
          icon={<GitBranch size={16} />}
          action={
            overdueCapas.length ? (
              <Badge tone="critical">{overdueCapas.length} overdue</Badge>
            ) : (
              <Badge tone="ok">On track</Badge>
            )
          }
        />
        <div className="grid gap-3 p-4 lg:grid-cols-4">
          {CAPA_COLUMNS.map((col) => {
            const items = capasByCol(col.key);
            return (
              <div key={col.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/40">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--color-muted)]">{col.label}</span>
                  <span className="text-[11px] tabular-nums text-[var(--color-faint)]">{items.length}</span>
                </div>
                <div className="flex max-h-[420px] flex-col gap-2 overflow-auto p-2">
                  {items.length ? (
                    items.map((c) => {
                      const overdue = c.status === "overdue";
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "rounded-md border bg-[var(--color-surface)] p-2.5",
                            overdue ? "border-[var(--color-critical)]/40" : "border-[var(--color-border)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-[var(--color-brand)]">{c.ref}</span>
                            <Badge tone={c.kind === "corrective" ? "info" : "violet"}>{c.kind}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-fg)]">{c.action}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={c.progress} tone={overdue ? "critical" : "brand"} />
                            <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-faint)]">{c.progress}%</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-faint)]">
                            <span>{c.deviationRef}</span>
                            <span className={overdue ? "font-semibold text-[var(--color-critical)]" : ""}>
                              {overdue ? `${Math.abs(daysUntil(c.dueAt))}d overdue` : `due ${formatDate(c.dueAt)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="px-1 py-6 text-center text-[11px] text-[var(--color-faint)]">None</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Deviations register */}
      <Card>
        <CardHeader
          title="Deviation Register"
          subtitle="Every departure from spec — auto-raised from cold-chain, QC labs and CDSCO matches"
          icon={<AlertOctagon size={16} />}
          action={
            <select
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value as DeviationSeverity | "all")}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                <th className="px-4 py-2 font-medium">Ref</th>
                <th className="px-4 py-2 font-medium">Deviation</th>
                <th className="px-4 py-2 font-medium">Batch</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Age</th>
                <th className="px-4 py-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {deviations.map((d) => (
                <tr key={d.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-brand)]">{d.ref}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{d.title}</p>
                    <p className="text-[11px] capitalize text-[var(--color-faint)]">{d.type.replace(/_/g, " ")}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-muted)]">{d.batchNo}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{d.source}</td>
                  <td className="px-4 py-2.5"><Badge tone={sevTone[d.severity]}>{d.severity}</Badge></td>
                  <td className="px-4 py-2.5"><Badge tone={devStatusTone[d.status]}>{d.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-xs tabular-nums", d.ageDays > 30 && d.status !== "closed" ? "font-semibold text-[var(--color-warn)]" : "text-[var(--color-muted)]")}>
                      {d.ageDays}d
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{d.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Batch Manufacturing Records */}
        <Card>
          <CardHeader
            title="Batch Release (BMR)"
            subtitle="GMP-gated: checklist complete · no open deviations · DEG/EG cleared"
            icon={<FileCheck2 size={16} />}
          />
          <ul className="max-h-[480px] divide-y divide-[var(--color-border)] overflow-auto">
            {data.batchRecords.map((b) => {
              const blockers: string[] = [];
              if (!b.degEgClear) blockers.push("DEG/EG not cleared");
              if (b.excipientGrade === "uncertified") blockers.push("uncertified excipient");
              if (b.openDeviations > 0) blockers.push(`${b.openDeviations} open deviation(s)`);
              return (
                <li key={b.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.productName}</p>
                      <p className="font-mono text-[11px] text-[var(--color-faint)]">{b.batchNo} · {b.reviewedBy}</p>
                    </div>
                    <Badge tone={bmrTone[b.status]}>{b.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress
                      value={(b.checksComplete / b.checksTotal) * 100}
                      tone={b.status === "released" ? "ok" : b.status === "rejected" ? "critical" : "warn"}
                    />
                    <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-faint)]">
                      {b.checksComplete}/{b.checksTotal} checks
                    </span>
                  </div>
                  {blockers.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-[var(--color-danger)]">⚠ {blockers.join(" · ")}</p>
                  )}
                  {b.releasedAt && (
                    <p className="mt-1 text-[11px] text-[var(--color-faint)]">Released {formatDate(b.releasedAt)}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Hash-chained audit trail */}
        <Card>
          <CardHeader
            title="Audit Trail"
            subtitle="Hash-chained · tamper-evident (21 CFR Part 11 style)"
            icon={<ShieldCheck size={16} />}
            action={<Badge tone="ok"><Link2 size={11} /> chain intact</Badge>}
          />
          <ul className="max-h-[480px] divide-y divide-[var(--color-border)] overflow-auto">
            {data.auditTrail.map((e) => (
              <li key={e.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{e.action}</p>
                  <span className="shrink-0 font-mono text-[11px] text-[var(--color-brand)]">{e.entity}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--color-faint)]">
                  {e.actor} · {formatRelative(e.timestamp)}
                </p>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-faint)]">
                  <span className="text-[var(--color-muted)]">{e.prevHash}</span>
                  <span>→</span>
                  <span className="text-[var(--color-violet)]">{e.hash}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </CommandShell>
  );
}
