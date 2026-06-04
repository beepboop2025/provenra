import type {
  ExcursionSeverity,
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
