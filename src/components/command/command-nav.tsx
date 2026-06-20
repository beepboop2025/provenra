"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Editorial-edition top navigation for the full-bleed Command Center.
 *
 * The dashboard normally lives inside AppShell's sidebar, but on the immersive
 * `/` route that chrome is gone — so this bar must own all navigation. The
 * compromise that keeps it both faithful to the aesthetic and fully usable: a slim
 * bar carries the wordmark + a few core links + a "Verify" CTA, while a
 * full-screen index menu (very on-brand for agency sites) exposes every route
 * as oversized `ed-display` links.
 */

const CORE = [
  { href: "/trace", label: "Track & Trace" },
  { href: "/coldchain", label: "Cold Chain" },
  { href: "/quality", label: "Quality" },
  { href: "/inventory", label: "Inventory" },
  { href: "/compliance", label: "Compliance" },
] as const;

// Every destination, for the full-screen index. `kind` groups them visually.
const INDEX: { href: string; label: string; kind: "module" | "tool" }[] = [
  { href: "/", label: "Command Center", kind: "module" },
  { href: "/trace", label: "Track & Trace", kind: "module" },
  { href: "/quality", label: "Quality & NSQ Watch", kind: "module" },
  { href: "/qms", label: "QMS — Deviations & CAPA", kind: "module" },
  { href: "/coldchain", label: "Cold Chain", kind: "module" },
  { href: "/warehouse", label: "Warehouse (WMS)", kind: "module" },
  { href: "/inventory", label: "Shortage & Inventory", kind: "module" },
  { href: "/compliance", label: "Recall & Compliance", kind: "module" },
  { href: "/intel", label: "Global Intel (AI)", kind: "tool" },
  { href: "/verify", label: "Verify a Unit", kind: "tool" },
  { href: "/intro", label: "The Film / Intro", kind: "tool" },
];

export function CommandNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Solidify the bar once the hero has scrolled past, like the landing's nav.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll + allow Esc to close while the index menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          scrolled && !menuOpen
            ? "border-b border-white/10 bg-black/70 backdrop-blur-md"
            : "border-b border-transparent"
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/intro" className="ed-display text-lg tracking-tight text-warm-strong">
            VITAL<span className="text-[var(--color-ed-accent)]">CHAIN</span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {CORE.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "ed-eyebrow transition-colors hover:text-warm-strong",
                    active ? "text-[var(--color-ed-accent)]" : "text-warm/65"
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="ed-cta hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex"
            >
              Verify a unit <ArrowUpRight size={15} />
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation index"
              className="ed-ghost inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            >
              <Menu size={16} /> <span className="hidden sm:inline">Index</span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Full-screen index menu ──────────────────────────────────────── */}
      {menuOpen && (
        <div className="cc-menu fixed inset-0 z-[60] overflow-y-auto">
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-4 lg:px-10">
            <div className="flex items-center justify-between py-1">
              <span className="ed-display text-lg text-warm-strong">
                VITAL<span className="text-[var(--color-ed-accent)]">CHAIN</span>
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation index"
                className="ed-ghost inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              >
                Close <X size={16} />
              </button>
            </div>

            <p className="ed-eyebrow mt-10 text-[var(--color-ed-accent)]">Modules</p>
            <div className="mt-5 grid gap-x-10 sm:grid-cols-2">
              {INDEX.filter((i) => i.kind === "module").map((item, i) => (
                <MenuLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  index={i}
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </div>

            <p className="ed-eyebrow mt-12 text-[var(--color-ed-accent)]">Tools</p>
            <div className="mt-5 grid gap-x-10 sm:grid-cols-2">
              {INDEX.filter((i) => i.kind === "tool").map((item, i) => (
                <MenuLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  index={i + 8}
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </div>

            <footer className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-8 pb-2 text-sm text-warm/40 sm:flex-row sm:items-center sm:justify-between">
              <span>© 2026 VitalChain · Pharma supply-chain intelligence</span>
              <span className="ed-eyebrow">CDSCO · India · multi-market</span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function MenuLink({
  item,
  active,
  index,
  onClick,
}: {
  item: { href: string; label: string };
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        "cc-menu-item group flex items-center justify-between gap-4 border-b border-white/10 py-4",
        active ? "text-[var(--color-ed-accent)]" : "text-warm-strong"
      )}
    >
      <span className="ed-display text-2xl transition-transform duration-300 group-hover:translate-x-1.5 lg:text-3xl">
        {item.label}
      </span>
      <ArrowUpRight
        size={22}
        className="shrink-0 text-warm/30 transition-colors group-hover:text-[var(--color-ed-accent)]"
      />
    </Link>
  );
}
