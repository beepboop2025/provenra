import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldAlert,
  Snowflake,
  PackageSearch,
  ScanLine,
  ClipboardCheck,
  Warehouse,
  FileWarning,
  BadgeCheck,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { PromoPlayer } from "@/components/promo/promo-player";

export const metadata: Metadata = {
  title: "VitalChain — Catch the bad batch before it reaches a patient",
  description:
    "VitalChain unifies GS1 track & trace, cold-chain monitoring, NSQ quality surveillance, QMS, warehouse and recall into one pharma supply-chain command center. Built India-first, ready for global markets.",
  alternates: { canonical: "/intro" },
};

// Voice-of-customer FAQ — also emitted as FAQPage schema so AI answer engines
// (ChatGPT, Perplexity, Google AI Overviews) can extract and cite it.
const FAQS = [
  {
    q: "What does VitalChain do?",
    a: "VitalChain runs a pharmaceutical supply chain from one screen. It tracks serialized packs, watches cold-chain temperature, matches quality-failure alerts to stock you hold, manages deviations and recalls, and predicts shortages.",
  },
  {
    q: "Is it built for Indian pharma regulations?",
    a: "Yes. VitalChain ingests CDSCO NSQ drug alerts, tracks Revised Schedule M GMP readiness, coordinates cross-state recalls, and gates liquid-oral release on DEG/EG clearance. The data model also covers US DSCSA and EU FMD for exports.",
  },
  {
    q: "How does it catch substandard (NSQ) drugs?",
    a: "It reads the monthly CDSCO Not-of-Standard-Quality alerts and matches each failing batch against inventory you still hold, then quarantines or recalls the affected units. Substandard batches outnumber counterfeits in India by roughly 100 to 1, so this is the first line of defense.",
  },
  {
    q: "Can it tell freeze damage from a warm shipment?",
    a: "Yes. VitalChain computes mean kinetic temperature for each shipment and separates freeze excursions from heat excursions. Freezing destroys insulin and vaccines without a visible sign, and manual logs miss about 95 percent of these events.",
  },
  {
    q: "Does it support global markets?",
    a: "VitalChain ships India-first with US, EU, UAE, Singapore and Brazil already in the data model. Each market carries its own regulator and serialization scheme, so expansion is a configuration change.",
  },
  {
    q: "Is the data real?",
    a: "The quality, recall and shortage modules can run on real public feeds (CDSCO, openFDA, NPPA). The operational modules (track & trace, cold chain, inventory, warehouse, QMS) use deterministic simulated data, because that data only exists inside an operating company's own systems.",
  },
];

const PROBLEMS = [
  {
    icon: FileWarning,
    title: "Substandard beats counterfeit",
    body: "3-7% of Indian drug batches fail quality standards. Counterfeits sit below 0.05%. VitalChain reads CDSCO alerts and flags failing batches already on your shelves.",
  },
  {
    icon: Snowflake,
    title: "Freezing ruins vaccines in silence",
    body: "Manual cold-chain logs miss about 95% of excursions. Freezing destroys insulin and biologics with no visible sign. VitalChain computes MKT and isolates freeze damage.",
  },
  {
    icon: PackageSearch,
    title: "One supplier triggers a shortage",
    body: "India imports roughly 70% of its drug ingredients. A single blocked source empties shelves nationwide. VitalChain scores resilience and predicts stockouts early.",
  },
];

const MODULES = [
  { icon: ScanLine, name: "Track & Trace", benefit: "Trace any pack from factory to pharmacy and spot counterfeits by their scan pattern." },
  { icon: Snowflake, name: "Cold Chain", benefit: "Know which shipment lost potency, not just which one got warm." },
  { icon: FileWarning, name: "Quality / NSQ", benefit: "Match every CDSCO failure alert to stock you still hold." },
  { icon: ClipboardCheck, name: "QMS — CAPA", benefit: "Turn a deviation into a closed CAPA with the audit trail intact." },
  { icon: Warehouse, name: "Warehouse (WMS)", benefit: "Ship the oldest stock first and catch every FEFO violation." },
  { icon: PackageSearch, name: "Inventory", benefit: "Forecast demand and flag the ingredients you single-source." },
  { icon: ShieldAlert, name: "Recall & Compliance", benefit: "Run a cross-state recall that India has no central system for." },
  { icon: BadgeCheck, name: "Verify", benefit: "Authenticate a pack at the counter before it reaches the patient." },
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

export default function IntroPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 pb-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="pt-2">
        <Badge tone="brand" pulse>
          Pharma supply-chain intelligence
        </Badge>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight lg:text-6xl">
          Catch the bad batch
          <br />
          <span className="text-[var(--color-brand)]">before it reaches a patient.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
          VitalChain pulls track &amp; trace, cold chain, quality, inventory and recalls into one
          command center. Built for India&apos;s pharma supply chain, ready for global markets.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-[#04201c] transition-colors hover:bg-[#5fe6d6]"
          >
            Enter the command center <ArrowRight size={16} />
          </Link>
          <Link
            href="/quality"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-surface-2)]"
          >
            See the NSQ watch
          </Link>
        </div>
      </section>

      {/* Promo */}
      <section>
        <Card className="p-3 sm:p-4">
          <PromoPlayer />
        </Card>
        <p className="mt-3 text-center text-xs text-[var(--color-faint)]">
          Every frame renders in React with Remotion. No video file, fully responsive.
        </p>
      </section>

      {/* Problems */}
      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          The failures that reach patients are quiet ones.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
          VitalChain weights its modules toward the risks that actually hurt people in India, not the
          ones that make headlines abroad.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.title} className="p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand)]/12 text-[var(--color-brand)]">
                  <Icon size={20} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{p.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Modules */}
      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">Eight modules, one chain.</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">From the plant floor to the dispensing counter.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.name}
                className="vc-card flex gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-brand)]">
                  <Icon size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{m.name}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">{m.benefit}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">Questions, answered.</h2>
        <div className="mt-6 divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/80">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-5 py-4 [&_summary]:cursor-pointer">
              <summary className="flex items-center justify-between gap-3 text-sm font-medium marker:content-['']">
                {f.q}
                <ArrowRight
                  size={15}
                  className="shrink-0 text-[var(--color-faint)] transition-transform group-open:rotate-90"
                />
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">See your supply chain in one screen.</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--color-muted)]">
          Open the command center and watch trace, cold chain, quality and recalls update together.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-[#04201c] transition-colors hover:bg-[#5fe6d6]"
        >
          Enter the command center <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
