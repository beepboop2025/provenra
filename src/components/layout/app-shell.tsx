"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Snowflake,
  PackageSearch,
  ShieldCheck,
  ScanLine,
  LayoutDashboard,
  FlaskConical,
  Warehouse,
  ClipboardCheck,
  Clapperboard,
  Bell,
  Globe,
  Menu,
  X,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getData } from "@/lib/data/engine";
import { Badge } from "@/components/ui/primitives";

const NAV = [
  { href: "/", label: "Command Center", icon: LayoutDashboard, module: null },
  { href: "/trace", label: "Track & Trace", icon: ScanLine, module: "trace" },
  { href: "/quality", label: "Quality & NSQ Watch", icon: FlaskConical, module: "quality" },
  { href: "/qms", label: "QMS — Deviations & CAPA", icon: ClipboardCheck, module: "qms" },
  { href: "/coldchain", label: "Cold Chain", icon: Snowflake, module: "coldchain" },
  { href: "/warehouse", label: "Warehouse (WMS)", icon: Warehouse, module: "warehouse" },
  { href: "/inventory", label: "Shortage & Inventory", icon: PackageSearch, module: "inventory" },
  { href: "/compliance", label: "Recall & Compliance", icon: ShieldCheck, module: "compliance" },
  { href: "/verify", label: "Verify a Unit", icon: Activity, module: null },
  { href: "/intro", label: "Intro", icon: Clapperboard, module: null },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const data = getData();

  const unacked = data.alerts.filter((a) => !a.acknowledged);
  const critical = unacked.filter((a) => a.severity === "critical").length;

  const counts: Record<string, number> = {};
  for (const a of unacked) counts[a.module] = (counts[a.module] ?? 0) + 1;

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--color-border)] px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Activity size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-display text-[15px] font-bold leading-none tracking-tight">
              Vital<span className="text-[var(--color-brand)]">Chain</span>
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-faint)]">
              Supply Chain Intelligence
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const badge = item.module ? counts[item.module] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-[var(--color-brand)]/12 text-[var(--color-brand)] shadow-[inset_2px_0_0_0_var(--color-brand)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                )}
              >
                <Icon size={18} />
                <span className="flex-1 font-medium">{item.label}</span>
                {badge ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-danger)]/20 px-1 text-[10px] font-semibold text-[var(--color-danger)]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-fg)]">
            <CircleDot size={13} className="text-[var(--color-ok)] vc-pulse" />
            Live ingest active
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-faint)]">
            {data.facilities.length} facilities · {data.shipments.length} shipments ·{" "}
            {data.serials.length.toLocaleString("en-IN")} serials tracked
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-violet)]/20 text-xs font-semibold text-[var(--color-violet)]">
              QA
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">Quality &amp; Compliance</div>
              <div className="truncate text-[10px] text-[var(--color-faint)]">
                Enterprise · CDSCO workspace
              </div>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 px-4 backdrop-blur-md lg:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone="brand" pulse>
              CDSCO · India
            </Badge>
            <span className="text-xs text-[var(--color-faint)]">
              Multi-market workspace
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]">
              <Globe size={15} />
              <span className="hidden sm:inline">IN · INR</span>
            </button>
            <Link
              href="/compliance"
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
              aria-label="Alerts"
            >
              <Bell size={17} />
              {critical > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-critical)] px-1 text-[9px] font-bold text-white">
                  {critical}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
