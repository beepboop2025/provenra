import { describe, expect, it } from "vitest";
import { overviewKpis } from "@/lib/kpis";
import type {
  Alert,
  AuditEntry,
  Batch,
  BatchRecord,
  Capa,
  ChainEvent,
  ComplianceRequirement,
  DemandPoint,
  Deviation,
  DispatchLane,
  Excursion,
  Facility,
  Market,
  PickTask,
  Product,
  PutawayTask,
  QualityAlert,
  Recall,
  SensorReading,
  SerialUnit,
  Shipment,
  ShortageAlert,
  StockPosition,
  Supplier,
  VitalChainData,
  WarehouseZone,
} from "@/lib/types";

const baseLocation = {
  city: "Mumbai",
  region: "Maharashtra",
  market: "IN" as const,
  lat: 19.0,
  lng: 72.0,
};

const baseFacility: Facility = {
  id: "FAC-1",
  name: "Mumbai Plant",
  type: "manufacturer",
  location: baseLocation,
  certified: true,
  certifications: ["WHO-GMP"],
};

function makeMinimalData(overrides: Partial<VitalChainData> = {}): VitalChainData {
  return {
    markets: [],
    facilities: [],
    products: [],
    batches: [],
    serials: [],
    shipments: [],
    excursions: [],
    stock: [],
    shortages: [],
    recalls: [],
    suppliers: [],
    requirements: [],
    qualityAlerts: [],
    deviations: [],
    capas: [],
    batchRecords: [],
    auditTrail: [],
    pickTasks: [],
    putawayTasks: [],
    dispatchLanes: [],
    alerts: [],
    ...overrides,
  };
}

function makeShipment(status: Shipment["status"]): Shipment {
  return {
    id: `SHP-${status}`,
    ref: `IND-${status}`,
    productId: "PRD-1",
    batchId: "BTH-1",
    units: 100,
    carrier: "Test Carrier",
    origin: baseFacility,
    destination: baseFacility,
    status,
    departedAt: new Date().toISOString(),
    etaAt: new Date().toISOString(),
    progress: 0.5,
    tempRange: { min: 2, max: 8 },
    lastTemp: 5,
    excursionCount: 0,
  };
}

function makeSerial(status: SerialUnit["status"], riskScore: number): SerialUnit {
  return {
    id: `SN-${status}-${riskScore}`,
    serial: "123456",
    gtin: "08901234567890",
    batchId: "BTH-1",
    status,
    currentFacilityId: "FAC-1",
    parentId: null,
    riskScore,
  };
}

function makeShortage(riskScore: number): ShortageAlert {
  return {
    id: `SHT-${riskScore}`,
    productId: "PRD-1",
    productName: "Test Product",
    projectedStockout: new Date().toISOString(),
    affectedFacilities: 1,
    essential: false,
    riskScore,
  };
}

function makeRecall(status: Recall["status"]): Recall {
  return {
    id: `RCL-${status}`,
    ref: `REC-${status}`,
    productId: "PRD-1",
    productName: "Test Product",
    batchIds: ["BTH-1"],
    reason: "Test",
    recallClass: "II",
    status,
    initiatedAt: new Date().toISOString(),
    affectedUnits: 100,
    retrievedUnits: 0,
    markets: ["IN"],
    affectedStates: ["Maharashtra"],
    nationwideCoordination: false,
  };
}

function makeQualityAlert(inInventory: boolean, action: QualityAlert["action"]): QualityAlert {
  return {
    id: `QA-${inInventory}-${action}`,
    defect: "nsq",
    productName: "Test Product",
    batchNo: "BTH001",
    manufacturer: "Mfg",
    testLab: "Lab",
    description: "Test alert",
    flaggedAt: new Date().toISOString(),
    source: "CDSCO monthly drug alert",
    inInventory,
    unitsHeld: inInventory ? 500 : 0,
    action,
  };
}

function makeDeviation(status: Deviation["status"]): Deviation {
  return {
    id: `DEV-${status}`,
    ref: `DEV-2026-${status}`,
    title: "Test deviation",
    type: "process",
    severity: "minor",
    status,
    productName: "Test Product",
    batchNo: "BTH001",
    raisedAt: new Date().toISOString(),
    owner: "QA",
    source: "Line",
    ageDays: 1,
    capaId: null,
  };
}

function makeCapa(status: Capa["status"]): Capa {
  return {
    id: `CAPA-${status}`,
    ref: `CAPA-2026-${status}`,
    deviationRef: "DEV-2026-001",
    kind: "corrective",
    rootCause: "Root",
    action: "Action",
    owner: "QA",
    openedAt: new Date().toISOString(),
    dueAt: new Date().toISOString(),
    status,
    progress: 50,
    effective: null,
  };
}

function makeBatchRecord(status: BatchRecord["status"]): BatchRecord {
  return {
    id: `BMR-${status}`,
    batchId: "BTH-1",
    batchNo: "BTH001",
    productName: "Test Product",
    status,
    checksComplete: 6,
    checksTotal: 12,
    openDeviations: 0,
    reviewedBy: "QA",
    degEgClear: true,
    excipientGrade: "pharmacopoeial",
    releasedAt: null,
  };
}

function makePickTask(fefoCompliant: boolean, status: PickTask["status"] = "picked"): PickTask {
  return {
    id: `PCK-${fefoCompliant}`,
    ref: "PCK-00001",
    orderRef: "SO-1",
    productName: "Test Product",
    batchNo: "BTH001",
    expiryDate: new Date().toISOString(),
    zone: "ambient" as WarehouseZone,
    qtyOrdered: 100,
    qtyPicked: status === "short" ? 50 : 100,
    status,
    fefoCompliant,
    picker: "P1",
    destination: "Delhi",
    priority: "standard",
  };
}

function makeBatch(quantity: number): Batch {
  return {
    id: "BTH-1",
    batchNo: "BTH001",
    productId: "PRD-1",
    manufacturerId: "FAC-1",
    mfgDate: new Date().toISOString(),
    expiryDate: new Date().toISOString(),
    quantity,
    status: "released",
    excipientGrade: "pharmacopoeial",
    degEgClear: true,
  };
}

function kpiByLabel(kpis: ReturnType<typeof overviewKpis>, label: string) {
  return kpis.find((k) => k.label === label);
}

describe("overviewKpis", () => {
  it("handles completely empty data without crashing", () => {
    const kpis = overviewKpis(makeMinimalData());
    expect(kpis).toHaveLength(12);
    expect(kpiByLabel(kpis, "Units Under Trace")?.value).toBe("0");
    expect(kpiByLabel(kpis, "Active Shipments")?.value).toBe("0");
    expect(kpiByLabel(kpis, "On-Time-In-Full")?.value).toBe("0.0%");
    expect(kpiByLabel(kpis, "FEFO Pick Accuracy")?.value).toBe("100%");
  });

  it("sums batch quantities for units under trace", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        batches: [makeBatch(10_000), makeBatch(5_000)],
      })
    );
    expect(kpiByLabel(kpis, "Units Under Trace")?.value).toBe("15K");
  });

  it("counts active (non-delivered) shipments", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        shipments: [makeShipment("delivered"), makeShipment("in_transit"), makeShipment("exception")],
      })
    );
    expect(kpiByLabel(kpis, "Active Shipments")?.value).toBe("2");
  });

  it("counts live cold-chain breaches from exception status", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        shipments: [makeShipment("in_transit"), makeShipment("exception")],
      })
    );
    expect(kpiByLabel(kpis, "Live Cold-Chain Breaches")?.value).toBe("1");
    expect(kpiByLabel(kpis, "Live Cold-Chain Breaches")?.delta).toBe(60);
  });

  it("uses negative delta when there are zero live breaches", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        shipments: [makeShipment("in_transit")],
      })
    );
    expect(kpiByLabel(kpis, "Live Cold-Chain Breaches")?.delta).toBe(-100);
  });

  it("flags suspect units at status === suspect", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        serials: [makeSerial("commissioned", 10), makeSerial("suspect", 10)],
      })
    );
    expect(kpiByLabel(kpis, "Suspect / Counterfeit Units")?.value).toBe("1");
  });

  it("flags suspect units at riskScore boundary >= 70", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        serials: [makeSerial("at_facility", 69), makeSerial("at_facility", 70)],
      })
    );
    expect(kpiByLabel(kpis, "Suspect / Counterfeit Units")?.value).toBe("1");
  });

  it("counts shortage alerts at riskScore boundary >= 65", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        shortages: [makeShortage(64), makeShortage(65)],
      })
    );
    expect(kpiByLabel(kpis, "Essential-Drug Shortage Risks")?.value).toBe("1");
  });

  it("computes on-time-in-full as delivered + in_transit share", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        shipments: [
          makeShipment("delivered"),
          makeShipment("in_transit"),
          makeShipment("exception"),
          makeShipment("delayed"),
        ],
      })
    );
    // 2 of 4 are delivered or in_transit -> 50%
    expect(kpiByLabel(kpis, "On-Time-In-Full")?.value).toBe("50.0%");
  });

  it("counts open recalls (status !== completed)", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        recalls: [makeRecall("completed"), makeRecall("initiated"), makeRecall("in_progress")],
      })
    );
    expect(kpiByLabel(kpis, "Open Recalls")?.value).toBe("2");
  });

  it("uses positive recall delta only when more than one open recall", () => {
    const oneOpen = overviewKpis(
      makeMinimalData({ recalls: [makeRecall("initiated")] })
    );
    expect(kpiByLabel(oneOpen, "Open Recalls")?.delta).toBe(-50);

    const twoOpen = overviewKpis(
      makeMinimalData({
        recalls: [makeRecall("initiated"), makeRecall("in_progress")],
      })
    );
    expect(kpiByLabel(twoOpen, "Open Recalls")?.delta).toBe(25);
  });

  it("counts NSQ batches held in inventory with non-cleared action", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        qualityAlerts: [
          makeQualityAlert(true, "quarantined"),
          makeQualityAlert(true, "cleared"),
          makeQualityAlert(false, "quarantined"),
        ],
      })
    );
    expect(kpiByLabel(kpis, "NSQ Batches in Inventory")?.value).toBe("1");
  });

  it("computes FEFO pick accuracy excluding queued and short tasks", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        pickTasks: [
          makePickTask(true, "picked"),
          makePickTask(true, "picked"),
          makePickTask(false, "staged"),
          makePickTask(true, "queued"), // excluded
          makePickTask(true, "short"), // excluded
        ],
      })
    );
    // 2 compliant out of 3 decided -> 66.666... rounded to 67%
    expect(kpiByLabel(kpis, "FEFO Pick Accuracy")?.value).toBe("67%");
  });

  it("counts open deviations (status !== closed)", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        deviations: [makeDeviation("closed"), makeDeviation("open"), makeDeviation("investigating")],
      })
    );
    expect(kpiByLabel(kpis, "Open Deviations")?.value).toBe("2");
  });

  it("counts overdue CAPAs and flips delta sign", () => {
    const noneOverdue = overviewKpis(
      makeMinimalData({ capas: [makeCapa("open")] })
    );
    expect(kpiByLabel(noneOverdue, "Overdue CAPAs")?.value).toBe("0");
    expect(kpiByLabel(noneOverdue, "Overdue CAPAs")?.delta).toBe(-40);

    const someOverdue = overviewKpis(
      makeMinimalData({ capas: [makeCapa("overdue"), makeCapa("open")] })
    );
    expect(kpiByLabel(someOverdue, "Overdue CAPAs")?.value).toBe("1");
    expect(kpiByLabel(someOverdue, "Overdue CAPAs")?.delta).toBe(30);
  });

  it("counts batches awaiting release (in_review or on_hold)", () => {
    const kpis = overviewKpis(
      makeMinimalData({
        batchRecords: [
          makeBatchRecord("released"),
          makeBatchRecord("in_review"),
          makeBatchRecord("on_hold"),
          makeBatchRecord("rejected"),
        ],
      })
    );
    expect(kpiByLabel(kpis, "Batches Awaiting Release")?.value).toBe("2");
  });

  it("returns deterministic spark values for the same data", () => {
    const data = makeMinimalData({
      batches: [makeBatch(1000)],
      shipments: [makeShipment("in_transit")],
    });
    const run1 = overviewKpis(data);
    const run2 = overviewKpis(data);
    expect(run1.map((k) => k.spark)).toEqual(run2.map((k) => k.spark));
  });

  it("produces stable default output when called without arguments", () => {
    const run1 = overviewKpis();
    const run2 = overviewKpis();
    expect(run1.map((k) => k.value)).toEqual(run2.map((k) => k.value));
    expect(run1.map((k) => k.spark)).toEqual(run2.map((k) => k.spark));
  });

  it("returns every expected KPI label", () => {
    const kpis = overviewKpis(makeMinimalData());
    const labels = kpis.map((k) => k.label);
    expect(labels).toEqual([
      "Units Under Trace",
      "Active Shipments",
      "Live Cold-Chain Breaches",
      "Suspect / Counterfeit Units",
      "Essential-Drug Shortage Risks",
      "On-Time-In-Full",
      "Open Recalls",
      "NSQ Batches in Inventory",
      "FEFO Pick Accuracy",
      "Open Deviations",
      "Overdue CAPAs",
      "Batches Awaiting Release",
    ]);
  });
});
