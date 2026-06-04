import { format, formatDistanceToNowStrict, differenceInDays } from "date-fns";

/**
 * Null-safe formatters. Every numeric value coming from the data engine could
 * theoretically be undefined; guarding here prevents the classic
 * "Cannot read .toFixed of undefined" crash in dashboards.
 */

/** Format an Indian Rupee amount with lakh/crore-aware abbreviations. */
export function formatINR(value: number | null | undefined): string {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Format a USD amount with K/M/B abbreviations (for international view). */
export function formatUSD(value: number | null | undefined): string {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/** Compact number formatting (12.3K, 4.5M). */
export function formatCompact(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Full number with thousands separators (Indian grouping). */
export function formatNumber(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return n.toLocaleString("en-IN");
}

/** Percentage with fixed decimals. */
export function formatPct(
  value: number | null | undefined,
  decimals = 1
): string {
  const n = Number(value) || 0;
  return `${n.toFixed(decimals)}%`;
}

/** Temperature in °C. */
export function formatTemp(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return `${n.toFixed(1)}°C`;
}

/** Short date: 04 Jun 2026. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy");
}

/** Date + time: 04 Jun 2026, 14:30. */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy, HH:mm");
}

/** Relative time: "3 hours ago". */
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return `${formatDistanceToNowStrict(d)} ago`;
}

/** Days until a date (negative = expired). */
export function daysUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return 0;
  return differenceInDays(d, new Date());
}

/** Human-readable shelf-life label. */
export function shelfLifeLabel(expiry: Date | string): string {
  const days = daysUntil(expiry);
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  if (days < 90) return `${days}d left`;
  if (days < 365) return `${Math.round(days / 30)}mo left`;
  return `${(days / 365).toFixed(1)}y left`;
}
