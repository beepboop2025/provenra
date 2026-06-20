"use client";

import { createElement, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { animated, useTrail } from "@react-spring/web";
import { cn } from "@/lib/utils";

/**
 * Per-letter spring reveal — Textura's actual technique (physics springs, not
 * CSS transitions), via @react-spring/web `useTrail` for the staggered cascade.
 *
 * Faithful to their spring-text-engine while keeping the bugs out:
 *  - ACCESSIBLE/SEO: the container carries the full string as its accessible
 *    name; the per-letter shards are `aria-hidden`, so screen readers read one
 *    clean sentence and crawlers still see the text.
 *  - DETERMINISTIC: identical markup on server and client → no hydration crash.
 *  - MOTION-SAFE: `prefers-reduced-motion` makes the springs immediate.
 *
 * Letters are grouped per word in `white-space: nowrap` spans so words never
 * break mid-letter, while the trail index runs continuously for one smooth wave.
 */
export function SplitText({
  text,
  as: Tag = "span",
  className,
  wordClassName,
  delay = 0,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  wordClassName?: (word: string, index: number) => string | undefined;
  /** Delay before the cascade starts (ms). */
  delay?: number;
  /** Accepted for call-site compatibility; spacing is now governed by spring physics. */
  stagger?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const reduced = useReducedMotion();

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

  const words = useMemo(() => text.split(" "), [text]);
  const letterCount = useMemo(
    () => words.reduce((n, w) => n + [...w].length, 0),
    [words],
  );

  const trail = useTrail(letterCount, {
    opacity: shown ? 1 : 0,
    y: shown ? 0 : 26,
    from: { opacity: 0, y: 26 },
    config: { tension: 260, friction: 26 },
    delay,
    immediate: reduced,
  });

  let idx = 0;
  return createElement(
    Tag,
    {
      ref,
      "aria-label": text,
      className: cn("tx-split", shown && "tx-in", className),
    },
    words.map((word, wi) => {
      const letters = [...word].map((ch) => {
        const s = trail[idx++];
        return (
          <animated.span
            key={`${wi}-${idx}`}
            aria-hidden="true"
            style={{
              display: "inline-block",
              opacity: s.opacity,
              transform: s.y.to((v) => `translateY(${v}px)`),
            }}
          >
            {ch}
          </animated.span>
        );
      });
      return (
        <span
          key={wi}
          aria-hidden="true"
          className={cn("tx-word", wordClassName?.(word, wi))}
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {letters}
          {wi < words.length - 1 ? " " : ""}
        </span>
      );
    }),
  );
}

function useReducedMotion() {
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
