"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { SplitText } from "@/components/landing/split-text";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Reveal } from "@/components/landing/reveal";
import { PromoPlayer } from "@/components/promo/promo-player";
import {
  TraceVial,
  ColdChainCurve,
  HospitalScene,
  FefoShelf,
} from "@/components/landing/diagrams";
import { getData } from "@/lib/data/engine";
import { formatCompact } from "@/lib/format";

// WebGL hero — client-only. `ssr: false` is legal here because this file is a
// Client Component (Next 16 forbids it in Server Components). Until it loads,
// the CSS gradient stage shows through, so there is never a blank flash.
const HeroScene = dynamic(() => import("@/components/landing/hero-scene"), {
  ssr: false,
  loading: () => null,
});

/** matchMedia hook for honoring the user's reduced-motion preference. */
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

/** Cheap WebGL capability probe so we can skip the canvas on unsupported GPUs. */
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

const NAV = [
  { label: "Platform", href: "#platform" },
  { label: "Modules", href: "#modules" },
  { label: "Film", href: "#film" },
  { label: "Story", href: "#story" },
];

const SERVICES = ["Track & Trace", "Cold Chain", "Quality / NSQ", "FEFO Inventory", "QMS · CAPA", "Recall & Compliance"];

const FEATURES = [
  {
    tag: "Track & Trace",
    title: "Every pack, traceable to its origin.",
    body: "Serialize to the GS1 unit level and rebuild a hash-chained chain of custody for any pack. When a scan pattern looks wrong, the anti-counterfeit engine flags it before the pack moves again.",
    href: "/trace",
    Diagram: TraceVial,
  },
  {
    tag: "Cold Chain",
    title: "Catch the freeze that ruins a vaccine.",
    body: "VitalChain computes mean kinetic temperature for every shipment and separates freeze damage from heat. A vial that froze for twenty minutes looks fine on a label and fails a patient. Now you see it.",
    href: "/coldchain",
    Diagram: ColdChainCurve,
  },
  {
    tag: "At the hospital",
    title: "Verify before it reaches the patient.",
    body: "Scan a pack at receiving or the bedside to confirm it is genuine and not under recall. Match every CDSCO quality alert against the stock your pharmacy and wards still hold.",
    href: "/verify",
    Diagram: HospitalScene,
  },
  {
    tag: "Warehouse",
    title: "Ship the oldest stock first.",
    body: "Enforce FEFO on every pick so near-expiry stock leaves before it becomes a write-off. Each violation surfaces the moment it happens, not at the next stock count.",
    href: "/warehouse",
    Diagram: FefoShelf,
  },
];

const MODULES = [
  { name: "Track & Trace", href: "/trace", Diagram: TraceVial },
  { name: "Cold Chain", href: "/coldchain", Diagram: ColdChainCurve },
  { name: "Verify a Unit", href: "/verify", Diagram: HospitalScene },
  { name: "Warehouse (WMS)", href: "/warehouse", Diagram: FefoShelf },
];

export function Landing() {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGL();
  const animate = webgl && !reduced;

  // Real platform figures — the honest answer to a vanity stat. These come from
  // the live data engine, so they are never a fabricated "1.98".
  const data = getData();
  const stats = [
    { value: formatCompact(data.serials.length), label: "Serials under trace" },
    { value: String(data.facilities.length), label: "Facilities on the network" },
    { value: String(data.shipments.length), label: "Shipments in motion" },
    { value: "7", label: "Regulatory markets modelled" },
  ];

  return (
    <div className="ed-stage relative min-h-screen overflow-x-clip">
      <SmoothScroll />
      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
          <Link href="#top" className="ed-display text-lg tracking-tight text-warm-strong">
            VITAL<span className="text-[var(--color-ed-accent)]">CHAIN</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="ed-eyebrow text-warm/70 transition-colors hover:text-warm-strong"
              >
                {n.label}
              </a>
            ))}
          </div>
          <Link
            href="/"
            className="ed-cta inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          >
            Enter <ArrowRight size={15} />
          </Link>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section id="top" className="relative flex min-h-screen flex-col justify-center">
        {/* WebGL canvas: full-bleed, click-through so CTAs stay live. */}
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {animate && <HeroScene animate />}
          {webgl && !animate && <HeroScene animate={false} />}
        </div>
        {/* Legibility scrim under the headline. */}
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden="true"
          style={{ background: "linear-gradient(90deg, var(--color-ink) 0%, #06070899 42%, transparent 78%)" }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-24 lg:px-10">
          <SplitText
            as="p"
            text="Pharmaceutical supply-chain intelligence"
            className="ed-eyebrow block text-[var(--color-ed-accent)]"
            stagger={24}
          />
          <h1 className="ed-display ed-hero-mark mt-5 text-warm-strong">
            <SplitText as="span" text="VITALCHAIN" className="block" stagger={70} delay={120} />
          </h1>
          <SplitText
            as="p"
            text="Catch the bad batch before it reaches a patient."
            className="ed-display mt-6 block max-w-3xl text-2xl leading-[1.1] text-warm/90 lg:text-4xl"
            stagger={26}
            delay={420}
          />
          <Reveal delay={900} className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="ed-cta inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Enter the command center <ArrowRight size={16} />
            </Link>
            <a
              href="#film"
              className="ed-ghost inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium"
            >
              <Play size={15} /> Watch the film
            </a>
          </Reveal>

          {/* Service chips */}
          <Reveal delay={1100} className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm text-warm/60">
            {SERVICES.map((s) => (
              <span key={s} className="ed-eyebrow !tracking-[0.18em]">{s}</span>
            ))}
          </Reveal>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-warm/50">
          <div className="ed-bob flex flex-col items-center gap-1">
            <span className="ed-eyebrow !text-[0.6rem]">Scroll</span>
            <span className="h-8 w-px bg-warm/30" />
          </div>
        </div>
      </section>

      {/* ── Services marquee ────────────────────────────────────── */}
      <div className="ed-marquee-row relative overflow-hidden border-y border-white/10 py-6">
        <div className="ed-marquee">
          {[0, 1].map((dup) => (
            <span key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center">
              {SERVICES.map((s) => (
                <span key={s} className="ed-display flex items-center text-3xl text-warm/80 lg:text-5xl">
                  <span className="px-6">{s}</span>
                  <span className="text-[var(--color-ed-accent)]">/</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── Platform statement + features ───────────────────────── */}
      <section id="platform" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 lg:px-10 lg:py-36">
        <SplitText
          as="h2"
          text="One command center for the journey from factory to bedside."
          className="ed-display ed-h2 max-w-5xl text-warm-strong"
          stagger={32}
        />
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-warm/60">
          Track &amp; trace, cold chain, quality surveillance, FEFO inventory and recall
          reconciliation — unified, real-time, and built India-first for CDSCO.
        </p>

        <div className="mt-20 space-y-28">
          {FEATURES.map((f, i) => {
            const flip = i % 2 === 1;
            const Diagram = f.Diagram;
            return (
              <div key={f.tag} className="grid items-center gap-10 md:grid-cols-2 lg:gap-20">
                <Reveal className={flip ? "md:order-2" : ""}>
                  <p className="ed-eyebrow text-[var(--color-ed-accent)]">{f.tag}</p>
                  <SplitText
                    as="h3"
                    text={f.title}
                    className="ed-display mt-4 block text-3xl leading-[1.05] text-warm-strong lg:text-5xl"
                    stagger={28}
                  />
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-warm/60 lg:text-lg">{f.body}</p>
                  <Link
                    href={f.href}
                    className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-warm-strong transition-all hover:gap-3"
                  >
                    Open {f.tag} <ArrowUpRight size={16} className="text-[var(--color-ed-accent)]" />
                  </Link>
                </Reveal>
                <Reveal delay={120} className={flip ? "md:order-1" : ""}>
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-2 p-6 lg:p-10">
                    <Diagram />
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Featured modules gallery ────────────────────────────── */}
      <section id="modules" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 lg:px-10">
        <div className="flex items-end justify-between gap-6">
          <SplitText as="h2" text="Featured modules" className="ed-display ed-h2 text-warm-strong" stagger={40} />
          <Link href="/" className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-warm/70 transition-all hover:gap-3 hover:text-warm-strong sm:inline-flex">
            All modules <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Diagram = m.Diagram;
            return (
              <Reveal key={m.href}>
                <Link
                  href={m.href}
                  className="ed-tile group block overflow-hidden rounded-3xl border border-white/10 bg-ink-2"
                >
                  <div className="overflow-hidden p-8">
                    <Diagram />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 px-7 py-5">
                    <span className="ed-display text-xl text-warm-strong">{m.name}</span>
                    <ArrowUpRight size={20} className="text-warm/40 transition-colors group-hover:text-[var(--color-ed-accent)]" />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Film (Remotion promo — a real video asset) ──────────── */}
      <section id="film" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 lg:px-10">
        <Reveal className="text-center">
          <p className="ed-eyebrow text-[var(--color-ed-accent)]">The film</p>
          <SplitText as="h2" text="See it move." className="ed-display ed-h2 mt-3 block text-warm-strong" stagger={60} />
        </Reveal>
        <Reveal delay={150} className="mt-12">
          <PromoPlayer />
        </Reveal>
      </section>

      {/* ── Story + stats ───────────────────────────────────────── */}
      <section id="story" className="mx-auto max-w-7xl scroll-mt-24 border-t border-white/10 px-5 py-24 lg:px-10 lg:py-32">
        <SplitText
          as="h2"
          text="Built India-first, modelled for the world."
          className="ed-display ed-h2 max-w-4xl text-warm-strong"
          stagger={34}
        />
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-warm/60">
          VitalChain ingests CDSCO NSQ alerts, tracks Revised Schedule M readiness and coordinates
          cross-state recalls — with US DSCSA and EU FMD in the same data model.
        </p>
        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-ink-2 px-6 py-10">
              <div className="ed-display text-4xl tabular-nums text-[var(--color-ed-accent)] lg:text-5xl">{s.value}</div>
              <div className="mt-2 text-sm leading-snug text-warm/55">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Big closing CTA ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-28 lg:px-10">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-24 text-center lg:py-36"
          style={{ background: "radial-gradient(800px 420px at 50% -10%, #a1ecff22 0%, transparent 60%), var(--color-ink-2)" }}
        >
          <SplitText
            as="h2"
            text="Let's talk."
            className="ed-display block text-warm-strong"
            wordClassName={() => "text-[clamp(3rem,11vw,9rem)]"}
            stagger={80}
          />
          <p className="mx-auto mt-6 max-w-xl text-lg text-warm/60">
            Open the command center and watch trace, cold chain, quality and recalls update together.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/" className="ed-cta inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold">
              Enter the command center <ArrowRight size={16} />
            </Link>
            <a href="mailto:hello@vitalchain.app" className="ed-ghost inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-medium">
              Talk to the team
            </a>
          </div>
        </div>

        <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-warm/40 sm:flex-row">
          <span className="ed-display text-warm/70">VITAL<span className="text-[var(--color-ed-accent)]">CHAIN</span></span>
          <span>© 2026 VitalChain · Pharma supply-chain intelligence</span>
        </footer>
      </section>
    </div>
  );
}
