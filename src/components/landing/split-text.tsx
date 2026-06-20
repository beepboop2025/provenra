"use client";

import { createElement, useEffect, useRef, useState, type ElementType } from "react";
import { cn } from "@/lib/utils";

/**
 * Word-by-word reveal — the Textura signature, done correctly.
 *
 * Why this avoids Textura's bugs:
 *  - DETERMINISTIC markup: the split happens by `String.split(" ")`, identical
 *    on server and client, so React never reports a hydration mismatch
 *    (Textura threw React #418/#423 on every load by splitting differently).
 *  - ACCESSIBLE: the container carries the full string as its accessible name
 *    and the visual word-shards are `aria-hidden`, so a screen reader reads
 *    one clean sentence instead of spelling it out letter-by-letter.
 *  - MOTION-SAFE: a CSS guard (`prefers-reduced-motion`) parks every word in
 *    its final position, so content is never hidden when motion is off.
 *
 * Each word sits in a clip mask; its inner span starts translated 110% down
 * and slides to 0 once the block scrolls into view (one-shot IntersectionObserver).
 */
export function SplitText({
  text,
  as: Tag = "span",
  className,
  wordClassName,
  stagger = 55,
  delay = 0,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  /** Per-word class — handy for accenting specific words via a parallel array. */
  wordClassName?: (word: string, index: number) => string | undefined;
  /** Milliseconds between consecutive word reveals. */
  stagger?: number;
  /** Initial delay before the first word reveals (ms). */
  delay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = text.split(" ");

  // Rendered via createElement rather than `<Tag>…</Tag>`: a polymorphic tag
  // typed as the wide `ElementType` collapses its JSX `children` prop to
  // `never`, so JSX children fail to type-check. createElement keeps the same
  // output (and the ref) without that error.
  return createElement(
    Tag,
    {
      ref,
      "aria-label": text,
      className: cn("tx-split", shown && "tx-in", className),
    },
    words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" className="tx-split-word">
          <span
            className={cn("tx-split-inner", wordClassName?.(word, i))}
            style={{ transitionDelay: `${delay + i * stagger}ms` }}
          >
            {word}
          </span>
          {/* real space between words so the line wraps naturally */}
          {i < words.length - 1 ? " " : ""}
        </span>
      )),
  );
}
