import { describe, expect, it } from "vitest";
import { counterfeitRiskScore, riskBand, type RiskSignals } from "./risk";

const baseSignals: RiskSignals = {
  statusInconsistent: false,
  scanVelocity: 0,
  geoJumpKm: 0,
  batchRecalled: false,
  duplicateScans: 0,
  expired: false,
};

describe("counterfeitRiskScore", () => {
  it("returns 0 for a completely clean signal", () => {
    expect(counterfeitRiskScore(baseSignals)).toBe(0);
  });

  it("caps the score at 100 even when every signal is extreme", () => {
    const score = counterfeitRiskScore({
      statusInconsistent: true,
      scanVelocity: 100,
      geoJumpKm: 5000,
      batchRecalled: true,
      duplicateScans: 20,
      expired: true,
    });
    expect(score).toBe(100);
  });

  it("clamps negative and Infinity inputs to valid range", () => {
    expect(
      counterfeitRiskScore({
        ...baseSignals,
        scanVelocity: -Infinity,
        geoJumpKm: -1000,
        duplicateScans: -5,
      }),
    ).toBe(0);

    expect(
      counterfeitRiskScore({
        ...baseSignals,
        geoJumpKm: Infinity,
        scanVelocity: Infinity,
        duplicateScans: Infinity,
      }),
    ).toBe(100);
  });

  it("propagates NaN numeric inputs through the score", () => {
    expect(
      counterfeitRiskScore({
        ...baseSignals,
        scanVelocity: NaN,
        geoJumpKm: NaN,
        duplicateScans: NaN,
      }),
    ).toBeNaN();
  });

  describe("duplicateScans", () => {
    it.each([
      [0, 0],
      [1, 12],
      [5, 60],
      [6, 60],
      [100, 60],
    ])("maps %i duplicate scan(s) to %i points", (duplicateScans, expected) => {
      expect(
        counterfeitRiskScore({ ...baseSignals, duplicateScans }),
      ).toBe(expected);
    });
  });

  describe("geoJumpKm", () => {
    it.each([
      [0, 0],
      [100, 0],
      [800, 0],
      [800.1, 12],
      [1500, 12],
      [1500.1, 25],
      [9000, 25],
    ])("maps %f km to %i points", (geoJumpKm, expected) => {
      expect(
        counterfeitRiskScore({ ...baseSignals, geoJumpKm }),
      ).toBe(expected);
    });
  });

  describe("scanVelocity", () => {
    it.each([
      [0, 0],
      [3, 0],
      [6, 0],
      [6.1, 8],
      [10, 8],
      [12, 8],
      [12.1, 18],
      [50, 18],
    ])("maps %f scans/hour to %i points", (scanVelocity, expected) => {
      expect(
        counterfeitRiskScore({ ...baseSignals, scanVelocity }),
      ).toBe(expected);
    });
  });

  it("adds each status/lifecycle anomaly independently", () => {
    expect(
      counterfeitRiskScore({ ...baseSignals, statusInconsistent: true }),
    ).toBe(15);
    expect(
      counterfeitRiskScore({ ...baseSignals, batchRecalled: true }),
    ).toBe(20);
    expect(
      counterfeitRiskScore({ ...baseSignals, expired: true }),
    ).toBe(10);
  });

  it("rounds the final score to the nearest integer", () => {
    expect(
      counterfeitRiskScore({
        ...baseSignals,
        duplicateScans: 2,
        geoJumpKm: 900,
        scanVelocity: 7,
      }),
    ).toBe(44);
  });

  it("produces predictable scores for realistic combined signals", () => {
    expect(
      counterfeitRiskScore({
        statusInconsistent: true,
        scanVelocity: 8,
        geoJumpKm: 2000,
        batchRecalled: true,
        duplicateScans: 2,
        expired: false,
      }),
    ).toBe(92);
  });
});

describe("riskBand", () => {
  it.each([
    [-Infinity, "low"],
    [-1, "low"],
    [0, "low"],
    [39, "low"],
    [40, "elevated"],
    [41, "elevated"],
    [69, "elevated"],
    [70, "high"],
    [71, "high"],
    [79, "high"],
    [80, "critical"],
    [81, "critical"],
    [100, "critical"],
    [Infinity, "critical"],
  ])("maps score %f to band %s", (score, expected) => {
    expect(riskBand(score)).toBe(expected);
  });

  it("treats NaN as low because NaN comparisons are always false", () => {
    expect(riskBand(NaN)).toBe("low");
  });
});
