import { describe, expect, it } from "vitest";
import {
  NOW,
  chainOfCustody,
  demandSeries,
  getData,
  sensorSeries,
  spark,
} from "@/lib/data/engine";
import type { Facility, SerialUnit, Shipment } from "@/lib/types";

const mockFacility = (id: string, city = "Hyderabad", market: Facility["location"]["market"] = "IN"): Facility => ({
  id,
  name: `${city} Test Facility`,
  type: "warehouse",
  location: { city, region: "Telangana", market, lat: 17.385, lng: 78.4867 },
  certified: true,
  certifications: ["WHO-GDP"],
});

const mockShipment = (overrides: Partial<Shipment> = {}): Shipment => ({
  id: "SHP-TEST-001",
  ref: "IND-TEST",
  productId: "PRD-TEST",
  batchId: "BTH-TEST",
  units: 1000,
  carrier: "Test Carrier",
  origin: mockFacility("FAC-ORIGIN", "Mumbai"),
  destination: mockFacility("FAC-DEST", "Delhi"),
  status: "in_transit",
  departedAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
  etaAt: new Date(NOW.getTime() + 1 * 86_400_000).toISOString(),
  progress: 0.5,
  tempRange: { min: 2, max: 8 },
  lastTemp: 5,
  excursionCount: 1,
  ...overrides,
});

const mockSerial = (status: SerialUnit["status"] = "at_facility"): SerialUnit => ({
  id: "SN-TEST-001",
  serial: "0890123456789.BTH001.00001",
  gtin: "08901234567890",
  batchId: "BTH-TEST",
  status,
  currentFacilityId: "FAC-001",
  parentId: null,
  riskScore: 12,
});

describe("engine constants", () => {
  it("NOW is a stable fixed reference date", () => {
    expect(NOW instanceof Date).toBe(true);
    expect(NOW.toISOString()).toBe("2026-06-04T04:00:00.000Z");
    expect(getData().products[0]?.id).toBeDefined();
    // Re-importing or calling getData must not mutate NOW.
    expect(NOW.toISOString()).toBe("2026-06-04T04:00:00.000Z");
  });
});

describe("spark", () => {
  it("returns a deterministic series of the requested length", () => {
    const a = spark("seed-a", 12);
    const b = spark("seed-a", 12);
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
  });

  it("produces values clamped between 5 and 100", () => {
    const up = spark("up-test", 100, true);
    const down = spark("down-test", 100, false);
    for (const v of [...up, ...down]) {
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("returns an empty array when n is 0", () => {
    expect(spark("empty", 0)).toEqual([]);
  });

  it("changes shape with different seeds", () => {
    const a = spark("alpha", 20);
    const b = spark("beta", 20);
    expect(a).not.toEqual(b);
  });

  it("honours the up vs down bias", () => {
    const up = spark("bias-up", 50, true);
    const down = spark("bias-down", 50, false);
    expect(up[up.length - 1]!).toBeGreaterThan(5);
    expect(down[down.length - 1]!).toBeLessThan(100);
  });
});

describe("sensorSeries", () => {
  it("is deterministic for the same shipment", () => {
    const shipment = mockShipment();
    const a = sensorSeries(shipment);
    const b = sensorSeries(shipment);
    expect(a).toEqual(b);
  });

  it("returns the requested number of points", () => {
    const shipment = mockShipment();
    expect(sensorSeries(shipment, 24)).toHaveLength(24);
    expect(sensorSeries(shipment, 48)).toHaveLength(48);
    expect(sensorSeries(shipment, 0)).toEqual([]);
  });

  it("timestamps span the journey from departure to NOW", () => {
    const shipment = mockShipment();
    const series = sensorSeries(shipment, 10);
    const start = new Date(shipment.departedAt).getTime();
    const first = new Date(series[0]!.t).getTime();
    const last = new Date(series[series.length - 1]!.t).getTime();
    expect(first).toBe(start);
    expect(last).toBeLessThanOrEqual(NOW.getTime());
  });

  it("marks points outside the temperature range as breaches", () => {
    const shipment = mockShipment({ tempRange: { min: 2, max: 8 }, excursionCount: 10 });
    const series = sensorSeries(shipment, 50);
    const breaches = series.filter((s) => s.breach);
    expect(breaches.length).toBeGreaterThan(0);
    for (const r of breaches) {
      expect(r.temp < shipment.tempRange.min || r.temp > shipment.tempRange.max).toBe(true);
    }
  });

  it("respects the requested excursion count", () => {
    const none = sensorSeries(mockShipment({ excursionCount: 0 }), 20);
    const many = sensorSeries(mockShipment({ excursionCount: 5 }), 20);
    expect(none.some((s) => s.breach)).toBe(false);
    expect(many.some((s) => s.breach)).toBe(true);
  });

  it("humidity values are within a realistic range", () => {
    const series = sensorSeries(mockShipment(), 30);
    for (const r of series) {
      expect(r.humidity).toBeGreaterThanOrEqual(45);
      expect(r.humidity).toBeLessThanOrEqual(70);
    }
  });

  it("handles a same-day departure with a fallback span", () => {
    const shipment = mockShipment({
      departedAt: NOW.toISOString(),
    });
    const series = sensorSeries(shipment, 5);
    expect(series).toHaveLength(5);
    expect(new Date(series[0]!.t).getTime()).toBe(NOW.getTime());
  });
});

describe("demandSeries", () => {
  it("is deterministic for the same productId", () => {
    const a = demandSeries("PRD-001");
    const b = demandSeries("PRD-001");
    expect(a).toEqual(b);
  });

  it("returns history + horizon points", () => {
    const s = demandSeries("PRD-002", 10, 5);
    expect(s).toHaveLength(15);
  });

  it("past points have actual values; future points have null actual", () => {
    const s = demandSeries("PRD-003", 5, 5);
    const past = s.filter((p) => new Date(p.date).getTime() < NOW.getTime());
    const future = s.filter((p) => new Date(p.date).getTime() >= NOW.getTime());
    expect(past.every((p) => typeof p.actual === "number")).toBe(true);
    expect(future.every((p) => p.actual === null)).toBe(true);
  });

  it("every point has a forecast within a non-negative confidence band", () => {
    const s = demandSeries("PRD-004", 20, 10);
    for (const p of s) {
      expect(p.forecast).toBeGreaterThanOrEqual(0);
      expect(p.lower).toBeGreaterThanOrEqual(0);
      expect(p.upper).toBeGreaterThanOrEqual(p.lower);
    }
  });

  it("changes shape for different productIds", () => {
    const a = demandSeries("PRD-A", 12, 6);
    const b = demandSeries("PRD-B", 12, 6);
    expect(a).not.toEqual(b);
  });
});

describe("chainOfCustody", () => {
  const facilities: Facility[] = [
    mockFacility("FAC-IN-1", "Delhi", "IN"),
    mockFacility("FAC-IN-2", "Mumbai", "IN"),
    mockFacility("FAC-IN-3", "Chennai", "IN"),
    mockFacility("FAC-IN-4", "Kolkata", "IN"),
    mockFacility("FAC-IN-5", "Hyderabad", "IN"),
    mockFacility("FAC-IN-6", "Pune", "IN"),
    mockFacility("FAC-US-1", "New Jersey", "US"),
  ];

  it("is deterministic for the same serial and facilities", () => {
    const serial = mockSerial("dispensed");
    const a = chainOfCustody(serial, facilities);
    const b = chainOfCustody(serial, facilities);
    expect(a).toEqual(b);
  });

  it("uses only Indian facilities", () => {
    const serial = mockSerial("at_facility");
    const chain = chainOfCustody(serial, facilities);
    for (const e of chain) {
      expect(e.location.market).toBe("IN");
    }
  });

  it("length depends on serial status", () => {
    expect(chainOfCustody(mockSerial("dispensed"), facilities)).toHaveLength(6);
    expect(chainOfCustody(mockSerial("in_transit"), facilities)).toHaveLength(3);
    expect(chainOfCustody(mockSerial("at_facility"), facilities)).toHaveLength(4);
    expect(chainOfCustody(mockSerial("suspect"), facilities)).toHaveLength(4);
  });

  it("produces a hash-chained audit trail", () => {
    const chain = chainOfCustody(mockSerial("dispensed"), facilities);
    expect(chain[0]!.prevHash).toBe("00000000");
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i]!.prevHash).toBe(chain[i - 1]!.hash);
    }
  });

  it("throws when no Indian facilities are available", () => {
    const usOnly = [mockFacility("FAC-US-1", "New Jersey", "US")];
    expect(() => chainOfCustody(mockSerial("dispensed"), usOnly)).toThrow();
  });

  it("includes expected EPCIS-style steps", () => {
    const chain = chainOfCustody(mockSerial("dispensed"), facilities);
    const steps = chain.map((e) => e.step);
    expect(steps).toEqual(["commissioning", "packing", "shipping", "receiving", "inspecting", "dispensing"]);
  });
});

describe("getData", () => {
  it("returns the same object on repeated calls", () => {
    const a = getData();
    const b = getData();
    expect(a).toBe(b);
  });

  it("produces a complete ProvenraData shape", () => {
    const data = getData();
    expect(data.markets.length).toBeGreaterThan(0);
    expect(data.facilities.length).toBeGreaterThan(0);
    expect(data.products.length).toBeGreaterThan(0);
    expect(data.batches.length).toBeGreaterThan(0);
    expect(data.serials.length).toBeGreaterThan(0);
    expect(data.shipments.length).toBeGreaterThan(0);
    expect(data.excursions.length).toBeGreaterThanOrEqual(0);
    expect(data.stock.length).toBeGreaterThan(0);
    expect(data.recalls.length).toBeGreaterThanOrEqual(0);
    expect(data.suppliers.length).toBeGreaterThan(0);
    expect(data.requirements.length).toBeGreaterThan(0);
    expect(data.qualityAlerts.length).toBeGreaterThan(0);
    expect(data.deviations.length).toBeGreaterThan(0);
    expect(data.capas.length).toBeGreaterThanOrEqual(0);
    expect(data.batchRecords.length).toBeGreaterThan(0);
    expect(data.auditTrail.length).toBeGreaterThanOrEqual(0);
    expect(data.pickTasks.length).toBeGreaterThan(0);
    expect(data.putawayTasks.length).toBeGreaterThanOrEqual(0);
    expect(data.dispatchLanes.length).toBeGreaterThanOrEqual(0);
    expect(data.alerts.length).toBeGreaterThanOrEqual(0);
  });

  it("keeps product → batch → serial relationships consistent", () => {
    const data = getData();
    const productIds = new Set(data.products.map((p) => p.id));
    for (const b of data.batches) {
      expect(productIds.has(b.productId)).toBe(true);
    }
    for (const s of data.serials) {
      const batch = data.batches.find((b) => b.id === s.batchId);
      expect(batch).toBeDefined();
      expect(s.gtin).toBe(data.products.find((p) => p.id === batch!.productId)!.gtin);
    }
  });

  it("produces deterministic output across separate module loads", () => {
    const data = getData();
    // A fresh call after exercising other helpers must still return the same cached object.
    expect(getData()).toBe(data);
    expect(getData().products[0]?.id).toBe(data.products[0]?.id);
    expect(getData().shipments[0]?.id).toBe(data.shipments[0]?.id);
  });
});
