"use client";

import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { ProvenraPromo, PROMO } from "@/remotion/ProvenraPromo";

/**
 * Client-side Remotion player. Renders the promo composition live in the browser
 * (no server-side video render needed) so it ships with the static site and
 * inherits the page's Fira fonts.
 *
 * Mount-gated: the page is statically prerendered, but the Player relies on
 * browser APIs, so we render a sized placeholder until after hydration to avoid
 * an SSR/prerender failure and layout shift.
 */
export function PromoPlayer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const frame = {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: "var(--radius-card)",
    overflow: "hidden",
    border: "1px solid var(--color-border)",
  } as const;

  if (!mounted) {
    return (
      <div
        style={{ ...frame, background: "var(--color-surface)" }}
        aria-label="Loading Provenra intro animation"
      />
    );
  }

  return (
    <Player
      component={ProvenraPromo}
      durationInFrames={PROMO.durationInFrames}
      fps={PROMO.fps}
      compositionWidth={PROMO.width}
      compositionHeight={PROMO.height}
      autoPlay
      loop
      controls
      style={{ ...frame, boxShadow: "var(--shadow-lift)" }}
    />
  );
}
