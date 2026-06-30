import type { Metadata } from "next";
import { ShieldAlert, ExternalLink, RefreshCw, Database, ShieldCheck, AlertCircle } from "lucide-react";
import { CommandShell } from "@/components/command/command-shell";
import { Badge, Card, CardHeader, Metric } from "@/components/ui/primitives";
import { verifySession } from "@/lib/auth/dal";
import { syncOpenfdaRecalls, getOpenfdaRecalls, getOpenfdaMeta } from "@/lib/intel/openfda";
import { syncOpenfdaFormAction } from "@/app/actions/openfda";
import { isLiveOpenfdaRecall } from "@/lib/intel/openfda/provenance";
import { formatRelative, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "FDA Recalls — openFDA (live)",
  description:
    "Real FDA drug-enforcement recall records from openFDA, persisted with provenance and sourced directly from api.fda.gov.",
  alternates: { canonical: "/recalls" },
};

export const dynamic = "force-dynamic";

export default async function RecallsPage() {
  await verifySession();

  let meta = getOpenfdaMeta();
  let syncError: string | null = null;

  if (meta.totalRecalls === 0) {
    const result = await syncOpenfdaRecalls();
    if (result.status === "failed") {
      syncError = result.error || "Could not reach openFDA. Showing any cached records.";
    }
    meta = getOpenfdaMeta();
  }

  const recalls = getOpenfdaRecalls({ limit: 250 });
  const latest = recalls[0];
  const liveCount = recalls.filter(isLiveOpenfdaRecall).length;

  return (
    <CommandShell
      eyebrow="openFDA · Drug Enforcement Recalls"
      title="FDA Recalls"
      subtitle="Real FDA drug recall records from api.fda.gov, persisted with provenance"
      icon={<ShieldAlert size={22} />}
      actions={
        <Badge tone="ok" pulse>
          Live openFDA data
        </Badge>
      }
    >
      {/* Provenance banner */}
      <Card className="border-[var(--color-ok)]/30 bg-[var(--color-ok)]/5">
        <div className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--color-ok)]" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-fg)]">
              {liveCount === recalls.length
                ? "Every record below is real openFDA data."
                : `${liveCount} of ${recalls.length} records are live openFDA data.`}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Source: <code className="text-[var(--color-brand)]">api.fda.gov/drug/enforcement.json</code> ·
              Parser: <code className="text-[var(--color-brand)]">openfda-api-1.0</code> ·
              {meta.latestRetrievedAt
                ? ` Retrieved ${formatRelative(meta.latestRetrievedAt)}`
                : " Not yet retrieved"}
            </p>
          </div>
          <a
            href="https://www.fda.gov/drugs/drug-safety-and-availability/drug-recalls"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-brand)] hover:underline"
          >
            FDA portal <ExternalLink size={12} />
          </a>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric
            label="Live recalls"
            value={meta.totalRecalls}
            tone="ok"
            sub="Persisted with provenance"
          />
        </Card>
        <Card className="p-4">
          <Metric
            label="Classifications"
            value={meta.recallClassifications.length}
            tone="brand"
            sub={meta.recallClassifications.slice(0, 3).join(", ")}
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
            value="openFDA"
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
          title="FDA Recall Feed"
          subtitle={`${recalls.length} persisted records · ${latest ? `latest: ${latest.reportDate}` : "no data"}`}
          icon={<Database size={16} />}
          action={
            <form action={syncOpenfdaFormAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <RefreshCw size={12} /> Sync now
              </button>
            </form>
          }
        />
        {recalls.length === 0 ? (
          <div className="grid place-items-center gap-2 px-4 py-12 text-center">
            <Database className="text-[var(--color-muted)]" size={28} />
            <p className="text-sm text-[var(--color-muted)]">
              No openFDA recall records persisted yet. Use “Sync now” to fetch the latest recalls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Recalling firm</th>
                  <th className="px-4 py-2 font-medium">Classification</th>
                  <th className="px-4 py-2 font-medium">Reason for recall</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Report date</th>
                </tr>
              </thead>
              <tbody>
                {recalls.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--color-fg)]">{r.productDescription || "—"}</div>
                      <div className="text-[10px] text-[var(--color-faint)]">Recall #{r.recallNumber}</div>
                    </td>
                    <td className="max-w-xs px-4 py-2.5 text-xs text-[var(--color-muted)]">
                      <span className="line-clamp-2">{r.recallingFirm || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">
                      {r.classification || "—"}
                    </td>
                    <td className="max-w-sm px-4 py-2.5 text-xs text-[var(--color-muted)]">
                      <span className="line-clamp-2">{r.reasonForRecall || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{r.status || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)] whitespace-nowrap">
                      {r.reportDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-[11px] text-[var(--color-faint)]">
        Data is sourced directly from the public openFDA API. Each row carries provenance
        (source URL, retrieved timestamp, parser version). No AI extraction was used for this feed.
      </p>
    </CommandShell>
  );
}
