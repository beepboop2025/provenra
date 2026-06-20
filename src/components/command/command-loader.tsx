"use client";

import { useEffect, useState } from "react";
import { animated, useSpring } from "@react-spring/web";

/**
 * Assets-loader preloader — Textura's signature open (discovery §4.3: the root
 * is emitted at opacity 0 and an `assets-loader-layout` fades the content in
 * once ready). Here: a black stage with the wordmark and a thin counter that
 * runs to 100, then springs away to reveal the Command Center.
 *
 * Spring-physics only (no CSS keyframes), matching Textura's motion philosophy.
 * Under reduced motion it resolves instantly. The counter is cosmetic — it is
 * not wired to real asset progress, so it never blocks interaction.
 */
export function CommandLoader() {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Drive the counter 0 → 100 over ~1.1s, then dismiss.
  useEffect(() => {
    if (reduced) {
      setPct(100);
      setDone(true);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      // ease-out so it decelerates into 100, like a settling spring
      setPct(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 180);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const styles = useSpring({
    opacity: done ? 0 : 1,
    config: { tension: 180, friction: 28 },
    immediate: reduced,
  });

  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setGone(true), reduced ? 0 : 700);
    return () => clearTimeout(id);
  }, [done, reduced]);

  if (gone) return null;

  return (
    <animated.div
      aria-hidden="true"
      style={{ opacity: styles.opacity, pointerEvents: done ? "none" : "auto" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
    >
      <div className="tx-display text-3xl tracking-tight text-warm-strong lg:text-4xl">
        <span className="cc-mark-box" />
        VITAL<span className="cc-ink">CHAIN</span>
      </div>
      <div className="mt-8 h-px w-48 overflow-hidden bg-white/10">
        <div className="h-full cc-ink-bar" style={{ width: `${pct}%`, background: "var(--accent-grad)" }} />
      </div>
      <div className="mt-3 text-xs tabular-nums text-warm/45">{pct}%</div>
    </animated.div>
  );
}
