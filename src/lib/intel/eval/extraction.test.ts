import { describe, expect, it } from "vitest";
import { evaluateCdscoExtraction } from "@/lib/intel/eval/extraction";
import { CDSCO_GOLDEN_SAMPLE } from "@/lib/intel/eval/golden";

describe("evaluateCdscoExtraction", () => {
  it("returns perfect scores for the exact golden sample", () => {
    const result = evaluateCdscoExtraction(CDSCO_GOLDEN_SAMPLE as unknown as Array<Record<string, unknown>>);
    expect(result.totalSamples).toBe(CDSCO_GOLDEN_SAMPLE.length);
    expect(result.matchedRecords).toBe(CDSCO_GOLDEN_SAMPLE.length);
    expect(result.recordRecall).toBe(1);
    expect(result.fieldAccuracy).toBe(1);
    expect(result.severeAccuracy).toBe(1);
    expect(result.mismatches).toHaveLength(0);
  });

  it("detects missing records", () => {
    const partial = CDSCO_GOLDEN_SAMPLE.slice(0, 2) as unknown as Array<Record<string, unknown>>;
    const result = evaluateCdscoExtraction(partial);
    expect(result.matchedRecords).toBe(2);
    expect(result.recordRecall).toBe(0.5);
    expect(result.mismatches.length).toBeGreaterThan(0);
    expect(result.mismatches.some((m) => m.includes("Missing expected"))).toBe(true);
  });

  it("detects records with wrong field values", () => {
    const modified = CDSCO_GOLDEN_SAMPLE.map((r, i) =>
      i === 0 ? { ...r, batch: "WRONG-BATCH" } : r,
    ) as unknown as Array<Record<string, unknown>>;
    const result = evaluateCdscoExtraction(modified);
    expect(result.matchedRecords).toBe(CDSCO_GOLDEN_SAMPLE.length - 1);
    expect(result.mismatches.some((m) => m.includes("Unmatched extraction"))).toBe(true);
    expect(result.mismatches.some((m) => m.includes("Missing expected"))).toBe(true);
  });

  it("handles empty extraction gracefully", () => {
    const result = evaluateCdscoExtraction([]);
    expect(result.totalSamples).toBe(CDSCO_GOLDEN_SAMPLE.length);
    expect(result.matchedRecords).toBe(0);
    expect(result.recordRecall).toBe(0);
    expect(result.fieldAccuracy).toBe(0);
    expect(result.severeAccuracy).toBe(0);
  });
});
