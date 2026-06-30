import type { Metadata } from "next";
import { Radar, ShieldAlert, PackageX, Bot, Sparkles, Database, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CommandShell } from "@/components/command/command-shell";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { collectIntel } from "@/lib/intel/collector";
import { generateBriefing } from "@/lib/intel/agent";
import { formatRelative, formatDate } from "@/lib/format";
import type { IntelItem } from "@/lib/intel/types";

// Cloud ISR: regenerated on Vercel every 6h (and on cron trigger). No laptop.
export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Global Pharma Intel — AI Agents",
  description:
    "Cloud AI agents that gather real worldwide pharma recalls and shortages from public regulators (openFDA), then consolidate and structure them into a live intelligence briefing.",
  alternates: { canonical: "/intel" },
};

const sevTone = { critical: "critical", warning: "warn", info: "info" } as const;

export default async function IntelPage() {
  const items = await collectIntel();
  const briefing = await generateBriefing(items);
  const recalls = items.filter((i) => i.kind === "recall");
  const shortages = items.filter((i) => i.kind === "shortage");
  const critical = items.filter((i) => i.severity === "critical").length;

  return (
    <CommandShell
      eyebrow="Cloud AI agents"
      title="Global Pharma Intelligence"
      subtitle="Cloud AI agents gather, consolidate and structure worldwide pharma signals — no laptop required"
      icon={<Radar size={22} />}
      actions={
        <Badge tone={briefing.byAI ? "ok" : "warn"} pulse>
          {briefing.byAI ? "Analyst agent live" : "Collector only"}
        </Badge>
      }
    >

      <Card className="border-[var(--color-info)]/30 bg-[var(--color-info)]/5">
        <div className="flex items-start gap-3 p-4">
          <Database className="mt-0.5 shrink-0 text-[var(--color-info)]" size={18} />
          <div className="flex-1">
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-fg)]">Real-time feeds, not persisted.</span>{" "}
              openFDA and CDSCO items below are fetched live on each ISR cycle and are not stored.
              For the persisted, provenance-tracked CDSCO NSQ feed, open the{" "}
              <Link href="/nsq" className="text-[var(--color-brand)] hover:underline">
                NSQ Alerts workspace <ArrowUpRight size={10} className="inline" />
              </Link>
              .
            </p>
          </div>
        </div>
      </Card>

      {/* Agent pipeline status */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-muted)]">
            <Bot size={15} className="text-[var(--color-brand)]" /> Collector agent
          </div>
          <p className="mt-2 text-sm text-[var(--color-fg)]">
            {items.length} live items · {recalls.length} recalls · {shortages.length} shortages
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-faint)]">Sources: openFDA (US) + CDSCO NSQ alerts (India)</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-muted)]">
            <Sparkles size={15} className="text-[var(--color-violet)]" /> Analyst agent
          </div>
          <p className="mt-2 text-sm text-[var(--color-fg)]">
            {briefing.byAI ? `Synthesized by ${briefing.model}` : "Deterministic fallback"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-faint)]">
            {briefing.byAI
              ? `Updated ${formatRelative(briefing.generatedAt)}`
              : "Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY on Vercel to enable"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-muted)]">
            <ShieldAlert size={15} className="text-[var(--color-critical)]" /> Severity
          </div>
          <p className="mt-2 text-sm text-[var(--color-fg)]">{critical} Class I (most serious)</p>
          <p className="mt-1 text-[11px] text-[var(--color-faint)]">Refreshes every 6h on Vercel</p>
        </Card>
      </div>

      {/* AI briefing */}
      <Card>
        <CardHeader
          title="Intelligence Briefing"
          subtitle={briefing.byAI ? "Consolidated by the Claude analyst agent" : "Automatic summary (AI agent off)"}
          icon={<Sparkles size={16} />}
        />
        <div className="p-4">
          <p className="text-sm leading-relaxed text-[var(--color-fg)]">{briefing.summary}</p>
          {briefing.highlights.length > 0 && (
            <ul className="mt-4 space-y-2">
              {briefing.highlights.map((h, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-[var(--color-muted)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Consolidated feed */}
      <Card>
        <CardHeader
          title="Consolidated Feed"
          subtitle="Recalls and shortages, normalized into one structured stream"
          icon={<PackageX size={16} />}
          action={<Badge tone="neutral">{items.length} items</Badge>}
        />
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
            No data returned from the source right now. The collector retries on the next refresh.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Org</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: IntelItem) => (
                  <tr key={it.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40">
                    <td className="px-4 py-2.5">
                      <Badge tone={it.kind === "recall" ? "danger" : "warn"}>{it.kind}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {it.url ? (
                        <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand)] hover:underline">
                          {it.title}
                        </a>
                      ) : (
                        it.title
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">
                      {it.org}
                      <span className="ml-1.5 rounded bg-[var(--color-surface-2)] px-1 text-[10px] text-[var(--color-faint)]">{it.region}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-sm text-xs text-[var(--color-muted)]">
                      <span className="line-clamp-2">{it.reason}</span>
                      <span className="mt-0.5 block text-[10px] text-[var(--color-faint)]">{it.classification} · {it.source}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{formatDate(it.date)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={sevTone[it.severity]}>{it.severity}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-[11px] text-[var(--color-faint)]">
        Data sourced from openFDA (US FDA) and CDSCO NSQ alerts (India), refreshed automatically on Vercel. Figures are
        real public regulatory records and may lag the source. The persisted CDSCO NSQ feed with full provenance is in
        the NSQ Alerts workspace.
      </p>
    </CommandShell>
  );
}
