# Provenra — Pharma Supply Chain Intelligence

Prototype pharmaceutical supply-chain dashboard covering serialization, cold-chain
monitoring, quality alerts, inventory, and recall workflows. The included data is
deterministic demo data, not a live operational feed.

Built with **Next.js 16 + TypeScript (strict) + Tailwind v4 + Recharts**, fronted by an
immersive **React Three Fiber + react-spring** marketing landing.

## The landing — `/intro`

The `/intro` route uses a WebGL hero, spring-based text motion, inertial scrolling,
and a scroll-driven camera.

![Provenra landing — hero](docs/screenshots/landing-hero.png)

| Platform / features | Mobile |
|---|---|
| ![Platform section](docs/screenshots/landing-platform.png) | <img src="docs/screenshots/landing-mobile.png" width="240" alt="Provenra landing on mobile" /> |

**How it's built**
- **3D hero** — `three` + `@react-three/fiber` + `@react-three/drei`: a liquid
  Perlin-noise blob (`MeshDistortMaterial`) under **bloom**
  (`@react-three/postprocessing`), with a scroll-driven camera dolly and pointer parallax.
  It is dynamically imported with `ssr:false` from a Client Component so WebGL does
  not run during server rendering.
- **Motion** — `@react-spring/web` physics (not CSS transitions): per-letter `useTrail`
  text reveals and `useSpring` scroll reveals, all `aria`-safe and
  `prefers-reduced-motion` aware.
- **Smooth scroll** — `lenis`, scoped to the landing only (the data-dense dashboard keeps
  native scrolling).
- **SEO preserved** — `/intro/page.tsx` stays a Server Component (metadata + JSON-LD)
  rendering a client landing; `AppShell` renders it full-bleed (no dashboard chrome).

## The seven modules

| Route | Module | What it does |
|-------|--------|--------------|
| `/` | **Command Center** | Demo KPIs, India network map, and priority alerts across all modules |
| `/trace` | **Track & Trace** | GS1 serialization, hash-chained chain-of-custody, anti-counterfeit risk scoring |
| `/quality` | **Quality & NSQ Watch** | CDSCO drug-alert ingestion, NSQ/spurious/DEG-EG detection, excipient integrity gating |
| `/coldchain` | **Cold Chain** | Demo temperature profiles, freeze and heat excursion logs, and Mean Kinetic Temperature |
| `/inventory` | **Shortage & Inventory** | Demand forecast, **FEFO** expiry, **API geopolitical / single-source risk** |
| `/compliance` | **Recall & Compliance** | Cross-state recall tracker, supplier risk, **Schedule M GMP readiness**, multi-market posture |
| `/verify` | **Verify a Unit** | Point-of-dispense authentication (the consumer/pharmacist anti-counterfeit tool) |

The quality, freeze-detection, API geo-risk, excipient, recall, and GMP-readiness
modules were informed by the sources collected in
[`PHARMA_SUPPLY_CHAIN_RESEARCH.md`](./PHARMA_SUPPLY_CHAIN_RESEARCH.md). Review that
document and its cited primary sources before relying on any regulatory assertion.

## Architecture

```
src/
  app/                 # one route per module (client components — interactive charts)
  components/
    layout/            # AppShell: sidebar + topbar with live alert badges
    ui/                # design-system primitives (Card, Badge, Progress, Sparkline…)
    dashboard/         # PageHeader, KpiCard, AlertFeed
    charts/            # Recharts wrappers (temp profile, demand forecast, donut, bars)
    map/               # dependency-free SVG India map with projected nodes + animated routes
    landing/           # /intro: WebGL hero scene, split-text motion,
                       #    reveal (spring), smooth-scroll (Lenis), SVG feature diagrams
  lib/
    types.ts           # domain model and regulatory vocabulary
    analytics.ts       # MKT, stock health, shortage/supplier scoring, FEFO
    risk.ts            # anti-counterfeit scoring engine (tunable business logic)
    data/
      seed.ts          # India pharma hubs, drug catalogue, markets, carriers
      engine.ts        # deterministic seeded data generator (no Math.random scatter)
    kpis.ts, format.ts, utils.ts
```

### Key design decisions
- **Deterministic seeded data** (`mulberry32`) so the same serial always resolves to
  the same genealogy — no React hydration mismatches, reproducible like a real ledger.
- **Domain model first.** `types.ts` encodes legally-defined relationships (batch →
  serial → recall) so the compiler enforces correctness everywhere.
- **Analytics isolated** from UI so scoring can be unit-tested / swapped for ML later.

## Run it

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build (Turbopack)
```

## Prototype boundaries and next steps
- Swap `lib/data/engine.ts` for a Postgres-backed data layer (Prisma) — the UI reads
  through typed accessors, so this is a drop-in.
- Add auth + RBAC (`proxy.ts`) for the enterprise multi-tenant story.
- Wire real IoT telemetry (cold chain) and GS1 EPCIS feeds (track & trace).
- Plug in a forecasting microservice (Python) behind the demand API.
