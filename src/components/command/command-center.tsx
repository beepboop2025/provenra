"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  ClipboardCheck,
  Map as MapIcon,
  PackageSearch,
  ShieldAlert,
  Snowflake,
  Warehouse,
  X,
} from "lucide-react";
import { SplitText } from "@/components/landing/split-text";
import { Reveal } from "@/components/landing/reveal";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { TraceVial, ColdChainCurve, HospitalScene, FefoShelf } from "@/components/landing/diagrams";
import { CommandNav } from "@/components/command/command-nav";
import { CommandLoader } from "@/components/command/command-loader";
import { NetworkMap } from "@/components/map/network-map";
import { DonutChart } from "@/components/charts/charts";
import { AlertFeed } from "@/components/dashboard/alert-feed";
import { Badge, Progress, Sparkline } from "@/components/ui/primitives";
import { getData } from "@/lib/data/engine";
import { overviewKpis } from "@/lib/kpis";
import { fefoPickRate, pickFillRate } from "@/lib/analytics";
import { THERAPEUTIC_COLORS } from "@/lib/data/seed";
import { formatCompact, formatDate } from "@/lib/format";
import type { Kpi } from "@/lib/types";
import { cn } from "@/lib/utils";

// WebGL hero, client-only — the liquid blob (cf. textura-agency/liquid-threejs-ball).
const HeroScene = dynamic(() => import("@/components/landing/hero-scene"), {
  ssr: false,
  loading: () => null,
});

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function useWebGL() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setOk(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

const MODULE_CARDS = [
  { name: "Track & Trace", href: "/trace", Diagram: TraceVial },
  { name: "Cold Chain", href: "/coldchain", Diagram: ColdChainCurve },
  { name: "Verify a Unit", href: "/verify", Diagram: HospitalScene },
  { name: "Warehouse (WMS)", href: "/warehouse", Diagram: FefoShelf },
];

const PILL_MODULES = ["Track & Trace", "Cold Chain", "Quality / NSQ", "Inventory", "Compliance"];
const MARQUEE = ["Track & Trace", "Cold Chain", "Quality / NSQ", "FEFO Inventory", "QMS · CAPA", "Recall & Compliance"];

export function CommandCenter() {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGL();
  const animate = webgl && !reduced;

  // Textura's fluid-rem grid: scale the whole UI as one, only while mounted.
  // Also pin the entry at the top (the hero is the "moment") and stop the
  // browser from restoring a prior scroll position under Lenis.
  useEffect(() => {
    document.documentElement.classList.add("cc-fluid");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => document.documentElement.classList.remove("cc-fluid");
  }, []);

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
  const criticalExcursions = data.excursions.filter((e) => e.severity !== "minor").slice(0, 4);

  const sevRank = { critical: 0, major: 1, minor: 2 } as const;
  const openDeviations = data.deviations.filter((d) => d.status !== "closed");
  const overdueCapas = data.capas.filter((c) => c.status === "overdue");
  const topDeviations = [...openDeviations]
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.ageDays - a.ageDays)
    .slice(0, 4);

  const fefoAccuracy = fefoPickRate(data.pickTasks);
  const fillRate = pickFillRate(data.pickTasks);
  const fefoViolations = data.pickTasks.filter((t) => !t.fefoCompliant && t.status !== "short").length;
  const shortPicks = data.pickTasks.filter((t) => t.status === "short").length;
  const activePicks = data.pickTasks.filter((t) => t.status === "picking" || t.status === "queued").length;

  const unacked = data.alerts.filter((a) => !a.acknowledged);

  const heroStats = [
    { value: formatCompact(data.serials.length), label: "Serials under trace" },
    { value: String(data.facilities.length), label: "Facilities live" },
    { value: String(data.shipments.length), label: "Shipments in motion" },
    { value: String(unacked.length), label: "Active alerts" },
  ];

  return (
    <div className="cc-stage tx-stage relative min-h-screen overflow-x-clip">
      <CommandLoader />
      <SmoothScroll />
      <CommandNav />

      {/* ── Hero (centered Textura composition) ────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-center">
        {/* Liquid blob, dimmed to an ambient glow (Textura's hero is near-black;
            the blob is atmosphere, not the subject). */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-60" aria-hidden="true">
          {webgl && <HeroScene animate={animate} />}
        </div>
        {/* Legibility scrims: a flat darken + an edge vignette. */}
        <div className="absolute inset-0 z-[1] bg-black/45" aria-hidden="true" />
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden="true"
          style={{ background: "radial-gradient(115% 80% at 50% 42%, transparent 26%, #000000 100%)" }}
        />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-20">
          <h1 className="cc-hero-mark tx-display whitespace-nowrap text-warm-strong">
            <span className="cc-mark-box" aria-hidden="true" />
            <SplitText as="span" text="VITALCHAIN" className="inline" delay={120} />
          </h1>
          {/* Plain text (not SplitText): the cc-ink gradient needs the glyphs to
              live directly on the gradient element, not in nested letter spans. */}
          <Reveal as="div" delay={320} className="tx-display cc-ink mt-2 text-3xl leading-none sm:text-5xl lg:text-6xl">
            command center
          </Reveal>

          <SplitText
            as="p"
            text="One live view of every batch, shipment and cold-chain reading — so a recalled or substandard pack is caught before it reaches a patient."
            className="mx-auto mt-8 block max-w-2xl text-base leading-relaxed text-warm/75 lg:text-lg"
            delay={560}
          />

          <Reveal delay={920} className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/verify"
              className="cc-cta inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Verify a unit <ArrowUpRight size={16} />
            </Link>
            <a href="mailto:hello@vitalchain.app" className="cc-underline text-sm text-warm/80 underline hover:text-warm-strong">
              Book a walkthrough
            </a>
          </Reveal>

          {/* Services / modules pill */}
          <Reveal delay={1080} className="mt-12 flex justify-center">
            <div className="cc-pill flex flex-wrap items-center justify-center gap-x-1 gap-y-1 px-6 py-3 text-sm text-warm/70">
              {PILL_MODULES.map((m, i) => (
                <span key={m} className="flex items-center">
                  <span className="px-2">{m}</span>
                  {i < PILL_MODULES.length - 1 && <span className="text-warm/30">·</span>}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-warm/50">
          <div className="tx-bob flex flex-col items-center gap-1">
            <span className="tx-eyebrow !text-[0.6rem]">Scroll</span>
            <span className="h-8 w-px bg-warm/30" />
          </div>
        </div>
      </section>

      {/* ── Module marquee ─────────────────────────────────────────────── */}
      <div className="tx-marquee-row relative overflow-hidden border-y border-white/10 py-6">
        <div className="tx-marquee">
          {[0, 1].map((dup) => (
            <span key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center">
              {MARQUEE.map((m) => (
                <span key={m} className="tx-display flex items-center text-3xl text-warm/80 lg:text-5xl">
                  <span className="px-6">{m}</span>
                  <span className="cc-ink">/</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── Live stat band (serif gradient numerals) ───────────────────── */}
      <Section eyebrow="Right now" title="The network at a glance">
        <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {heroStats.map((s) => (
            <div key={s.label} className="bg-ink-2 px-6 py-10">
              <div className="cc-ink tx-display text-5xl tabular-nums lg:text-6xl">{s.value}</div>
              <div className="mt-2 text-sm leading-snug text-warm/55">{s.label}</div>
            </div>
          ))}
        </Reveal>
      </Section>

      {/* ── Vital signs (KPIs) ─────────────────────────────────────────── */}
      <Section eyebrow="At a glance" title="Network vital signs">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <Reveal key={k.label} delay={i * 60}>
              <KpiTile kpi={k} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Featured modules carousel ──────────────────────────────────── */}
      <Section eyebrow="Featured modules" title="Open a workspace">
        <Reveal>
          <div className="cc-rail">
            {MODULE_CARDS.map((m) => {
              const Diagram = m.Diagram;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="tx-tile cc-link group block w-[19rem] overflow-hidden rounded-3xl border border-white/10 bg-ink-2 sm:w-[24rem]"
                >
                  <div className="overflow-hidden p-8">
                    <Diagram />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 px-7 py-5">
                    <span className="tx-display text-xl text-warm-strong">{m.name}</span>
                    <ArrowUpRight size={20} className="text-warm/40 transition-colors group-hover:text-[var(--color-tx-accent)]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Reveal>
      </Section>

      {/* ── Live network + alerts ──────────────────────────────────────── */}
      <Section eyebrow="Live network" title="National distribution">
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <Panel
              title="National Distribution Network"
              subtitle="Live shipments across India · manufacturing hubs and demand centers"
              icon={<MapIcon size={16} />}
              action={<PanelLink href="/coldchain">Cold chain</PanelLink>}
            >
              <NetworkMap facilities={data.facilities} shipments={data.shipments} />
            </Panel>
          </Reveal>
          <Reveal delay={140}>
            <Panel
              title="Priority Alerts"
              subtitle={`${unacked.length} active`}
              icon={<BellRing size={16} />}
              className="flex h-full flex-col"
            >
              <div className="flex-1 overflow-auto">
                <AlertFeed alerts={data.alerts} limit={7} />
              </div>
            </Panel>
          </Reveal>
        </div>
      </Section>

      {/* ── Module snapshots ───────────────────────────────────────────── */}
      <Section eyebrow="Across the modules" title="What needs attention">
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal>
            <Panel
              title="Cold-Chain Excursions"
              subtitle="Highest severity, unresolved"
              icon={<Snowflake size={16} />}
              action={<PanelLink href="/coldchain">View</PanelLink>}
            >
              <ul className="divide-y divide-white/10">
                {criticalExcursions.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-warm-strong">{e.productName}</p>
                      <p className="text-xs text-warm/40">
                        {e.shipmentRef} · MKT {e.mkt}°C · {e.durationMin}min
                      </p>
                    </div>
                    <Badge tone={e.severity === "critical" ? "critical" : "warn"}>+{e.peakDeviation}°C</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>

          <Reveal delay={100}>
            <Panel
              title="Shortage Watchlist"
              subtitle="Predicted stockout risk"
              icon={<PackageSearch size={16} />}
              action={<PanelLink href="/inventory">View</PanelLink>}
            >
              <ul className="divide-y divide-white/10">
                {topShortages.map((s) => (
                  <li key={s.id} className="px-5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-warm-strong">
                        {s.productName}
                        {s.essential && <span className="ml-1.5 text-[10px] text-[var(--color-warn)]">NLEM</span>}
                      </p>
                      <span className="text-xs font-semibold tabular-nums text-[var(--color-danger)]">{s.riskScore}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={s.riskScore} tone={s.riskScore >= 80 ? "critical" : "warn"} />
                      <span className="shrink-0 text-[10px] text-warm/40">{formatDate(s.projectedStockout)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>

          <Reveal delay={200}>
            <Panel
              title="Active Recalls"
              subtitle="Retrieval progress"
              icon={<ShieldAlert size={16} />}
              action={<PanelLink href="/compliance">View</PanelLink>}
            >
              <ul className="divide-y divide-white/10">
                {openRecalls.length ? (
                  openRecalls.map((r) => {
                    const pct = Math.round((r.retrievedUnits / r.affectedUnits) * 100);
                    return (
                      <li key={r.id} className="px-5 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-warm-strong">{r.productName}</p>
                          <Badge tone={r.recallClass === "I" ? "critical" : "warn"}>Class {r.recallClass}</Badge>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={pct} tone="info" />
                          <span className="shrink-0 text-[10px] tabular-nums text-warm/40">{pct}%</span>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-5 py-6 text-center text-sm text-warm/45">No active recalls</li>
                )}
              </ul>
            </Panel>
          </Reveal>
        </div>
      </Section>

      {/* ── QMS & WMS ──────────────────────────────────────────────────── */}
      <Section eyebrow="Quality & throughput" title="Operations health">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal>
            <Panel
              title="Quality Actions (QMS)"
              subtitle={`${openDeviations.length} open deviations · ${overdueCapas.length} overdue CAPAs`}
              icon={<ClipboardCheck size={16} />}
              action={<PanelLink href="/qms">View</PanelLink>}
            >
              <ul className="divide-y divide-white/10">
                {topDeviations.length ? (
                  topDeviations.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-warm-strong">{d.title}</p>
                        <p className="text-[11px] text-warm/40">
                          {d.ref} · {d.source} · {d.ageDays}d open
                        </p>
                      </div>
                      <Badge tone={d.severity === "critical" ? "critical" : d.severity === "major" ? "danger" : "warn"}>
                        {d.severity}
                      </Badge>
                    </li>
                  ))
                ) : (
                  <li className="px-5 py-6 text-center text-sm text-warm/45">No open deviations</li>
                )}
              </ul>
            </Panel>
          </Reveal>

          <Reveal delay={140}>
            <Panel
              title="Warehouse Throughput (WMS)"
              subtitle="FEFO compliance and order fulfilment"
              icon={<Warehouse size={16} />}
              action={<PanelLink href="/warehouse">View</PanelLink>}
            >
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="FEFO accuracy" value={`${fefoAccuracy}%`} tone={fefoAccuracy >= 95 ? "ok" : "warn"} />
                  <Stat label="Fill rate" value={`${fillRate}%`} tone={fillRate >= 95 ? "ok" : "warn"} />
                  <Stat label="Active picks" value={activePicks} tone="accent" />
                  <Stat label="Short picks" value={shortPicks} tone={shortPicks ? "danger" : "ok"} />
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-warm/55">
                    <span>FEFO compliance</span>
                    <span className="tabular-nums">
                      {fefoViolations} violation{fefoViolations === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Progress value={fefoAccuracy} tone={fefoAccuracy >= 95 ? "ok" : fefoAccuracy >= 85 ? "warn" : "critical"} />
                </div>
              </div>
            </Panel>
          </Reveal>
        </div>
      </Section>

      {/* ── Portfolio + shipments ──────────────────────────────────────── */}
      <Section eyebrow="Portfolio" title="What's moving">
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal>
            <Panel title="Portfolio by Therapeutic Area" subtitle="Units under management">
              <div className="p-5">
                <DonutChart data={catData.slice(0, 6)} />
                <div className="mt-4 grid grid-cols-2 gap-1.5">
                  {catData.slice(0, 6).map((c) => (
                    <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      <span className="truncate text-warm/55">{c.name}</span>
                      <span className="ml-auto tabular-nums text-warm/40">{formatCompact(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={140} className="lg:col-span-2">
            <Panel title="In-Transit Shipments" subtitle="Real-time consignment status">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-warm/40">
                      <th className="px-5 py-2.5 font-medium">Ref</th>
                      <th className="px-5 py-2.5 font-medium">Route</th>
                      <th className="px-5 py-2.5 font-medium">Carrier</th>
                      <th className="px-5 py-2.5 font-medium">Progress</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.shipments
                      .filter((s) => s.status !== "delivered")
                      .slice(0, 7)
                      .map((s) => (
                        <tr key={s.id} className="border-b border-white/10 transition-colors hover:bg-white/5">
                          <td className="px-5 py-2.5 font-mono text-xs text-[var(--color-tx-accent)]">{s.ref}</td>
                          <td className="px-5 py-2.5 text-xs text-warm/55">
                            {s.origin.location.city} → {s.destination.location.city}
                          </td>
                          <td className="px-5 py-2.5 text-xs text-warm/55">{s.carrier.split(" ")[0]}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex w-28 items-center gap-2">
                              <Progress value={s.progress * 100} />
                              <span className="text-[10px] tabular-nums text-warm/40">{Math.round(s.progress * 100)}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-2.5">
                            <Badge tone={s.status === "exception" ? "critical" : s.status === "delayed" ? "warn" : "info"}>
                              {s.status.replace("_", " ")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </Reveal>
        </div>
      </Section>

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-28 lg:px-10">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-24 text-center lg:py-32"
          style={{ background: "radial-gradient(800px 420px at 50% -10%, #a1ecff22 0%, transparent 60%), var(--color-ink-2)" }}
        >
          <SplitText
            as="h2"
            text="Catch it before the patient does."
            className="tx-display tx-h2 mx-auto block max-w-4xl text-warm-strong"
          />
          <p className="mx-auto mt-6 max-w-xl text-lg text-warm/60">
            Trace, cold chain, quality and recalls — moving together, in real time.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-5">
            <Link href="/verify" className="cc-cta inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold">
              Verify a unit <ArrowUpRight size={16} />
            </Link>
            <Link href="/intro" className="cc-underline text-sm text-warm/80 underline hover:text-warm-strong">
              Watch the film
            </Link>
          </div>
        </div>

        <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-warm/40 sm:flex-row">
          <span className="tx-display text-warm/70">
            <span className="cc-mark-box" aria-hidden="true" />
            VITAL<span className="cc-ink">CHAIN</span>
          </span>
          <span>© 2026 VitalChain · Pharma supply-chain intelligence</span>
        </footer>
      </section>

      <CookieNotice />
    </div>
  );
}

/* ── Local Textura building blocks ────────────────────────────────────── */

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
      <div className="mb-9">
        <p className="tx-eyebrow text-[var(--color-tx-accent)]">{eyebrow}</p>
        <SplitText as="h2" text={title} className="tx-display tx-h2 mt-3 block text-warm-strong" />
      </div>
      {children}
    </section>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  action,
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("cc-panel cc-link overflow-hidden rounded-3xl", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="shrink-0 text-[var(--color-tx-accent)]">{icon}</span>}
          <div className="min-w-0">
            <h3 className="tx-display truncate text-lg text-warm-strong">{title}</h3>
            {subtitle && <p className="truncate text-xs text-warm/50">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-[var(--color-tx-accent)] transition-all hover:gap-1.5"
    >
      {children} <ArrowUpRight size={13} />
    </Link>
  );
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const positive = kpi.delta >= 0;
  const isGood = kpi.deltaGood === "up" ? positive : !positive;
  const color = isGood ? "var(--color-ok)" : "var(--color-danger)";
  return (
    <div className="cc-panel cc-link rounded-3xl p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="tx-eyebrow !text-[0.62rem] text-warm/45">{kpi.label}</span>
        <span className="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums" style={{ color }}>
          {positive ? "▲" : "▼"} {Math.abs(kpi.delta).toFixed(1)}%
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="tx-display text-4xl tabular-nums text-warm-strong">{kpi.value}</span>
        <Sparkline data={kpi.spark} color={color} width={84} height={30} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: "ok" | "warn" | "danger" | "accent";
}) {
  const color = {
    ok: "var(--color-ok)",
    warn: "var(--color-warn)",
    danger: "var(--color-danger)",
    accent: "var(--color-tx-accent)",
  }[tone];
  return (
    <div>
      <div className="text-[11px] text-warm/50">{label}</div>
      <div className="tx-display mt-0.5 text-3xl tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

/** Cookies-style notice card (the bottom-left furniture from textura.agency). */
function CookieNotice() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="cc-cookie fixed bottom-5 left-5 z-[55] max-w-sm rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="tx-display text-xl text-warm-strong">Demo build</h4>
        <button
          onClick={() => setOpen(false)}
          aria-label="Dismiss notice"
          className="text-warm/40 transition-colors hover:text-warm-strong"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-warm/60">
        Figures are deterministic sample data from the seeded engine, shown to demonstrate the
        interface. No live patient or facility data is used.
      </p>
      <button
        onClick={() => setOpen(false)}
        className="mt-4 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
      >
        Got it
      </button>
    </div>
  );
}
