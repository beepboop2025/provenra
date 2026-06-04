import type {
  CapaStatus,
  DeviationSeverity,
  ExcursionSeverity,
  PickTask,
  StockHealth,
  TempRange,
} from "@/lib/types";
import { clamp } from "@/lib/utils";
import { daysUntil } from "@/lib/format";

/**
 * Analytics & scoring engine.
 *
 * These are the "brains" of VitalChain — the functions that turn raw events
 * into decisions. They are deliberately isolated here (not buried in UI) so
 * they can be unit-tested, audited, and later swapped for ML models without
 * touching the dashboard.
 */

// ── Cold chain ──────────────────────────────────────────────────────────────

/**
 * Mean Kinetic Temperature (MKT) — the single temperature that, held constant,
 * would produce the same thermal stress as a fluctuating profile. This is the
 * pharma-standard metric (Haynes equation) for judging whether an excursion
 * actually harmed the product, rather than just peak temperature.
 *
 * MKT = (ΔH/R) / -ln( (1/n) Σ exp(-ΔH/(R·Tᵢ)) )    with T in Kelvin.
 */
export function meanKineticTemperature(tempsC: number[], activationEnergy = 83.144): number {
  if (tempsC.length === 0) return 0;
  const R = 0.0083144; // kJ/mol·K
  const a = activationEnergy / R;
  const kelvins = tempsC.map((c) => c + 273.15);
  const meanExp =
    kelvins.reduce((sum, T) => sum + Math.exp(-a / T), 0) / kelvins.length;
  const mktK = a / -Math.log(meanExp);
  return mktK - 273.15;
}

/** Classify an excursion's severity from its deviation and duration. */
export function excursionSeverity(
  peakDeviation: number,
  durationMin: number
): ExcursionSeverity {
  const score = peakDeviation * 2 + durationMin / 30;
  if (score >= 18 || peakDeviation >= 8) return "critical";
  if (score >= 8 || peakDeviation >= 3) return "major";
  return "minor";
}

/** Is a reading outside its required band? */
export function isBreach(temp: number, range: TempRange): boolean {
  return temp < range.min || temp > range.max;
}

// ── Inventory & shortage ────────────────────────────────────────────────────

/** Classify stock health from days of cover and reorder position. */
export function stockHealth(
  onHand: number,
  dailyDemand: number,
  reorderPoint: number
): StockHealth {
  if (onHand <= 0) return "stockout";
  const cover = dailyDemand > 0 ? onHand / dailyDemand : 999;
  if (onHand > reorderPoint * 4) return "excess";
  if (onHand <= reorderPoint * 0.5 || cover < 7) return "low";
  if (onHand <= reorderPoint || cover < 21) return "watch";
  return "healthy";
}

/**
 * Composite shortage-risk score (0–100). Blends:
 *  - how close to / past stockout the projected date is (urgency)
 *  - breadth of impact (how many facilities affected)
 *  - essentiality (NLEM drugs weighted higher — public-health priority)
 */
export function shortageRiskScore(
  daysToStockout: number,
  affectedFacilities: number,
  totalFacilities: number,
  essential: boolean
): number {
  const urgency = clamp(100 - daysToStockout * 2.2, 0, 100);
  const breadth = totalFacilities > 0 ? (affectedFacilities / totalFacilities) * 100 : 0;
  const base = urgency * 0.6 + breadth * 0.4;
  const weighted = essential ? base * 1.15 : base;
  return Math.round(clamp(weighted, 0, 100));
}

// ── Supplier risk ───────────────────────────────────────────────────────────

/** Composite supplier risk (0–100, higher = riskier). */
export function supplierRiskScore(
  onTimeDelivery: number,
  qualityRejectRate: number,
  openCapas: number,
  monthsSinceAudit: number
): number {
  const delivery = (100 - onTimeDelivery) * 0.3;
  const quality = clamp(qualityRejectRate * 6, 0, 35);
  const capa = clamp(openCapas * 5, 0, 20);
  const audit = clamp(monthsSinceAudit * 1.5, 0, 15);
  return Math.round(clamp(delivery + quality + capa + audit, 0, 100));
}

// ── Supply resilience / API geopolitical risk ───────────────────────────────

/**
 * Supply-resilience risk (0–100, higher = more fragile) for a product.
 * Research basis: India imports ~70% of bulk-drug APIs from China (antibiotics
 * ~87%); single-source generics (esp. sterile injectables) drive most shortages;
 * DPCO price-capped essentials face margin-driven withdrawal.
 */
export function supplyResilienceRisk(
  apiDependencePct: number,
  singleSource: boolean,
  priceCapped: boolean,
  essential: boolean
): number {
  let score = 0;
  score += apiDependencePct * 0.45; // foreign-API concentration
  if (singleSource) score += 28; // no alternative manufacturer
  if (priceCapped) score += 14; // margin pressure → discontinuation risk
  if (essential) score += 8; // public-health criticality
  return Math.round(clamp(score, 0, 100));
}

// ── Expiry / FEFO ───────────────────────────────────────────────────────────

/**
 * FEFO (First-Expiry-First-Out) waste estimate: units likely to expire before
 * they can be sold, given current demand. Returns 0 if demand will clear stock
 * in time. This is the core of expiry-loss prevention.
 */
export function expiringUnits(
  onHand: number,
  dailyDemand: number,
  expiry: string
): number {
  const days = daysUntil(expiry);
  if (days <= 0) return onHand; // already expired
  const sellable = Math.floor(dailyDemand * days);
  return Math.max(0, onHand - sellable);
}

// ── Quality Management System (QMS) ──────────────────────────────────────────

/**
 * CAPA service-level: how many days a corrective/preventive action may stay open
 * before it is overdue, keyed by the severity of the deviation that drove it.
 *
 * This is the key QMS policy lever — the regulated equivalent of an SLA. Tighter
 * windows mean faster remediation but more "overdue" noise; looser windows risk
 * letting critical issues age. Tune these to your quality system's commitments.
 */
export function capaSlaDays(severity: DeviationSeverity): number {
  switch (severity) {
    case "critical":
      return 30; // critical deviations: closed within a month
    case "major":
      return 60;
    case "minor":
      return 90;
  }
}

/** Resolve a CAPA's effective status, flipping to "overdue" past its due date. */
export function capaEffectiveStatus(
  status: CapaStatus,
  dueAt: string
): CapaStatus {
  if (status === "closed") return "closed";
  return daysUntil(dueAt) < 0 ? "overdue" : status;
}

/**
 * Composite QMS health (0–100, higher = healthier). Blends open-deviation load,
 * overdue-CAPA pressure, and how many critical issues are unresolved. This is the
 * single number a Head of Quality watches.
 */
export function qmsHealthScore(
  openDeviations: number,
  overdueCapas: number,
  criticalOpen: number
): number {
  const penalty =
    openDeviations * 1.5 + overdueCapas * 6 + criticalOpen * 10;
  return Math.round(clamp(100 - penalty, 0, 100));
}

// ── Warehouse Management (WMS) ───────────────────────────────────────────────

/**
 * FEFO pick accuracy: the share of picks that pulled the earliest-expiry batch.
 * The single most important warehouse control for a pharma business — every
 * non-FEFO pick leaves older stock on the shelf to expire. Short picks (no stock)
 * are excluded since no batch choice was made.
 */
export function fefoPickRate(tasks: PickTask[]): number {
  const decided = tasks.filter((t) => t.status !== "short" && t.status !== "queued");
  if (!decided.length) return 100;
  const compliant = decided.filter((t) => t.fefoCompliant).length;
  return Math.round((compliant / decided.length) * 100);
}

/** Pick fulfilment rate: units actually picked vs ordered across all tasks. */
export function pickFillRate(tasks: PickTask[]): number {
  const ordered = tasks.reduce((a, t) => a + t.qtyOrdered, 0) || 1;
  const picked = tasks.reduce((a, t) => a + t.qtyPicked, 0);
  return Math.round((picked / ordered) * 100);
}
