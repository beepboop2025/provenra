"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SplitText } from "@/components/landing/split-text";
import { Reveal } from "@/components/landing/reveal";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { CommandNav } from "@/components/command/command-nav";
import { CommandLoader } from "@/components/command/command-loader";

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

/**
 * The shared immersive page shell for every Editorial module page. Provides the
 * same furniture as the Command Center — assets-loader preloader, Lenis smooth
 * scroll, the Editorial top nav + full-screen index, the fluid-rem grid, a blob
 * hero with spring-revealed title, and the footer — so each page wraps its own
 * data content in `<CommandShell>…</CommandShell>` and inherits the whole look.
 *
 * Token overrides on `.ed-stage` (in globals.css) re-skin the shared Card/Badge/
 * Progress primitives the page content uses, so `children` need no changes.
 */
export function CommandShell({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGL();
  const animate = webgl && !reduced;

  useEffect(() => {
    document.documentElement.classList.add("cc-fluid");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => document.documentElement.classList.remove("cc-fluid");
  }, []);

  return (
    <div className="cc-stage ed-stage relative min-h-screen overflow-x-clip">
      <CommandLoader />
      <SmoothScroll />
      <CommandNav />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[82vh] flex-col items-center justify-center overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-55" aria-hidden="true">
          {webgl && <HeroScene animate={animate} />}
        </div>
        <div className="absolute inset-0 z-[1] bg-black/45" aria-hidden="true" />
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden="true"
          style={{ background: "radial-gradient(115% 80% at 50% 42%, transparent 26%, #000000 100%)" }}
        />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-24">
          <div className="flex items-center justify-center gap-3">
            {icon && (
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-[var(--color-ed-accent)]">
                {icon}
              </span>
            )}
            <p className="ed-eyebrow text-[var(--color-ed-accent)]">{eyebrow}</p>
          </div>

          <h1 className="cc-ink ed-display mt-6 text-[clamp(2.3rem,8vw,7rem)] leading-[0.95]">
            <SplitText as="span" text={title} delay={140} />
          </h1>

          {subtitle && (
            <SplitText
              as="p"
              text={subtitle}
              className="mx-auto mt-7 block max-w-2xl text-base leading-relaxed text-warm/75 lg:text-lg"
              delay={460}
            />
          )}

          {actions && (
            <Reveal delay={820} className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {actions}
            </Reveal>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-warm/50">
          <div className="ed-bob flex flex-col items-center gap-1">
            <span className="ed-eyebrow !text-[0.6rem]">Scroll</span>
            <span className="h-8 w-px bg-warm/30" />
          </div>
        </div>
      </section>

      {/* ── Page content (auto-skinned via .ed-stage token overrides) ──── */}
      <Reveal as="section" className="mx-auto max-w-7xl space-y-6 px-5 pb-24 lg:px-10">
        {children}
      </Reveal>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-5 pb-16 pt-8 text-sm text-warm/40 lg:px-10 sm:flex-row">
        <span className="ed-display text-warm/70">
          <span className="cc-mark-box" aria-hidden="true" />
          VITAL<span className="cc-ink">CHAIN</span>
        </span>
        <span>© 2026 Provenra · Pharma supply-chain intelligence</span>
      </footer>
    </div>
  );
}
