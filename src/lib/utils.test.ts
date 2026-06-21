import { describe, expect, it } from "vitest";
import { clamp, cn, hashSeed, mulberry32, pick } from "./utils";

describe("cn", () => {
  it("merges classes and resolves tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, 0, "", "b")).toBe("a b");
  });

  it("flattens arrays and conditional objects", () => {
    expect(cn(["a", ["b", { c: true, d: false }]], "e")).toBe("a b c e");
  });

  it("deduplicates identical classes", () => {
    expect(cn("flex", "flex")).toBe("flex");
  });
});

describe("mulberry32", () => {
  it("produces identical sequences for the same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });

  it("maps special seeds (NaN / Infinity) to the same state as 0", () => {
    const zero = mulberry32(0);
    const nan = mulberry32(NaN);
    const inf = mulberry32(Infinity);
    for (let i = 0; i < 5; i++) {
      const expected = zero();
      expect(nan()).toBe(expected);
      expect(inf()).toBe(expected);
    }
  });

  it("handles negative seeds as their unsigned 32-bit equivalents", () => {
    const negative = mulberry32(-1);
    const unsigned = mulberry32(4294967295);
    for (let i = 0; i < 5; i++) {
      expect(negative()).toBe(unsigned());
    }
  });

  it("returns values in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is sensitive to seed changes", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe("hashSeed", () => {
  it("hashes strings deterministically", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
  });

  it("returns the initial hash constant for an empty string", () => {
    expect(hashSeed("")).toBe(5381);
  });

  it("returns a 32-bit unsigned integer", () => {
    const h = hashSeed("Provenra");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it("produces different hashes for different strings", () => {
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });

  it("handles unicode strings deterministically", () => {
    expect(hashSeed("🔒")).toBe(hashSeed("🔒"));
  });
});

describe("pick", () => {
  it("selects deterministically for a given r", () => {
    expect(pick(["a", "b", "c"], 0)).toBe("a");
    expect(pick(["a", "b", "c"], 0.5)).toBe("b");
    expect(pick(["a", "b", "c"], 0.999)).toBe("c");
  });

  it("wraps r values >= 1 via modulo", () => {
    expect(pick(["a", "b", "c"], 1.0)).toBe("a");
    expect(pick(["a", "b", "c"], 1.5)).toBe("b");
  });

  it("returns undefined for an empty array", () => {
    expect(pick([], 0.5)).toBeUndefined();
  });

  it("returns undefined for negative or non-finite r", () => {
    expect(pick(["a", "b"], -0.1)).toBeUndefined();
    expect(pick(["a", "b"], NaN)).toBeUndefined();
    expect(pick(["a", "b"], Infinity)).toBeUndefined();
  });
});

describe("clamp", () => {
  it("returns values inside the range unchanged", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps values below min and above max", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles boundary values", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("handles negative ranges", () => {
    expect(clamp(-7, -10, -5)).toBe(-7);
    expect(clamp(-20, -10, -5)).toBe(-10);
    expect(clamp(0, -10, -5)).toBe(-5);
  });

  it("handles Infinity", () => {
    expect(clamp(Infinity, 0, 10)).toBe(10);
    expect(clamp(-Infinity, 0, 10)).toBe(0);
  });

  it("propagates NaN", () => {
    expect(Number.isNaN(clamp(NaN, 0, 10))).toBe(true);
  });

  it("clamps to max when min and max are reversed", () => {
    expect(clamp(5, 10, 0)).toBe(0);
  });
});
