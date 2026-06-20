"use client";

import { createElement, useEffect, useRef, useState, type ElementType } from "react";
import { animated, useSpring } from "@react-spring/web";

/**
 * Scroll-reveal wrapper, spring-physics edition (built on react-spring
 * approach rather than CSS transitions). Springs from translated+transparent to
 * resting when the element scrolls into view (once). `delay` staggers siblings;
 * reduced-motion makes it immediate.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const styles = useSpring({
    opacity: shown ? 1 : 0,
    y: shown ? 0 : 34,
    from: { opacity: 0, y: 34 },
    config: { tension: 210, friction: 30 },
    delay,
    immediate: reduced,
  });

  const A = animated[Tag] as ElementType;
  return createElement(
    A,
    {
      ref,
      className,
      style: {
        opacity: styles.opacity,
        transform: styles.y.to((v) => `translateY(${v}px)`),
      },
    },
    children,
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
