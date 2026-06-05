/**
 * Global Pharma Intelligence — shared types for the cloud agent pipeline.
 *
 * Two agents produce this data, both running on Vercel (no laptop involved):
 *  1. Collector agent  — pulls real public sources (openFDA recalls + shortages).
 *  2. Analyst agent     — Claude consolidates/structures them into a briefing.
 */

export type IntelKind = "recall" | "shortage";
export type IntelSeverity = "critical" | "warning" | "info";

/** One normalized intelligence item from any source. */
export interface IntelItem {
  id: string;
  kind: IntelKind;
  title: string;
  org: string;
  reason: string;
  classification: string;
  date: string; // ISO
  status: string;
  source: string;
  severity: IntelSeverity;
  region: string;
}

/** The analyst agent's consolidated read of the day's intel. */
export interface IntelBriefing {
  summary: string;
  highlights: string[];
  generatedAt: string; // ISO
  model: string;
  byAI: boolean; // false → deterministic fallback (no ANTHROPIC_API_KEY set)
}

export interface IntelReport {
  items: IntelItem[];
  briefing: IntelBriefing;
  counts: { recalls: number; shortages: number; critical: number };
  collectedAt: string; // ISO
  sources: string[];
}
