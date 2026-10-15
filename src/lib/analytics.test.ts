import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  capaEffectiveStatus,
  capaSlaDays,
  excursionSeverity,
  expiringUnits,
  fefoPickRate,
  isBreach,
  meanKineticTemperature,
  pickFillRate,
  qmsHealthScore,
  shortageRiskScore,
  stockHealth,
  supplierRiskScore,
  supplyResilienceRisk,
} from "./analytics";
import type { PickTask } from "./types";

// ── meanKineticTemperature ───────────────────────────────────────────────────

describe("meanKineticTemperature", () => {
  it("returns 0 for an empty profile", () => {
    expect(meanKineticTemperature([])).toBe(0);
  });

  it("equals the constant temperature when all readings are identical", () => {
    // A flat profile has no thermal-stress amplification: MKT == the value.
    expect(meanKineticTemperature([5, 5, 5, 5])).toBeCloseTo(5, 6);
  });

  it("is always >= the arithmetic mean (Jensen's inequality on a convex exp)", () => {
    const temps = [2, 4, 6, 8, 25];
    const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
    const mkt = meanKineticTemperature(temps);
    expect(mkt).toBeGreaterThan(mean);
  });

  it("penalises a brief spike more than a flat profile of the same mean", () => {
    // Same arithmetic mean (5), but one has a 25°C excursion.
    const flat = meanKineticTemperature([5, 5, 5, 5, 5]);
    const spike = meanKineticTemperature([-5, 5, 5, 5, 15]);
    expect(spike).toBeGreaterThan(flat);
  });

  it("rises when the activation energy increases (more sensitivity to heat)", () => {
    const temps = [2, 8, 25];
    const low = meanKineticTemperature(temps, 50);
    const high = meanKineticTemperature(temps, 120);
    expect(high).toBeGreaterThan(low);
  });
});

// ── excursionSeverity ────────────────────────────────────────────────────────

describe("excursionSeverity", () => {
  it("classifies a small, short deviation as minor", () => {
    expect(excursionSeverity(1, 10)).toBe("minor");
  });

  it("escalates to major on deviation alone (>= 3°C)", () => {
    // score = 3*2 + 1/30 ≈ 6.0 (< 8) but peakDeviation >= 3 forces major.
    expect(excursionSeverity(3, 30)).toBe("major");
  });

  it("escalates to critical on a large peak deviation regardless of duration", () => {
    expect(excursionSeverity(8, 1)).toBe("critical");
  });

  it("escalates to critical on long duration when the composite score crosses 18", () => {
    // peakDeviation 2 (< 8), score = 4 + 600/30 = 24 >= 18 -> critical.
    expect(excursionSeverity(2, 600)).toBe("critical");
  });

  it("uses the major composite threshold when peak alone is below the major cutoff", () => {
    // peakDeviation 1 (< 3), score = 2 + 210/30 = 9 >= 8 -> major.
    expect(excursionSeverity(1, 210)).toBe("major");
  });
});

// ── isBreach ─────────────────────────────────────────────────────────────────

describe("isBreach", () => {
  const fridge = { min: 2, max: 8 };

  it("is false inside the band", () => {
    expect(isBreach(5, fridge)).toBe(false);
  });

  it("is false exactly on the inclusive boundaries", () => {
    expect(isBreach(2, fridge)).toBe(false);
    expect(isBreach(8, fridge)).toBe(false);
  });

  it("is true below the floor and above the ceiling", () => {
    expect(isBreach(1.9, fridge)).toBe(true);
    expect(isBreach(8.1, fridge)).toBe(true);
  });
});

// ── stockHealth ──────────────────────────────────────────────────────────────

describe("stockHealth", () => {
  it("reports stockout when nothing is on hand", () => {
    expect(stockHealth(0, 10, 100)).toBe("stockout");
    expect(stockHealth(-5, 10, 100)).toBe("stockout");
  });

  it("reports excess when far above the reorder point", () => {
    expect(stockHealth(500, 10, 100)).toBe("excess");
  });

  it("reports low when below half the reorder point", () => {
    expect(stockHealth(40, 1, 100)).toBe("low");
  });

  it("reports low when days-of-cover is under a week even if stock looks ok", () => {
    // onHand 90 (> reorderPoint*0.5=50) but cover = 90/20 = 4.5 days < 7.
    expect(stockHealth(90, 20, 100)).toBe("low");
  });

  it("reports watch at the reorder point boundary", () => {
    expect(stockHealth(100, 1, 100)).toBe("watch");
  });

  it("reports healthy with comfortable cover above reorder point", () => {
    // onHand 300 (<= reorderPoint*4=400, not excess), cover 300/5=60 days.
    expect(stockHealth(300, 5, 100)).toBe("healthy");
  });

  it("treats zero demand as effectively infinite cover (cover never triggers)", () => {
    // dailyDemand 0 -> cover 999, so only reorder-position rules apply.
    // onHand 80 <= reorderPoint 100 -> watch (cover would otherwise say healthy).
    expect(stockHealth(80, 0, 100)).toBe("watch");
    // onHand 150 > reorderPoint and cover is "infinite" -> healthy.
    expect(stockHealth(150, 0, 100)).toBe("healthy");
  });
});

// ── shortageRiskScore ────────────────────────────────────────────────────────

describe("shortageRiskScore", () => {
  it("is 0 when stockout is far off and impact is negligible", () => {
    // daysToStockout 60 -> urgency clamps to 0; 0 facilities affected.
    expect(shortageRiskScore(60, 0, 100, false)).toBe(0);
  });

  it("maxes urgency when stockout is imminent and impact is total", () => {
    // urgency 100, breadth 100 -> base 100, essential *1.15 clamps to 100.
    expect(shortageRiskScore(0, 100, 100, true)).toBe(100);
  });

  it("weights essential (NLEM) drugs ~15% higher than non-essential", () => {
    const nonEssential = shortageRiskScore(10, 5, 10, false);
    const essential = shortageRiskScore(10, 5, 10, true);
    expect(essential).toBeGreaterThan(nonEssential);
  });

  it("blends urgency (60%) and breadth (40%)", () => {
    // days 0 -> urgency 100; 5/10 facilities -> breadth 50.
    // base = 100*0.6 + 50*0.4 = 80.
    expect(shortageRiskScore(0, 5, 10, false)).toBe(80);
  });

  it("avoids divide-by-zero when there are no facilities", () => {
    expect(shortageRiskScore(0, 0, 0, false)).toBe(60); // urgency only
  });
});

// ── supplierRiskScore ────────────────────────────────────────────────────────

describe("supplierRiskScore", () => {
  it("is 0 for a perfect supplier", () => {
    expect(supplierRiskScore(100, 0, 0, 0)).toBe(0);
  });

  it("penalises poor on-time delivery", () => {
    // (100-70)*0.3 = 9.
    expect(supplierRiskScore(70, 0, 0, 0)).toBe(9);
  });

  it("caps each risk component at its ceiling", () => {
    // quality capped at 35, capa at 20, audit at 15, delivery (100-0)*0.3=30.
    // total = 100 -> clamps to 100.
    expect(supplierRiskScore(0, 999, 999, 999)).toBe(100);
  });

  it("caps the quality component independently of other factors", () => {
    // rejectRate 10 -> 60 raw, capped to 35; perfect on everything else.
    expect(supplierRiskScore(100, 10, 0, 0)).toBe(35);
  });
});

// ── supplyResilienceRisk ─────────────────────────────────────────────────────

describe("supplyResilienceRisk", () => {
  it("is driven mostly by foreign-API dependence", () => {
    // 100% dependence -> 45.
    expect(supplyResilienceRisk(100, false, false, false)).toBe(45);
  });

  it("stacks single-source, price-cap, and essentiality flags additively", () => {
    // 100*0.45 + 28 + 14 + 8 = 95.
    expect(supplyResilienceRisk(100, true, true, true)).toBe(95);
  });

  it("clamps to 100 even with extreme inputs", () => {
    expect(supplyResilienceRisk(200, true, true, true)).toBe(100);
  });

  it("is 0 for a fully domestic, multi-source, non-capped, non-essential product", () => {
    expect(supplyResilienceRisk(0, false, false, false)).toBe(0);
  });
});

// ── expiringUnits (FEFO waste) ───────────────────────────────────────────────

describe("expiringUnits", () => {
  // daysUntil reads the real clock; pin it for deterministic expiry math.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the full stock when the batch is already expired", () => {
    expect(expiringUnits(500, 10, "2025-12-01T00:00:00Z")).toBe(500);
  });

  it("returns 0 when demand will clear the stock before expiry", () => {
    // ~30 days out, 10/day -> 300 sellable > 100 on hand.
    expect(expiringUnits(100, 10, "2026-01-31T00:00:00Z")).toBe(0);
  });

  it("returns only the units that cannot be sold in time", () => {
    // 10 days out, 5/day -> 50 sellable; 200 - 50 = 150 will expire.
    expect(expiringUnits(200, 5, "2026-01-11T00:00:00Z")).toBe(150);
  });

  it("treats all stock as waste when there is no demand", () => {
    expect(expiringUnits(80, 0, "2026-06-01T00:00:00Z")).toBe(80);
  });
});

// ── capaSlaDays ──────────────────────────────────────────────────────────────

describe("capaSlaDays", () => {
  it("gives tighter windows to more severe deviations", () => {
    expect(capaSlaDays("critical")).toBe(30);
    expect(capaSlaDays("major")).toBe(60);
    expect(capaSlaDays("minor")).toBe(90);
  });

  it("is monotonic: critical < major < minor", () => {
    expect(capaSlaDays("critical")).toBeLessThan(capaSlaDays("major"));
    expect(capaSlaDays("major")).toBeLessThan(capaSlaDays("minor"));
  });
});

// ── capaEffectiveStatus ──────────────────────────────────────────────────────

describe("capaEffectiveStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps closed CAPAs closed even if their due date has passed", () => {
    expect(capaEffectiveStatus("closed", "2026-01-01T00:00:00Z")).toBe("closed");
  });

  it("flips an open CAPA to overdue once past due", () => {
    expect(capaEffectiveStatus("in_progress", "2026-01-10T00:00:00Z")).toBe(
      "overdue"
    );
  });

  it("leaves an open CAPA's status untouched while still within its window", () => {
    expect(capaEffectiveStatus("in_progress", "2026-01-31T00:00:00Z")).toBe(
      "in_progress"
    );
  });
});

// ── qmsHealthScore ───────────────────────────────────────────────────────────

describe("qmsHealthScore", () => {
  it("is 100 for a clean quality system", () => {
    expect(qmsHealthScore(0, 0, 0)).toBe(100);
  });

  it("subtracts weighted penalties for each open-issue category", () => {
    // 100 - (2*1.5 + 1*6 + 1*10) = 100 - 19 = 81.
    expect(qmsHealthScore(2, 1, 1)).toBe(81);
  });

  it("weights critical-open issues most heavily, overdue next, deviations least", () => {
    const deviationsOnly = qmsHealthScore(1, 0, 0); // -1.5
    const overdueOnly = qmsHealthScore(0, 1, 0); // -6
    const criticalOnly = qmsHealthScore(0, 0, 1); // -10
    expect(deviationsOnly).toBeGreaterThan(overdueOnly);
    expect(overdueOnly).toBeGreaterThan(criticalOnly);
  });

  it("never goes negative under heavy load", () => {
    expect(qmsHealthScore(100, 100, 100)).toBe(0);
  });
});

// ── fefoPickRate / pickFillRate ──────────────────────────────────────────────

function task(overrides: Partial<PickTask>): PickTask {
  return {
    id: "t",
    ref: "PCK-00001",
    orderRef: "SO-1",
    productName: "Amoxicillin 500mg",
    batchNo: "B1",
    expiryDate: "2027-01-01",
    zone: "ambient",
    qtyOrdered: 10,
    qtyPicked: 10,
    status: "picked",
    fefoCompliant: true,
    picker: "p1",
    destination: "Apollo Pharmacy",
    priority: "standard",
    ...overrides,
  };
}

describe("fefoPickRate", () => {
  it("returns 100 for an empty task list (nothing to fault)", () => {
    expect(fefoPickRate([])).toBe(100);
  });

  it("returns 100 when every decided pick was FEFO-compliant", () => {
    expect(
      fefoPickRate([task({ fefoCompliant: true }), task({ fefoCompliant: true })])
    ).toBe(100);
  });

  it("computes the compliant share of decided picks", () => {
    const tasks = [
      task({ fefoCompliant: true }),
      task({ fefoCompliant: true }),
      task({ fefoCompliant: false }),
      task({ fefoCompliant: false }),
    ];
    expect(fefoPickRate(tasks)).toBe(50);
  });

  it("excludes short and queued picks (no batch choice was made)", () => {
    const tasks = [
      task({ fefoCompliant: true, status: "picked" }),
      task({ fefoCompliant: false, status: "short" }),
      task({ fefoCompliant: false, status: "queued" }),
    ];
    // Only the one decided pick counts, and it was compliant -> 100.
    expect(fefoPickRate(tasks)).toBe(100);
  });

  it("returns 100 when all picks are short/queued (none decided)", () => {
    expect(
      fefoPickRate([task({ status: "short" }), task({ status: "queued" })])
    ).toBe(100);
  });
});

describe("pickFillRate", () => {
  it("returns 100 when everything ordered was picked", () => {
    expect(
      pickFillRate([
        task({ qtyOrdered: 10, qtyPicked: 10 }),
        task({ qtyOrdered: 5, qtyPicked: 5 }),
      ])
    ).toBe(100);
  });

  it("reflects partial fulfilment across tasks", () => {
    // ordered 20, picked 15 -> 75%.
    expect(
      pickFillRate([
        task({ qtyOrdered: 10, qtyPicked: 10 }),
        task({ qtyOrdered: 10, qtyPicked: 5 }),
      ])
    ).toBe(75);
  });

  it("guards against divide-by-zero when nothing was ordered", () => {
    expect(pickFillRate([task({ qtyOrdered: 0, qtyPicked: 0 })])).toBe(0);
  });
});
