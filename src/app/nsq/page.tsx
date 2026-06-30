import type { Metadata } from "next";
import { FlaskConical, ExternalLink, RefreshCw, Database, ShieldCheck, AlertCircle } from "lucide-react";
import { CommandShell } from "@/components/command/command-shell";
import { Badge, Card, CardHeader, Metric } from "@/components/ui/primitives";
import { verifySession } from "@/lib/auth/dal";
import { syncCdscoNsq, getCdscoNsqAlerts, getCdscoNsqMeta } from "@/lib/intel/cdsco";
import { syncCdscoFormAction } from "@/app/actions/intel";
import { isLiveCdscoRecord } from "@/lib/intel/cdsco/provenance";
import { formatRelative, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "NSQ Alerts — CDSCO (live)",
  description:
    "Real CDSCO Not-of-Standard-Quality drug alerts, persisted with provenance and sourced directly from cdscoonline.gov.in.",
  alternates: { canonical: "/nsq" },
};

export const dynamic = "force-dynamic";

export default async function NsqPage() {
  await verifySession();

  let meta = getCdscoNsqMeta();
  let syncError: string | null = null;

  // Bootstrap the feed on first access; afterwards rely on the 6-hour window.
  if (meta.totalRecords === 0) {
    const result = await syncCdscoNsq();
    if (result.status === "failed") {
      syncError = result.error || "Could not reach CDSCO. Showing any cached records.";
    }
    meta = getCdscoNsqMeta();
  }

  const alerts = getCdscoNsqAlerts({ limit: 250 });
  const latest = alerts[0];
  const liveCount = alerts.filter(isLiveCdscoRecord).length;

  return (
    <CommandShell
      eyebrow="CDSCO · Not-of-Standard-Quality"
      title="NSQ Alerts"
      subtitle="Real CDSCO drug-alert records, fetched from cdscoonline.gov.in and persisted with provenance"
      icon={<FlaskConical size={22} />}
      actions={
        <Badge tone="ok" pulse>
          Live CDSCO data
        </Badge>
      }
    >
      {/* Provenance banner */}
      <Card className="border-[var(--color-ok)]/30 bg-[var(--color-ok)]/5">
        <div className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--color-ok)]" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-fg)]">
              {liveCount === alerts.length
                ? "Every record below is real CDSCO data."
                : `${liveCount} of ${alerts.length} records are live CDSCO data.`}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Source: <code className="text-[var(--color-brand)]">cdscoonline.gov.in/CDSCO/publicNsqDrugTable</code> ·
              Parser: <code className="text-[var(--color-brand)]">cdsco-api-1.0</code> ·
              {meta.latestRetrievedAt
                ? ` Retrieved ${formatRelative(meta.latestRetrievedAt)}`
                : " Not yet retrieved"}
            </p>
          </div>
          <a
            href="https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-brand)] hover:underline"
          >
            CDSCO portal <ExternalLink size={12} />
          </a>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric
            label="Live NSQ records"
            value={meta.totalRecords}
            tone="ok"
            sub="Persisted with provenance"
          />
        </Card>
        <Card className="p-4">
          <Metric
            label="Reporting months"
            value={meta.months.length}
            tone="brand"
            sub={meta.months.slice(0, 3).join(", ")}
          />
        </Card>
        <Card className="p-4">
          <Metric
            label="Last ingest"
            value={meta.latestRetrievedAt ? formatRelative(meta.latestRetrievedAt) : "—"}
            tone={meta.latestRetrievedAt ? "info" : "warn"}
            sub={meta.latestRetrievedAt ? formatDate(meta.latestRetrievedAt) : "Run sync"}
          />
        </Card>
        <Card className="p-4">
          <Metric
            label="Primary source"
            value="CDSCO"
            tone="brand"
            sub="Direct JSON API"
          />
        </Card>
      </div>

      {syncError && (
        <Card className="border-[var(--color-warn)]/30 bg-[var(--color-warn)]/5">
          <div className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 shrink-0 text-[var(--color-warn)]" size={18} />
            <p className="text-sm text-[var(--color-muted)]">{syncError}</p>
          </div>
        </Card>
      )}

      {/* Feed */}
      <Card>
        <CardHeader
          title="CDSCO NSQ Alert Feed"
          subtitle={`${alerts.length} persisted records · ${latest ? `latest: ${latest.alertMonth}` : "no data"}`}
          icon={<Database size={16} />}
          action={
            <form action={syncCdscoFormAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <RefreshCw size={12} /> Sync now
              </button>
            </form>
          }
        />
        {alerts.length === 0 ? (
          <div className="grid place-items-center gap-2 px-4 py-12 text-center">
            <Database className="text-[var(--color-muted)]" size={28} />
            <p className="text-sm text-[var(--color-muted)]">
              No CDSCO records persisted yet. Use “Sync now” to fetch the latest alerts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Batch</th>
                  <th className="px-4 py-2 font-medium">Manufacturer</th>
                  <th className="px-4 py-2 font-medium">Defect / NSQ Result</th>
                  <th className="px-4 py-2 font-medium">Lab / State</th>
                  <th className="px-4 py-2 font-medium">Month</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--color-fg)]">{a.productName}</div>
                      <div className="text-[10px] text-[var(--color-faint)]">
                        Source: {a.reportingSource}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-brand)]">
                      {a.batchNo || "—"}
                    </td>
                    <td className="max-w-xs px-4 py-2.5 text-xs text-[var(--color-muted)]">
                      <span className="line-clamp-2">{a.manufacturer || "—"}</span>
                    </td>
                    <td className="max-w-sm px-4 py-2.5 text-xs text-[var(--color-muted)]">
                      <span className="line-clamp-2">{a.defect || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">
                      {a.reportedByLabOrState || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)] whitespace-nowrap">
                      {a.alertMonth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-[11px] text-[var(--color-faint)]">
        Data is sourced directly from the public CDSCO online portal. Each row carries provenance
        (source URL, retrieved timestamp, parser version). No AI extraction was used for this feed.
      </p>
    </CommandShell>
  );
}
