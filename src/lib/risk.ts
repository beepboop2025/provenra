import { clamp } from "@/lib/utils";

/**
 * Anti-counterfeit risk signals for a single serialized unit.
 *
 * Each field is an independent anomaly observation gathered from the scan
 * network. The scoring function below fuses them into a 0–100 risk score.
 */
export interface RiskSignals {
  /** Serial's status conflicts with its location/history (e.g. "dispensed" then re-scanned). */
  statusInconsistent: boolean;
  /** Scans per hour for this serial across the network. Clones cause spikes. */
  scanVelocity: number;
  /** Largest geographic jump between consecutive scans, km. Impossible jumps = cloned serial. */
  geoJumpKm: number;
  /** Serial belongs to a batch that has been recalled but is still moving. */
  batchRecalled: boolean;
  /** Count of the SAME serial scanned in different places "simultaneously". */
  duplicateScans: number;
  /** Unit is past its labelled expiry but still in circulation. */
  expired: boolean;
}

/**
 * Counterfeit risk score (0–100, higher = more suspicious).
 *
 * ┌─ WHY THIS IS A DESIGN DECISION ────────────────────────────────────────┐
 * │ The *weights* below encode a risk appetite. There is no single correct  │
 * │ answer — it depends on the product portfolio and regulatory exposure.   │
 * │ This baseline favours the strongest physical-impossibility signals      │
 * │ (duplicate scans, geo-jumps) because those are the hardest for a        │
 * │ counterfeiter to avoid. Tune freely.                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @see The dashboard surfaces any unit scoring ≥ 70 as "suspect".
 */
export function counterfeitRiskScore(s: RiskSignals): number {
  let score = 0;

  // Hard physical impossibilities — strongest counterfeit indicators.
  score += Math.min(s.duplicateScans, 5) * 12; // same serial in two places at once
  if (s.geoJumpKm > 1500) score += 25; // impossible travel between scans
  else if (s.geoJumpKm > 800) score += 12;

  // Velocity: a genuine unit is scanned a handful of times along its journey.
  if (s.scanVelocity > 12) score += 18;
  else if (s.scanVelocity > 6) score += 8;

  // Status / lifecycle anomalies.
  if (s.statusInconsistent) score += 15;
  if (s.batchRecalled) score += 20; // recalled stock should not be in the field
  if (s.expired) score += 10;

  return Math.round(clamp(score, 0, 100));
}

/** Bucket a risk score into a label for the UI. */
export function riskBand(score: number): "low" | "elevated" | "high" | "critical" {
  if (score >= 80) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "elevated";
  return "low";
}
