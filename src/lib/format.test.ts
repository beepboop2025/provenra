// Pin timezone so date/time assertions are deterministic across runner locales.
process.env.TZ = "UTC";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatINR,
  formatUSD,
  formatCompact,
  formatNumber,
  formatPct,
  formatTemp,
  formatDate,
  formatDateTime,
  formatRelative,
  daysUntil,
  shelfLifeLabel,
} from "./format";

describe("formatINR", () => {
  it("formats rupees below lakh with en-IN grouping", () => {
    expect(formatINR(99999)).toBe("₹99,999");
    expect(formatINR(1234.5)).toBe("₹1,234.5");
  });

  it("uses lakh abbreviation at and above 1e5", () => {
    expect(formatINR(100000)).toBe("₹1.00 L");
    expect(formatINR(9999999)).toBe("₹100.00 L");
  });

  it("uses crore abbreviation at and above 1e7", () => {
    expect(formatINR(10000000)).toBe("₹1.00 Cr");
    expect(formatINR(250000000)).toBe("₹25.00 Cr");
  });

  it("falls back to 0 for null, undefined, NaN", () => {
    expect(formatINR(null)).toBe("₹0");
    expect(formatINR(undefined)).toBe("₹0");
    expect(formatINR(NaN)).toBe("₹0");
  });

  it("handles Infinity", () => {
    expect(formatINR(Infinity)).toBe("₹Infinity Cr");
    expect(formatINR(-Infinity)).toBe("₹-Infinity Cr");
  });

  it("handles negative values", () => {
    expect(formatINR(-1500000)).toBe("₹-15.00 L");
  });
});

describe("formatUSD", () => {
  it("shows plain dollars below 1e3", () => {
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(999.99)).toBe("$1000");
  });

  it("uses K abbreviation at and above 1e3", () => {
    expect(formatUSD(1000)).toBe("$1.0K");
    expect(formatUSD(150000)).toBe("$150.0K");
  });

  it("uses M abbreviation at and above 1e6", () => {
    expect(formatUSD(1000000)).toBe("$1.00M");
  });

  it("uses B abbreviation at and above 1e9", () => {
    expect(formatUSD(1000000000)).toBe("$1.00B");
  });

  it("falls back to 0 for null, undefined, NaN", () => {
    expect(formatUSD(null)).toBe("$0");
    expect(formatUSD(undefined)).toBe("$0");
    expect(formatUSD(NaN)).toBe("$0");
  });

  it("handles Infinity", () => {
    expect(formatUSD(Infinity)).toBe("$InfinityB");
    expect(formatUSD(-Infinity)).toBe("$-InfinityB");
  });

  it("handles negative values", () => {
    expect(formatUSD(-2500)).toBe("$-2.5K");
  });
});

describe("formatCompact", () => {
  it("formats zero", () => {
    expect(formatCompact(0)).toBe("0");
  });

  it("compacts large numbers", () => {
    expect(formatCompact(1234)).toBe("1.2K");
    expect(formatCompact(4500000)).toBe("45L");
  });

  it("falls back to 0 for invalid numeric inputs", () => {
    expect(formatCompact(null)).toBe("0");
    expect(formatCompact(undefined)).toBe("0");
    expect(formatCompact(NaN)).toBe("0");
  });

  it("handles Infinity", () => {
    expect(formatCompact(Infinity)).toBe("∞");
    expect(formatCompact(-Infinity)).toBe("-∞");
  });
});

describe("formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("uses en-IN thousands grouping", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
  });

  it("falls back to 0 for invalid numeric inputs", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
    expect(formatNumber(NaN)).toBe("0");
  });

  it("handles Infinity", () => {
    expect(formatNumber(Infinity)).toBe("∞");
    expect(formatNumber(-Infinity)).toBe("-∞");
  });
});

describe("formatPct", () => {
  it("formats zero", () => {
    expect(formatPct(0)).toBe("0.0%");
  });

  it("formats percentage with default 1 decimal", () => {
    expect(formatPct(12.345)).toBe("12.3%");
  });

  it("respects custom decimal count", () => {
    expect(formatPct(12.345, 2)).toBe("12.35%");
    expect(formatPct(12.345, 0)).toBe("12%");
  });

  it("falls back to 0 for invalid numeric inputs", () => {
    expect(formatPct(null)).toBe("0.0%");
    expect(formatPct(undefined)).toBe("0.0%");
    expect(formatPct(NaN)).toBe("0.0%");
  });

  it("handles Infinity", () => {
    expect(formatPct(Infinity)).toBe("Infinity%");
    expect(formatPct(-Infinity)).toBe("-Infinity%");
  });
});

describe("formatTemp", () => {
  it("formats zero", () => {
    expect(formatTemp(0)).toBe("0.0°C");
  });

  it("formats temperature with one decimal", () => {
    expect(formatTemp(25)).toBe("25.0°C");
    expect(formatTemp(-4.5)).toBe("-4.5°C");
  });

  it("falls back to 0 for invalid numeric inputs", () => {
    expect(formatTemp(null)).toBe("0.0°C");
    expect(formatTemp(undefined)).toBe("0.0°C");
    expect(formatTemp(NaN)).toBe("0.0°C");
  });

  it("handles Infinity", () => {
    expect(formatTemp(Infinity)).toBe("Infinity°C");
    expect(formatTemp(-Infinity)).toBe("-Infinity°C");
  });
});

describe("formatDate", () => {
  it("formats valid dates and strings", () => {
    expect(formatDate(new Date("2026-06-04T14:30:00Z"))).toBe("04 Jun 2026");
    expect(formatDate("2026-06-04T14:30:00Z")).toBe("04 Jun 2026");
  });

  it("returns em dash for null, undefined, and invalid dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
    expect(formatDate(new Date("invalid"))).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats valid dates and strings", () => {
    expect(formatDateTime(new Date("2026-06-04T14:30:00Z"))).toBe(
      "04 Jun 2026, 14:30"
    );
    expect(formatDateTime("2026-06-04T14:30:00Z")).toBe("04 Jun 2026, 14:30");
  });

  it("returns em dash for null, undefined, and invalid dates", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("not a date")).toBe("—");
  });
});

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns relative time for valid dates", () => {
    expect(formatRelative(new Date("2026-06-04T09:00:00Z"))).toBe("3 hours ago");
  });

  it("returns em dash for null, undefined, and invalid dates", () => {
    expect(formatRelative(null)).toBe("—");
    expect(formatRelative(undefined)).toBe("—");
    expect(formatRelative("not a date")).toBe("—");
  });
});

describe("daysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for null, undefined, and invalid dates", () => {
    expect(daysUntil(null)).toBe(0);
    expect(daysUntil(undefined)).toBe(0);
    expect(daysUntil("not a date")).toBe(0);
  });

  it("returns correct days for boundary values", () => {
    expect(daysUntil("2026-06-04T12:00:00Z")).toBe(0);
    expect(daysUntil("2026-09-01T12:00:00Z")).toBe(89);
    expect(daysUntil("2026-09-02T12:00:00Z")).toBe(90);
    expect(daysUntil("2027-06-03T12:00:00Z")).toBe(364);
    expect(daysUntil("2027-06-04T12:00:00Z")).toBe(365);
  });

  it("returns negative days for past dates", () => {
    expect(daysUntil("2026-06-03T12:00:00Z")).toBe(-1);
  });
});

describe("shelfLifeLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels expired, today, and short shelf life", () => {
    expect(shelfLifeLabel("2026-06-03T12:00:00Z")).toBe("Expired 1d ago");
    expect(shelfLifeLabel("2026-06-04T12:00:00Z")).toBe("Expires today");
    expect(shelfLifeLabel("2026-06-05T12:00:00Z")).toBe("1d left");
    expect(shelfLifeLabel("2026-09-01T12:00:00Z")).toBe("89d left");
  });

  it("labels medium shelf life in months", () => {
    expect(shelfLifeLabel("2026-09-02T12:00:00Z")).toBe("3mo left");
    expect(shelfLifeLabel("2027-06-03T12:00:00Z")).toBe("12mo left");
  });

  it("labels long shelf life in years", () => {
    expect(shelfLifeLabel("2027-06-04T12:00:00Z")).toBe("1.0y left");
    expect(shelfLifeLabel("2028-06-04T12:00:00Z")).toBe("2.0y left");
  });
});
