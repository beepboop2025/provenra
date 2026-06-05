import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Building2,
  Truck,
  ScanLine,
  Snowflake,
  FileWarning,
  ClipboardCheck,
  Warehouse,
  PackageSearch,
  ShieldAlert,
  BadgeCheck,
  LayoutDashboard,
} from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import {
  SupplyChainJourney,
  TraceVial,
  ColdChainCurve,
  HospitalScene,
  FefoShelf,
} from "@/components/landing/diagrams";

export const metadata: Metadata = {
  title: "VitalChain — Catch the bad batch before it reaches a patient",
  description:
    "Pharma supply-chain command center for hospital chains and distributors. Catch recalled and substandard (NSQ) batches before they reach a patient, prove cold-chain integrity, enforce FEFO, and reconcile recalls across states. Built India-first.",
  alternates: { canonical: "/intro" },
};

// ─── PROOF METRICS — FILL THESE IN ──────────────────────────────────────────
// Replace each `value` with a real, verifiable figure once you have pilot data
// (never fabricate stats). Keep "—" until then; the strip restyles automatically.
const METRICS = [
  { value: "—", label: "NSQ batches caught in held stock", note: "" },
  { value: "—", label: "cold-chain excursions flagged", note: "" },
  { value: "—", label: "reduction in expiry write-offs", note: "" },
  { value: "—", label: "faster recall reconciliation", note: "" },
];

const FEATURES = [
  {
    tag: "Track & Trace",
    title: "Every pack, traceable to its origin.",
    body: "Serialize to the GS1 unit level and rebuild a hash-chained chain of custody for any pack. When a scan pattern looks wrong, the anti-counterfeit engine flags it before the pack moves again.",
    href: "/trace",
    cta: "Open Track & Trace",
    Diagram: TraceVial,
  },
  {
    tag: "Cold chain",
    title: "Catch the freeze that ruins a vaccine.",
    body: "VitalChain computes mean kinetic temperature for every shipment and separates freeze damage from heat. A vial that froze for twenty minutes looks fine on a label and fails a patient. Now you see it.",
    href: "/coldchain",
    cta: "Open Cold Chain",
    Diagram: ColdChainCurve,
  },
  {
    tag: "At the hospital",
    title: "Verify before it reaches the patient.",
    body: "Scan a pack at receiving or the bedside to confirm it is genuine and not under recall. Match every CDSCO quality alert against the stock your pharmacy and wards still hold.",
    href: "/verify",
    cta: "Open Verify",
    Diagram: HospitalScene,
  },
  {
    tag: "Warehouse",
    title: "Ship the oldest stock first.",
    body: "Enforce FEFO on every pick so near-expiry stock leaves before it becomes a write-off. Each violation surfaces the moment it happens, not at the next stock count.",
    href: "/warehouse",
    cta: "Open Warehouse",
    Diagram: FefoShelf,
  },
];

const AUDIENCES = [
  {
    icon: Building2,
    tag: "For hospital chains",
    headline: "Stop a recalled batch before it reaches a ward.",
    points: [
      "Confirm a pack is genuine and not recalled at receiving or the bedside.",
      "Match CDSCO NSQ alerts against ward and pharmacy stock you hold.",
      "Catch a silent freeze before insulin or a vaccine reaches a patient.",
      "Dispense oldest-expiry first and cut write-offs across every site.",
    ],
    href: "/verify",
    cta: "See point-of-dispense verify",
  },
  {
    icon: Truck,
    tag: "For distributors & C&F agents",
    headline: "Protect your margin from expiry and recalls.",
    points: [
      "Enforce FEFO so near-expiry stock ships before you write it off.",
      "Prove cold-chain integrity in transit with mean kinetic temperature.",
      "Reconcile a recall across every state and customer you supplied.",
      "Flag the single-source SKUs that turn into stockouts.",
    ],
    href: "/warehouse",
    cta: "See the warehouse (WMS)",
  },
];

const MODULES = [
  { icon: LayoutDashboard, name: "Command Center", href: "/" },
  { icon: ScanLine, name: "Track & Trace", href: "/trace" },
  { icon: FileWarning, name: "Quality / NSQ", href: "/quality" },
  { icon: ClipboardCheck, name: "QMS — CAPA", href: "/qms" },
  { icon: Snowflake, name: "Cold Chain", href: "/coldchain" },
  { icon: Warehouse, name: "Warehouse", href: "/warehouse" },
  { icon: PackageSearch, name: "Inventory", href: "/inventory" },
  { icon: ShieldAlert, name: "Recall & Compliance", href: "/compliance" },
  { icon: BadgeCheck, name: "Verify a Unit", href: "/verify" },
];

const FAQS = [
  {
    q: "Who is VitalChain for?",
    a: "Hospital chains and pharmaceutical distributors. Hospitals verify packs and catch recalled or NSQ batches in ward and pharmacy stock. Distributors enforce FEFO, prove cold-chain integrity, and reconcile recalls across states.",
  },
  {
    q: "Does it replace our ERP or hospital pharmacy system?",
    a: "No. VitalChain sits on top of the systems you run and adds the supply-chain intelligence they lack: NSQ matching, mean-kinetic-temperature cold-chain judgment, FEFO enforcement, and cross-state recall reconciliation.",
  },
  {
    q: "Is it built for Indian pharma regulations?",
    a: "Yes. It ingests CDSCO NSQ alerts, tracks Revised Schedule M GMP readiness, coordinates cross-state recalls, and gates liquid-oral release on DEG/EG clearance. The data model also covers US DSCSA and EU FMD.",
  },
  {
    q: "How does it catch substandard (NSQ) drugs?",
    a: "It reads the monthly CDSCO Not-of-Standard-Quality alerts and matches each failing batch against inventory you still hold, then quarantines or recalls the affected units.",
  },
  {
    q: "Does it support global markets?",
    a: "VitalChain ships India-first with US, EU, UAE, Singapore and Brazil in the data model. Each market carries its own regulator and serialization scheme, so expansion is a configuration change.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const card = "vc-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80";

export default function IntroPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pt-10 pb-16 lg:pt-16 lg:pb-24">
        <Reveal>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-brand)]">
            Pharma supply-chain intelligence
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--color-fg)] lg:text-6xl">
            Catch the bad batch
            <br />
            <span className="text-[var(--color-brand)]">before it reaches a patient.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
            Run hospital pharmacies or a distribution network? VitalChain unifies track &amp; trace,
            cold chain, quality and recalls into one command center. Built India-first.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[#04201c] transition-colors hover:bg-[#5fe6d6]"
            >
              Enter the command center <ArrowRight size={16} />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-surface-2)]"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <Reveal delay={120} className="mt-14">
          <div className={`${card} p-6 lg:p-10`}>
            <SupplyChainJourney />
          </div>
        </Reveal>
      </section>

      {/* ── Metrics strip ─────────────────────────────────────── */}
      <Reveal as="section" className="pb-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-4">
          {METRICS.map((m) => {
            const placeholder = m.value === "—" || m.value.trim() === "";
            return (
              <div key={m.label} className="bg-[var(--color-surface)] px-4 py-7 text-center">
                <div
                  className={`font-display text-3xl font-extrabold tabular-nums tracking-tight lg:text-4xl ${
                    placeholder ? "text-[var(--color-faint)]" : "text-[var(--color-brand)]"
                  }`}
                >
                  {placeholder ? "—" : m.value}
                </div>
                <div className="mt-1.5 text-xs leading-snug text-[var(--color-muted)]">{m.label}</div>
                {m.note ? <div className="mt-0.5 text-[10px] text-[var(--color-faint)]">{m.note}</div> : null}
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* ── How it works: alternating feature sections ────────── */}
      <div id="how" className="scroll-mt-20">
        {FEATURES.map((f, i) => {
          const flip = i % 2 === 1;
          const Diagram = f.Diagram;
          return (
            <section key={f.tag} className="grid items-center gap-8 py-16 md:grid-cols-2 lg:gap-14 lg:py-24">
              <Reveal className={flip ? "md:order-2" : ""}>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand)]">
                  {f.tag}
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[var(--color-fg)] lg:text-4xl">
                  {f.title}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-muted)] lg:text-lg">
                  {f.body}
                </p>
                <Link
                  href={f.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand)] transition-all hover:gap-3"
                >
                  {f.cta} <ArrowRight size={15} />
                </Link>
              </Reveal>
              <Reveal delay={120} className={flip ? "md:order-1" : ""}>
                <div className={`${card} p-6 lg:p-8`}>
                  <Diagram />
                </div>
              </Reveal>
            </section>
          );
        })}
      </div>

      {/* ── Buyer split ───────────────────────────────────────── */}
      <Reveal as="section" className="py-16 lg:py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--color-fg)] lg:text-4xl">
          Built for your side of the chain.
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          You receive and move medicine. VitalChain is shaped around that, not around the factory.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.tag} className={`flex flex-col ${card} p-7`}>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-brand)]/12 text-[var(--color-brand)]">
                    <Icon size={20} />
                  </span>
                  <span className="font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-faint)]">
                    {a.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-[var(--color-fg)]">{a.headline}</h3>
                <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                  {a.points.map((pt) => (
                    <li key={pt} className="flex gap-2.5 text-sm leading-relaxed text-[var(--color-muted)]">
                      <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link href={a.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand)] transition-all hover:gap-3">
                  {a.cta} <ArrowRight size={15} />
                </Link>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* ── Explore all modules (clickable) ───────────────────── */}
      <Reveal as="section" className="py-16 lg:py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--color-fg)] lg:text-4xl">Explore every module.</h2>
        <p className="mt-2 text-[var(--color-muted)]">Jump straight into any part of the platform.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`group flex items-center gap-3 ${card} px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand)]`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-brand)]">
                  <Icon size={17} />
                </span>
                <span className="text-sm font-semibold text-[var(--color-fg)]">{m.name}</span>
                <ArrowRight size={15} className="ml-auto text-[var(--color-faint)] transition-colors group-hover:text-[var(--color-brand)]" />
              </Link>
            );
          })}
        </div>
      </Reveal>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <Reveal as="section" className="py-16 lg:py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--color-fg)] lg:text-4xl">Questions, answered.</h2>
        <div className="mt-8 divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-5 [&_summary]:cursor-pointer">
              <summary className="flex items-center justify-between gap-3 text-base font-semibold text-[var(--color-fg)] marker:content-['']">
                {f.q}
                <ArrowRight size={16} className="shrink-0 text-[var(--color-faint)] transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </Reveal>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <Reveal as="section" className="pb-16">
        <div
          className="overflow-hidden rounded-3xl border border-[var(--color-brand)]/30 px-8 py-14 text-center"
          style={{
            background:
              "radial-gradient(700px 320px at 50% -20%, #2dd4bf26 0%, transparent 60%), var(--color-surface)",
          }}
        >
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[var(--color-fg)] lg:text-4xl">
            See your supply chain in one screen.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--color-muted)]">
            Open the command center and watch trace, cold chain, quality and recalls update together.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[#04201c] transition-colors hover:bg-[#5fe6d6]"
          >
            Enter the command center <ArrowRight size={16} />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
