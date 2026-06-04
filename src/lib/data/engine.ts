import {
  CAPA_ACTIONS,
  CARRIERS,
  DOCKS,
  INDIAN_STATES,
  INTL_NODES,
  IN_DEMAND_CENTERS,
  IN_HUBS,
  MANUFACTURERS,
  MARKETS,
  PICKERS,
  PRODUCTS,
  QA_OFFICERS,
  QUALITY_DEFECTS,
  RECALL_REASONS,
  ROOT_CAUSES,
  TEST_LABS,
} from "@/lib/data/seed";
import {
  capaEffectiveStatus,
  capaSlaDays,
  excursionSeverity,
  expiringUnits,
  meanKineticTemperature,
  shortageRiskScore,
  stockHealth,
  supplierRiskScore,
} from "@/lib/analytics";
import { counterfeitRiskScore } from "@/lib/risk";
import { hashSeed, mulberry32, pick, clamp } from "@/lib/utils";
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
  DeviationSeverity,
  DeviationType,
  DispatchLane,
  Excursion,
  Facility,
  FacilityType,
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

/**
 * Fixed reference "now" so the dataset is byte-for-byte identical on the server
 * and the client — eliminating React hydration mismatches that would otherwise
 * occur if generation depended on the wall clock.
 */
export const NOW = new Date("2026-06-04T09:30:00+05:30");

const dayMs = 86_400_000;
const addDays = (base: Date, d: number) => new Date(base.getTime() + d * dayMs).toISOString();

/** DJB2-style chained hash for tamper-evident audit/genealogy trails. */
function chainHash(prev: string, payload: string): string {
  let h = 5381;
  const s = prev + "|" + payload;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ────────────────────────────────────────────────────────────────────────────
// Builders
// ────────────────────────────────────────────────────────────────────────────

function buildFacilities(): Facility[] {
  const out: Facility[] = [];

  IN_HUBS.forEach((h, i) => {
    out.push({
      id: `FAC-MFG-${i}`,
      name: `${pick(MANUFACTURERS, mulberry32(hashSeed(h.city))())} — ${h.city} Plant`,
      type: i % 4 === 0 ? "cdmo" : "manufacturer",
      location: { city: h.city, region: h.region, market: "IN", lat: h.lat, lng: h.lng },
      certified: true,
      certifications: ["WHO-GMP", "Schedule M", i % 2 ? "US FDA" : "EU GMP"],
    });
  });

  IN_DEMAND_CENTERS.forEach((c, i) => {
    const types: FacilityType[] = ["cfa", "distributor", "warehouse", "hospital", "pharmacy"];
    out.push({
      id: `FAC-DST-${i}`,
      name: `${c.city} ${i % 2 ? "Regional CFA" : "Distribution Hub"}`,
      type: types[i % types.length],
      location: { city: c.city, region: c.region, market: "IN", lat: c.lat, lng: c.lng },
      certified: i % 5 !== 0,
      certifications: i % 5 !== 0 ? ["WHO-GDP", "Schedule M"] : ["Schedule M"],
    });
  });

  INTL_NODES.forEach((n, i) => {
    out.push({
      id: `FAC-INT-${i}`,
      name: `${n.city} ${n.market === "US" ? "Export Hub" : "Distribution Center"}`,
      type: n.market === "AE" ? "port" : "distributor",
      location: { city: n.city, region: n.region, market: n.market, lat: n.lat, lng: n.lng },
      certified: true,
      certifications: ["WHO-GDP", n.market === "US" ? "DSCSA" : "EU GDP"],
    });
  });

  return out;
}

function buildProducts(manufacturers: Facility[]): Product[] {
  return PRODUCTS.map((p, i) => {
    const mfg = manufacturers[i % manufacturers.length];
    const rnd = mulberry32(hashSeed(p.name));
    // Research: ~70% of India's bulk-drug/API imports come from China; antibiotics
    // ~87%. Older generic sterile injectables are often single-source. Essential
    // (NLEM) drugs are price-capped under DPCO → margin pressure.
    const chinaHeavy = p.category === "Anti-infectives" || rnd() > 0.55;
    const apiDependencePct = chinaHeavy ? Math.round(60 + rnd() * 38) : Math.round(rnd() * 45);
    const singleSource =
      (p.form === "injection" || p.form === "biologic" || p.form === "vaccine") && rnd() > 0.5;
    return {
      id: `PRD-${String(i).padStart(3, "0")}`,
      name: p.name,
      genericName: p.generic,
      manufacturerId: mfg.id,
      dosageForm: p.form,
      strength: p.strength,
      therapeuticCategory: p.category,
      schedule: p.schedule,
      storage: p.storage,
      tempRange: p.tempMin !== null && p.tempMax !== null ? { min: p.tempMin, max: p.tempMax } : null,
      gtin: `0890${String(70000 + Math.floor(rnd() * 29999))}${i}`.slice(0, 14).padEnd(14, "0"),
      mrp: p.mrp,
      essential: p.essential,
      apiSource: chinaHeavy ? "CN" : "IN",
      apiDependencePct,
      singleSource,
      priceCapped: p.essential,
    };
  });
}

function buildBatches(products: Product[]): Batch[] {
  const out: Batch[] = [];
  products.forEach((p) => {
    const rnd = mulberry32(hashSeed(p.id + "batch"));
    const count = 3 + Math.floor(rnd() * 3);
    for (let b = 0; b < count; b++) {
      const ageDays = Math.floor(rnd() * 540) - 60; // some near expiry
      const mfg = new Date(NOW.getTime() - (200 + ageDays) * dayMs);
      const shelfMonths = p.dosageForm === "vaccine" || p.dosageForm === "biologic" ? 18 : 36;
      const expiry = new Date(mfg.getTime() + shelfMonths * 30 * dayMs);
      const expired = expiry.getTime() < NOW.getTime();
      const statusRoll = rnd();
      // Liquid orals (syrup) carry the DEG/EG contamination risk that killed
      // 300+ children since 2022 — a small fraction use uncertified excipients.
      const liquid = p.dosageForm === "syrup" || p.dosageForm === "injection";
      const uncertified = liquid && rnd() > 0.82;
      out.push({
        id: `BTH-${p.id}-${b}`,
        batchNo: `${p.name.slice(0, 3).toUpperCase()}${mfg.getFullYear()}${String(b + 1).padStart(2, "0")}${Math.floor(rnd() * 900 + 100)}`,
        productId: p.id,
        manufacturerId: p.manufacturerId,
        mfgDate: mfg.toISOString(),
        expiryDate: expiry.toISOString(),
        quantity: Math.floor(rnd() * 90000) + 10000,
        status: expired
          ? "expired"
          : statusRoll > 0.92
            ? "quarantined"
            : statusRoll > 0.88
              ? "recalled"
              : statusRoll > 0.4
                ? "in_distribution"
                : "released",
        excipientGrade: uncertified ? "uncertified" : "pharmacopoeial",
        degEgClear: !(uncertified && rnd() > 0.4),
      });
    }
  });
  return out;
}

/** Generate a representative sample of serialized units (real systems hold millions). */
function buildSerials(batches: Batch[], facilities: Facility[], products: Product[]): SerialUnit[] {
  const out: SerialUnit[] = [];
  const dist = facilities.filter((f) => f.type !== "manufacturer" && f.type !== "cdmo");
  batches.forEach((b) => {
    const product = products.find((p) => p.id === b.productId)!;
    const rnd = mulberry32(hashSeed(b.id + "serial"));
    const sample = 6; // serials shown per batch in the explorer
    for (let s = 0; s < sample; s++) {
      const fac = pick(dist, rnd());
      const roll = rnd();
      const status =
        b.status === "recalled"
          ? "recalled"
          : roll > 0.96
            ? "suspect"
            : roll > 0.7
              ? "dispensed"
              : roll > 0.45
                ? "in_transit"
                : "at_facility";
      const serial = `${product.gtin}.${b.batchNo}.${String(s + 1).padStart(5, "0")}`;
      out.push({
        id: `SN-${b.id}-${s}`,
        serial,
        gtin: product.gtin,
        batchId: b.id,
        status,
        currentFacilityId: fac.id,
        parentId: s % 3 === 0 ? null : `CASE-${b.id}-${Math.floor(s / 3)}`,
        riskScore: counterfeitRiskScore({
          statusInconsistent: status === "suspect",
          scanVelocity: Math.floor(rnd() * 20),
          geoJumpKm: Math.floor(rnd() * 4000),
          batchRecalled: b.status === "recalled",
          duplicateScans: Math.floor(rnd() * 4),
          expired: new Date(b.expiryDate).getTime() < NOW.getTime(),
        }),
      });
    }
  });
  return out;
}

function buildShipments(products: Product[], batches: Batch[], facilities: Facility[]): Shipment[] {
  const out: Shipment[] = [];
  const mfgs = facilities.filter((f) => f.type === "manufacturer" || f.type === "cdmo");
  const dests = facilities.filter((f) => f.type !== "manufacturer" && f.type !== "cdmo");
  const coldProducts = products.filter((p) => p.tempRange);

  for (let i = 0; i < 28; i++) {
    const rnd = mulberry32(hashSeed("ship" + i));
    // 70% cold-chain shipments (where the risk is)
    const product = rnd() < 0.7 && coldProducts.length ? pick(coldProducts, rnd()) : pick(products, rnd());
    const batch = pick(batches.filter((b) => b.productId === product.id), rnd()) ?? batches[0];
    const origin = pick(mfgs, rnd());
    const destination = pick(dests, rnd());
    const range = product.tempRange ?? { min: 15, max: 25 };
    const progress = rnd();
    const excursionCount = product.tempRange && rnd() > 0.55 ? 1 + Math.floor(rnd() * 3) : 0;
    const breaching = excursionCount > 0 && rnd() > 0.5 && progress < 0.98;
    const lastTemp = breaching
      ? range.max + 1 + rnd() * 6
      : range.min + rnd() * (range.max - range.min);
    const status: Shipment["status"] =
      progress >= 0.99 ? "delivered" : breaching ? "exception" : rnd() > 0.85 ? "delayed" : "in_transit";

    out.push({
      id: `SHP-${String(i).padStart(3, "0")}`,
      ref: `IND-${10240 + i}`,
      productId: product.id,
      batchId: batch.id,
      units: Math.floor(rnd() * 8000) + 500,
      carrier: pick(CARRIERS, rnd()),
      origin,
      destination,
      status,
      departedAt: addDays(NOW, -Math.floor(rnd() * 6) - 1),
      etaAt: addDays(NOW, Math.floor(rnd() * 5) + 1),
      progress,
      tempRange: range,
      lastTemp,
      excursionCount,
    });
  }
  return out;
}

function buildExcursions(shipments: Shipment[], products: Product[]): Excursion[] {
  const out: Excursion[] = [];
  shipments.forEach((s) => {
    if (s.excursionCount === 0) return;
    const product = products.find((p) => p.id === s.productId)!;
    const rnd = mulberry32(hashSeed(s.id + "exc"));
    // Freeze-sensitive products (refrigerated 2–8°C: vaccines, insulin) can suffer
    // freeze excursions; frozen/ambient products only over-heat.
    const freezeSensitive = s.tempRange.min >= 0 && s.tempRange.min <= 8;
    for (let e = 0; e < s.excursionCount; e++) {
      const kind: Excursion["kind"] = freezeSensitive && rnd() > 0.5 ? "freeze" : "heat";
      const durationMin = Math.floor(rnd() * 240) + 15;
      const peakDeviation = +(rnd() * 9 + 0.5).toFixed(1);
      // synthesize a temp profile around the breached edge to compute MKT
      const edge = kind === "freeze" ? s.tempRange.min - peakDeviation : s.tempRange.max + peakDeviation;
      const profile = Array.from({ length: 12 }, () => edge + (rnd() - 0.5) * peakDeviation);
      const mkt = +meanKineticTemperature(profile).toFixed(1);
      // Freezing is treated as at least major — it silently destroys biologics.
      const baseSeverity = excursionSeverity(peakDeviation, durationMin);
      const severity =
        kind === "freeze" && baseSeverity === "minor" ? "major" : baseSeverity;
      out.push({
        id: `EXC-${s.id}-${e}`,
        shipmentId: s.id,
        shipmentRef: s.ref,
        productName: product.name,
        startedAt: addDays(NOW, -rnd() * 3),
        durationMin,
        peakDeviation,
        kind,
        severity,
        mkt,
        // Freeze damage to freeze-sensitive biologics is almost always impacting.
        stabilityImpacted:
          kind === "freeze" ? rnd() > 0.25 : severity === "critical" || (severity === "major" && rnd() > 0.5),
        acknowledged: rnd() > 0.6,
      });
    }
  });
  return out.sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
}

function buildStock(products: Product[], batches: Batch[], facilities: Facility[]): StockPosition[] {
  const out: StockPosition[] = [];
  const nodes = facilities.filter((f) => ["cfa", "distributor", "warehouse", "hospital"].includes(f.type));
  products.forEach((p) => {
    nodes.forEach((f) => {
      const rnd = mulberry32(hashSeed(p.id + f.id));
      if (rnd() > 0.62) return; // not every product at every node
      const dailyDemand = Math.floor(rnd() * 400) + 20;
      const reorderPoint = dailyDemand * 14;
      const onHand = Math.floor(rnd() * reorderPoint * 4.5);
      const batch = pick(batches.filter((b) => b.productId === p.id), rnd()) ?? batches[0];
      const cover = dailyDemand > 0 ? onHand / dailyDemand : 999;
      out.push({
        id: `STK-${p.id}-${f.id}`,
        facilityId: f.id,
        facilityName: f.name,
        productId: p.id,
        productName: p.name,
        onHand,
        dailyDemand,
        reorderPoint,
        daysOfCover: Math.round(cover),
        nextExpiry: batch.expiryDate,
        expiringUnits: expiringUnits(onHand, dailyDemand, batch.expiryDate),
        health: stockHealth(onHand, dailyDemand, reorderPoint),
      });
    });
  });
  return out;
}

function buildShortages(products: Product[], stock: StockPosition[]): ShortageAlert[] {
  const totalFacilities = new Set(stock.map((s) => s.facilityId)).size;
  return products
    .map((p) => {
      const positions = stock.filter((s) => s.productId === p.id);
      if (!positions.length) return null;
      const affected = positions.filter((s) => s.health === "low" || s.health === "stockout").length;
      const totalOnHand = positions.reduce((a, s) => a + s.onHand, 0);
      const totalDemand = positions.reduce((a, s) => a + s.dailyDemand, 0) || 1;
      const daysToStockout = Math.round(totalOnHand / totalDemand);
      const risk = shortageRiskScore(daysToStockout, affected, totalFacilities, p.essential);
      if (risk < 35) return null;
      return {
        id: `SHT-${p.id}`,
        productId: p.id,
        productName: p.name,
        projectedStockout: addDays(NOW, daysToStockout),
        affectedFacilities: affected,
        essential: p.essential,
        riskScore: risk,
      } satisfies ShortageAlert;
    })
    .filter((x): x is ShortageAlert => x !== null)
    .sort((a, b) => b.riskScore - a.riskScore);
}

function buildRecalls(products: Product[], batches: Batch[]): Recall[] {
  const out: Recall[] = [];
  const recalledBatches = batches.filter((b) => b.status === "recalled");
  recalledBatches.slice(0, 6).forEach((b, i) => {
    const product = products.find((p) => p.id === b.productId)!;
    const rnd = mulberry32(hashSeed(b.id + "recall"));
    const recallClass = rnd() > 0.7 ? "I" : rnd() > 0.4 ? "II" : "III";
    const affected = b.quantity;
    const retrieved = Math.floor(affected * rnd() * 0.9);
    // Cross-state spread: India has no mandatory nationwide recall mechanism, so
    // the number of states reached drives coordination complexity.
    const stateCount = 2 + Math.floor(rnd() * 9);
    const affectedStates = [...INDIAN_STATES]
      .filter((_, idx) => (hashSeed(b.id + idx) % 16) < stateCount)
      .slice(0, stateCount);
    out.push({
      id: `RCL-${i}`,
      ref: `CDSCO/REC/2026/${4100 + i}`,
      productId: product.id,
      productName: product.name,
      batchIds: [b.id],
      reason: pick(RECALL_REASONS, rnd()),
      recallClass,
      status: retrieved >= affected * 0.85 ? "completed" : rnd() > 0.5 ? "in_progress" : "initiated",
      initiatedAt: addDays(NOW, -Math.floor(rnd() * 40) - 1),
      affectedUnits: affected,
      retrievedUnits: retrieved,
      markets: product.essential ? ["IN", "US"] : ["IN"],
      affectedStates,
      nationwideCoordination: recallClass === "I" ? rnd() > 0.3 : rnd() > 0.6,
    });
  });
  return out;
}

/**
 * Quality / NSQ alerts modelled on CDSCO's monthly drug-alert sweeps (~150+
 * failing batches/month). Some are matched to batches held in our network
 * (driving quarantine/recall), others are external surveillance signals.
 */
function buildQualityAlerts(products: Product[], batches: Batch[]): QualityAlert[] {
  const out: QualityAlert[] = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const rnd = mulberry32(hashSeed("qa" + i));
    const product = pick(products, rnd());
    const tmpl = pick(QUALITY_DEFECTS, rnd());
    // DEG/EG only meaningfully applies to liquid orals.
    const defect =
      tmpl.defect === "deg_eg" && product.dosageForm !== "syrup" && product.dosageForm !== "injection"
        ? "nsq"
        : tmpl.defect;
    const matched = rnd() > 0.45;
    const batch = matched
      ? pick(batches.filter((b) => b.productId === product.id), rnd()) ?? batches[0]
      : null;
    const unitsHeld = matched ? Math.floor(rnd() * 12000) + 500 : 0;
    const severeDefect = defect === "deg_eg" || defect === "spurious" || defect === "nitrosamine";
    out.push({
      id: `QA-${i}`,
      defect,
      productName: product.name,
      batchNo: batch?.batchNo ?? `${product.name.slice(0, 3).toUpperCase()}${2025}${String(i).padStart(2, "0")}${Math.floor(rnd() * 900 + 100)}`,
      manufacturer: pick(MANUFACTURERS, rnd()),
      testLab: pick(TEST_LABS, rnd()),
      description: tmpl.desc,
      flaggedAt: addDays(NOW, -Math.floor(rnd() * 28) - 1),
      source: "CDSCO monthly drug alert",
      inInventory: matched,
      unitsHeld,
      action: !matched
        ? "cleared"
        : severeDefect
          ? "recall_initiated"
          : rnd() > 0.5
            ? "quarantined"
            : "investigating",
    });
  }
  return out.sort((a, b) => +new Date(b.flaggedAt) - +new Date(a.flaggedAt));
}

function buildSuppliers(facilities: Facility[]): Supplier[] {
  const mfgs = facilities.filter((f) => ["manufacturer", "cdmo"].includes(f.type));
  const apiSuppliers = ["Hetero APIs", "Divi's Intermediates", "Granules Actives", "Shilpa Excipients"];
  const all: Supplier[] = [];

  mfgs.forEach((f, i) => {
    const rnd = mulberry32(hashSeed(f.id + "sup"));
    const onTime = +(82 + rnd() * 17).toFixed(1);
    const reject = +(rnd() * 4).toFixed(2);
    const capas = Math.floor(rnd() * 5);
    const months = Math.floor(rnd() * 14);
    const risk = supplierRiskScore(onTime, reject, capas, months);
    all.push({
      id: `SUP-${i}`,
      name: f.name.split(" — ")[0],
      type: f.type,
      market: f.location.market,
      tier: risk > 55 ? "probation" : risk > 35 ? "approved" : risk > 20 ? "preferred" : "critical",
      riskScore: risk,
      onTimeDelivery: onTime,
      qualityRejectRate: reject,
      lastAuditAt: addDays(NOW, -months * 30),
      certifications: f.certifications,
      openCapas: capas,
      gmpReadiness: gmpReadinessFor(f.location.market, risk, rnd),
      nsqFlags: risk > 45 ? Math.floor(rnd() * 4) : 0,
    });
  });

  apiSuppliers.forEach((name, i) => {
    const rnd = mulberry32(hashSeed(name));
    const onTime = +(78 + rnd() * 20).toFixed(1);
    const reject = +(rnd() * 5).toFixed(2);
    const capas = Math.floor(rnd() * 6);
    const months = Math.floor(rnd() * 16);
    const risk = supplierRiskScore(onTime, reject, capas, months);
    all.push({
      id: `SUP-API-${i}`,
      name,
      type: "manufacturer",
      market: "IN",
      tier: risk > 55 ? "probation" : risk > 35 ? "approved" : "preferred",
      riskScore: risk,
      onTimeDelivery: onTime,
      qualityRejectRate: reject,
      lastAuditAt: addDays(NOW, -months * 30),
      certifications: ["WHO-GMP", "ISO 9001"],
      openCapas: capas,
      gmpReadiness: gmpReadinessFor("IN", risk, rnd),
      nsqFlags: risk > 45 ? Math.floor(rnd() * 3) : 0,
    });
  });

  return all.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Revised Schedule M GMP readiness. Research: as of Dec 2025 only ~26% of MSME
 * units had even filed a gap analysis; large/export units are mostly compliant.
 */
function gmpReadinessFor(
  market: string,
  risk: number,
  rnd: () => number
): Supplier["gmpReadiness"] {
  if (market !== "IN") return "compliant"; // export markets already GMP-certified
  const r = rnd();
  if (risk > 50) return r > 0.5 ? "not_started" : "in_progress";
  if (risk > 30) return r > 0.5 ? "in_progress" : "gap_filed";
  return r > 0.3 ? "compliant" : "gap_filed";
}

function buildRequirements(): ComplianceRequirement[] {
  const reqs: Omit<ComplianceRequirement, "id" | "dueDate">[] = [
    { market: "IN", framework: "Schedule M (Revised)", title: "Revised GMP — facility upgrade & QMS", status: "at_risk", owner: "Quality Assurance" },
    { market: "IN", framework: "DAVA / iVEDA", title: "Barcode serialization for exports & domestic top brands", status: "compliant", owner: "Supply Chain IT" },
    { market: "IN", framework: "CDSCO", title: "Drug recall guidance — 2024 SOP adherence", status: "compliant", owner: "Regulatory Affairs" },
    { market: "IN", framework: "NPPA", title: "DPCO price control — NLEM ceiling adherence", status: "at_risk", owner: "Commercial" },
    { market: "US", framework: "DSCSA", title: "EPCIS interoperability — stabilization ended 27 Nov 2024; mfr enforcement 27 May 2025", status: "non_compliant", owner: "Global Trade" },
    { market: "EU", framework: "EU FMD", title: "2D DataMatrix safety features & EMVS verification at dispense", status: "compliant", owner: "Global Trade" },
    { market: "IN", framework: "WHO-GDP", title: "Good Distribution Practice — cold-chain qualification", status: "at_risk", owner: "Logistics QA" },
  ];
  return reqs.map((r, i) => ({
    ...r,
    id: `REQ-${i}`,
    dueDate: addDays(NOW, [12, 90, 200, 30, 8, 140, 45][i] ?? 60),
  }));
}

function buildAlerts(
  excursions: Excursion[],
  shortages: ShortageAlert[],
  recalls: Recall[],
  serials: SerialUnit[],
  requirements: ComplianceRequirement[],
  qualityAlerts: QualityAlert[],
  capas: Capa[],
  batchRecords: BatchRecord[],
  pickTasks: PickTask[]
): Alert[] {
  const out: Alert[] = [];

  excursions.filter((e) => !e.acknowledged && e.severity !== "minor").slice(0, 5).forEach((e) =>
    out.push({
      id: `ALR-EXC-${e.id}`,
      module: "coldchain",
      severity: e.severity === "critical" ? "critical" : "warning",
      title: `${e.kind === "freeze" ? "FREEZE" : e.severity.toUpperCase()} cold-chain excursion — ${e.productName}`,
      detail: `Shipment ${e.shipmentRef}: ${e.kind === "freeze" ? "−" : "+"}${e.peakDeviation}°C ${e.kind === "freeze" ? "below 0°C" : "over limit"}, MKT ${e.mkt}°C over ${e.durationMin}min.${e.stabilityImpacted ? " Stability impacted." : ""}`,
      timestamp: e.startedAt,
      acknowledged: false,
    })
  );

  // Quality / NSQ alerts matched to held inventory — the #1 India problem.
  qualityAlerts
    .filter((q) => q.inInventory && q.action !== "cleared")
    .slice(0, 5)
    .forEach((q) =>
      out.push({
        id: `ALR-QA-${q.id}`,
        module: "quality",
        severity:
          q.defect === "deg_eg" || q.defect === "spurious" || q.defect === "nitrosamine"
            ? "critical"
            : "warning",
        title: `${q.defect === "deg_eg" ? "DEG/EG contamination" : q.defect === "spurious" ? "Spurious drug" : "NSQ batch"} — ${q.productName}`,
        detail: `${q.description}. Batch ${q.batchNo} (${q.testLab}). ${q.unitsHeld.toLocaleString("en-IN")} units held → ${q.action.replace("_", " ")}.`,
        timestamp: q.flaggedAt,
        acknowledged: false,
      })
    );

  shortages.filter((s) => s.riskScore >= 65).slice(0, 4).forEach((s) =>
    out.push({
      id: `ALR-SHT-${s.id}`,
      module: "inventory",
      severity: s.riskScore >= 80 ? "critical" : "warning",
      title: `${s.essential ? "Essential medicine" : "Product"} shortage risk — ${s.productName}`,
      detail: `Risk ${s.riskScore}/100. ${s.affectedFacilities} facilities below reorder point.`,
      // Deterministic offset (not Math.random) so server and client render the
      // same timestamp — avoids a React hydration mismatch on the alert feed.
      timestamp: addDays(NOW, -((hashSeed(s.id) % 1000) / 1000)),
      acknowledged: false,
    })
  );

  recalls.filter((r) => r.status !== "completed").slice(0, 3).forEach((r) =>
    out.push({
      id: `ALR-RCL-${r.id}`,
      module: "compliance",
      severity: r.recallClass === "I" ? "critical" : "warning",
      title: `Class ${r.recallClass} recall in progress — ${r.productName}`,
      detail: `${r.ref}: ${Math.round((r.retrievedUnits / r.affectedUnits) * 100)}% retrieved. ${r.reason}.`,
      timestamp: r.initiatedAt,
      acknowledged: false,
    })
  );

  const suspects = serials.filter((s) => s.status === "suspect" || s.riskScore >= 70);
  if (suspects.length) {
    out.push({
      id: "ALR-TRC-suspect",
      module: "trace",
      severity: "critical",
      title: `${suspects.length} units flagged as suspect (possible counterfeit)`,
      detail: `Anti-counterfeit engine detected anomalous scan patterns. Highest risk score ${Math.max(...suspects.map((s) => s.riskScore))}/100.`,
      timestamp: addDays(NOW, -0.2),
      acknowledged: false,
    });
  }

  requirements.filter((r) => r.status === "non_compliant").forEach((r) =>
    out.push({
      id: `ALR-REQ-${r.id}`,
      module: "compliance",
      severity: "warning",
      title: `Compliance gap — ${r.framework}`,
      detail: `${r.title}. Owner: ${r.owner}.`,
      timestamp: addDays(NOW, -1),
      acknowledged: false,
    })
  );

  // QMS: overdue CAPAs (past their severity-driven SLA) — a regulatory exposure.
  capas.filter((c) => c.status === "overdue").slice(0, 4).forEach((c) =>
    out.push({
      id: `ALR-CAPA-${c.id}`,
      module: "qms",
      severity: "critical",
      title: `Overdue CAPA — ${c.ref}`,
      detail: `${c.kind} action for ${c.deviationRef} past due (${c.progress}% complete). Owner: ${c.owner}.`,
      timestamp: c.dueAt,
      acknowledged: false,
    })
  );

  // QMS: batch releases blocked / rejected (DEG-EG, uncertified excipient, holds).
  batchRecords
    .filter((b) => b.status === "on_hold" || b.status === "rejected")
    .slice(0, 3)
    .forEach((b) =>
      out.push({
        id: `ALR-BMR-${b.id}`,
        module: "qms",
        severity: b.status === "rejected" || !b.degEgClear ? "critical" : "warning",
        title: `${b.status === "rejected" ? "Batch rejected" : "Batch release on hold"} — ${b.productName}`,
        detail: `Batch ${b.batchNo}: ${!b.degEgClear ? "DEG/EG not cleared. " : ""}${b.excipientGrade === "uncertified" ? "Uncertified excipient. " : ""}${b.openDeviations} open deviation(s).`,
        timestamp: addDays(NOW, -((hashSeed(b.id) % 1000) / 1000)),
        acknowledged: false,
      })
    );

  // WMS: FEFO violations — older stock left behind, future expiry write-off risk.
  const fefoViolations = pickTasks.filter((t) => !t.fefoCompliant && t.status !== "short");
  if (fefoViolations.length) {
    out.push({
      id: "ALR-WMS-fefo",
      module: "warehouse",
      severity: "warning",
      title: `${fefoViolations.length} FEFO pick violation${fefoViolations.length > 1 ? "s" : ""}`,
      detail: `Picks pulled a later-expiry batch over an earlier one (e.g. ${fefoViolations[0].productName}, ${fefoViolations[0].ref}). Older stock at expiry-loss risk.`,
      timestamp: addDays(NOW, -0.1),
      acknowledged: false,
    });
  }

  // WMS: short picks — orders that could not be fully fulfilled.
  const shortPicks = pickTasks.filter((t) => t.status === "short");
  if (shortPicks.length) {
    out.push({
      id: "ALR-WMS-short",
      module: "warehouse",
      severity: "warning",
      title: `${shortPicks.length} short pick${shortPicks.length > 1 ? "s" : ""} — fulfilment gap`,
      detail: `Insufficient stock to fully pick ${shortPicks.length} order line(s), incl. ${shortPicks[0].productName} (${shortPicks[0].orderRef}).`,
      timestamp: addDays(NOW, -0.15),
      acknowledged: false,
    });
  }

  return out.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

// ────────────────────────────────────────────────────────────────────────────
// QMS builders: deviations → CAPA, batch records, audit trail
// ────────────────────────────────────────────────────────────────────────────

const sevFromExcursion = (s: Excursion["severity"]): DeviationSeverity =>
  s === "critical" ? "critical" : s === "major" ? "major" : "minor";

/**
 * Deviations are not invented in a vacuum — they are raised from real signals:
 * stability-impacting cold-chain excursions, CDSCO/QC quality failures matched to
 * held inventory, and a baseline of line/equipment/documentation events. This
 * mirrors how a real QMS aggregates deviations from across the plant and chain.
 */
function buildDeviations(
  excursions: Excursion[],
  qualityAlerts: QualityAlert[],
  batches: Batch[],
  products: Product[]
): Deviation[] {
  const out: Deviation[] = [];
  let seq = 1;
  const ref = () => `DEV-2026-${String(seq++).padStart(4, "0")}`;

  // 1) From stability-impacting excursions.
  excursions
    .filter((e) => e.stabilityImpacted)
    .slice(0, 6)
    .forEach((e) => {
      const rnd = mulberry32(hashSeed(e.id + "dev"));
      const age = Math.floor(rnd() * 25) + 1;
      const severity = sevFromExcursion(e.severity);
      const status =
        rnd() > 0.7 ? "closed" : rnd() > 0.4 ? "capa_assigned" : rnd() > 0.5 ? "investigating" : "open";
      out.push({
        id: `DEVN-EXC-${e.id}`,
        ref: ref(),
        title: `${e.kind === "freeze" ? "Freeze" : "Heat"} excursion — ${e.productName}`,
        type: "temperature_excursion",
        severity,
        status,
        productName: e.productName,
        batchNo: e.shipmentRef,
        raisedAt: addDays(NOW, -age),
        owner: pick(QA_OFFICERS, rnd()),
        source: "Cold Chain",
        ageDays: age,
        capaId: status === "capa_assigned" || status === "closed" ? `CAPA-EXC-${e.id}` : null,
      });
    });

  // 2) From quality failures held in inventory (NSQ/contamination/OOS).
  qualityAlerts
    .filter((q) => q.inInventory && q.action !== "cleared")
    .slice(0, 6)
    .forEach((q) => {
      const rnd = mulberry32(hashSeed(q.id + "dev"));
      const age = Math.floor(rnd() * 30) + 2;
      const severity: DeviationSeverity =
        q.defect === "deg_eg" || q.defect === "spurious" || q.defect === "nitrosamine"
          ? "critical"
          : q.defect === "adulterated"
            ? "major"
            : "major";
      const type: DeviationType = q.defect === "adulterated" ? "contamination" : "oos";
      const status = q.action === "recall_initiated" ? "capa_assigned" : rnd() > 0.5 ? "investigating" : "open";
      out.push({
        id: `DEVN-QA-${q.id}`,
        ref: ref(),
        title: `${q.description.split(" — ")[0]} — ${q.productName}`,
        type,
        severity,
        status,
        productName: q.productName,
        batchNo: q.batchNo,
        raisedAt: q.flaggedAt,
        owner: pick(QA_OFFICERS, rnd()),
        source: q.source.includes("CDSCO") ? "CDSCO alert" : "QC Lab",
        ageDays: age,
        capaId: status === "capa_assigned" ? `CAPA-QA-${q.id}` : null,
      });
    });

  // 3) Baseline line/equipment/documentation deviations on real batches.
  const baselineTypes: DeviationType[] = ["process", "equipment", "documentation"];
  for (let i = 0; i < 5; i++) {
    const rnd = mulberry32(hashSeed("devbase" + i));
    const batch = pick(batches, rnd());
    const product = products.find((p) => p.id === batch.productId)!;
    const type = baselineTypes[i % baselineTypes.length];
    const age = Math.floor(rnd() * 40) + 1;
    const severity: DeviationSeverity = rnd() > 0.8 ? "major" : "minor";
    const status = rnd() > 0.55 ? "closed" : rnd() > 0.5 ? "capa_assigned" : "investigating";
    out.push({
      id: `DEVN-BASE-${i}`,
      ref: ref(),
      title: `${type === "process" ? "Process" : type === "equipment" ? "Equipment" : "Documentation"} deviation — ${product.name}`,
      type,
      severity,
      status,
      productName: product.name,
      batchNo: batch.batchNo,
      raisedAt: addDays(NOW, -age),
      owner: pick(QA_OFFICERS, rnd()),
      source: "Line",
      ageDays: age,
      capaId: status === "capa_assigned" || status === "closed" ? `CAPA-BASE-${i}` : null,
    });
  }

  return out.sort((a, b) => +new Date(b.raisedAt) - +new Date(a.raisedAt));
}

/** One CAPA per deviation that has a `capaId`, with SLA-driven due dates. */
function buildCapas(deviations: Deviation[]): Capa[] {
  return deviations
    .filter((d) => d.capaId)
    .map((d, i) => {
      const rnd = mulberry32(hashSeed(d.capaId! + "capa"));
      const kind = rnd() > 0.55 ? "corrective" : "preventive";
      const openedAt = d.raisedAt;
      const dueAt = addDays(new Date(openedAt), capaSlaDays(d.severity));
      const closed = d.status === "closed";
      const progress = closed ? 100 : Math.floor(rnd() * 80) + 5;
      const baseStatus = closed
        ? "closed"
        : progress > 70
          ? "effectiveness_check"
          : progress > 20
            ? "in_progress"
            : "open";
      // Promote to "overdue" if past the SLA due date and not yet closed.
      const status = capaEffectiveStatus(baseStatus, dueAt);
      return {
        id: d.capaId!,
        ref: `CAPA-2026-${String(i + 1).padStart(4, "0")}`,
        deviationRef: d.ref,
        kind,
        rootCause: pick(ROOT_CAUSES, rnd()),
        action: pick(CAPA_ACTIONS, rnd()),
        owner: d.owner,
        openedAt,
        dueAt,
        status,
        progress,
        effective: closed ? rnd() > 0.2 : null,
      } satisfies Capa;
    });
}

/**
 * Batch Manufacturing Records (release dossiers). Release is GMP-gated: a batch
 * can only be "released" with all checks complete, no open deviations, and (for
 * liquid orals) DEG/EG clearance on pharmacopoeial-grade excipients.
 */
function buildBatchRecords(
  batches: Batch[],
  products: Product[],
  deviations: Deviation[]
): BatchRecord[] {
  // Map open deviations onto their batch numbers.
  const openByBatch = new Map<string, number>();
  for (const d of deviations) {
    if (d.status !== "closed") openByBatch.set(d.batchNo, (openByBatch.get(d.batchNo) ?? 0) + 1);
  }

  return batches
    .filter((b) => b.status !== "expired")
    .slice(0, 16)
    .map((b) => {
      const product = products.find((p) => p.id === b.productId)!;
      const rnd = mulberry32(hashSeed(b.id + "bmr"));
      const checksTotal = 12;
      const openDeviations = openByBatch.get(b.batchNo) ?? 0;
      const liquid = product.dosageForm === "syrup" || product.dosageForm === "injection";
      const degBlock = liquid && !b.degEgClear;
      const blocked = openDeviations > 0 || degBlock || b.excipientGrade === "uncertified";

      let status: BatchRecord["status"];
      let checksComplete: number;
      let releasedAt: string | null = null;
      if (b.status === "quarantined" || degBlock) {
        status = "on_hold";
        checksComplete = Math.floor(rnd() * 6) + 4;
      } else if (b.excipientGrade === "uncertified") {
        status = "rejected";
        checksComplete = Math.floor(rnd() * 8) + 2;
      } else if (blocked || rnd() > 0.65) {
        status = "in_review";
        checksComplete = Math.floor(rnd() * 4) + 7;
      } else {
        status = "released";
        checksComplete = checksTotal;
        releasedAt = addDays(NOW, -Math.floor(rnd() * 30) - 1);
      }

      return {
        id: `BMR-${b.id}`,
        batchId: b.id,
        batchNo: b.batchNo,
        productName: product.name,
        status,
        checksComplete,
        checksTotal,
        openDeviations,
        reviewedBy: pick(QA_OFFICERS, rnd()),
        degEgClear: b.degEgClear,
        excipientGrade: b.excipientGrade,
        releasedAt,
      } satisfies BatchRecord;
    });
}

/**
 * A tamper-evident, hash-chained audit trail of QMS actions. Each entry's hash
 * folds in the previous hash — altering any historical entry breaks every hash
 * downstream, which is exactly what GMP/21-CFR-Part-11 audit trails require.
 */
function buildAuditTrail(deviations: Deviation[], capas: Capa[], recalls: Recall[]): AuditEntry[] {
  type Raw = { timestamp: string; actor: string; action: string; entity: string };
  const raw: Raw[] = [];

  deviations.forEach((d) => {
    raw.push({ timestamp: d.raisedAt, actor: d.owner, action: `Raised deviation (${d.severity})`, entity: d.ref });
    if (d.status === "closed")
      raw.push({ timestamp: addDays(new Date(d.raisedAt), d.ageDays), actor: d.owner, action: "Closed deviation", entity: d.ref });
  });
  capas.forEach((c) => {
    raw.push({ timestamp: c.openedAt, actor: c.owner, action: `Opened ${c.kind} CAPA`, entity: c.ref });
    if (c.status === "closed")
      raw.push({ timestamp: c.dueAt, actor: c.owner, action: `Closed CAPA (effective: ${c.effective ? "yes" : "no"})`, entity: c.ref });
  });
  recalls.forEach((r) => {
    raw.push({ timestamp: r.initiatedAt, actor: "Regulatory Affairs", action: `Initiated Class ${r.recallClass} recall`, entity: r.ref });
  });

  raw.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));

  let prevHash = "00000000";
  const out: AuditEntry[] = raw.map((e, i) => {
    const payload = `${e.timestamp}|${e.actor}|${e.action}|${e.entity}`;
    const hash = chainHash(prevHash, payload + i);
    const entry: AuditEntry = { id: `AUD-${i}`, ...e, hash, prevHash };
    prevHash = hash;
    return entry;
  });
  // Newest first for display; the chain itself was built oldest→newest.
  return out.reverse();
}

// ────────────────────────────────────────────────────────────────────────────
// WMS builders: putaway, FEFO picking, dispatch
// ────────────────────────────────────────────────────────────────────────────

const zoneForStorage = (storage: Product["storage"]): WarehouseZone =>
  storage === "refrigerated" || storage === "cool"
    ? "cold"
    : storage === "frozen"
      ? "frozen"
      : "ambient";

/**
 * FEFO pick tasks. For each task we look at all sellable batches of a product and
 * record whether the picker pulled the *earliest-expiry* one. We deliberately
 * inject a minority of FEFO violations so the warehouse FEFO-compliance control
 * has something to surface — in a real WMS these are the picks that quietly
 * strand older stock and turn into expiry write-offs.
 */
function buildPickTasks(products: Product[], batches: Batch[]): PickTask[] {
  const out: PickTask[] = [];
  for (let i = 0; i < 22; i++) {
    const rnd = mulberry32(hashSeed("pick" + i));
    const product = pick(products, rnd());
    const sellable = batches
      .filter((b) => b.productId === product.id && (b.status === "released" || b.status === "in_distribution"))
      .sort((a, b) => +new Date(a.expiryDate) - +new Date(b.expiryDate));
    if (!sellable.length) continue;

    // FEFO-correct choice is index 0; ~20% of picks violate FEFO.
    const violateFefo = sellable.length > 1 && rnd() > 0.8;
    const chosen = violateFefo ? sellable[1 + Math.floor(rnd() * (sellable.length - 1))] : sellable[0];
    const fefoCompliant = chosen.id === sellable[0].id;

    const qtyOrdered = Math.floor(rnd() * 1800) + 200;
    const roll = rnd();
    const status: PickTask["status"] =
      roll > 0.85 ? "short" : roll > 0.65 ? "dispatched" : roll > 0.45 ? "staged" : roll > 0.25 ? "picking" : "queued";
    const qtyPicked =
      status === "short"
        ? Math.floor(qtyOrdered * (0.3 + rnd() * 0.5))
        : status === "queued" || status === "picking"
          ? Math.floor(qtyOrdered * rnd())
          : qtyOrdered;
    const zone = zoneForStorage(product.storage);
    const priority: PickTask["priority"] =
      zone !== "ambient" ? "cold_chain" : product.essential && rnd() > 0.5 ? "urgent" : "standard";

    out.push({
      id: `PCK-${String(i).padStart(5, "0")}`,
      ref: `PCK-${10000 + i}`,
      orderRef: `SO-${44000 + Math.floor(rnd() * 900)}`,
      productName: product.name,
      batchNo: chosen.batchNo,
      expiryDate: chosen.expiryDate,
      zone,
      qtyOrdered,
      qtyPicked,
      status,
      fefoCompliant,
      picker: pick(PICKERS, rnd()),
      destination: ["Delhi", "Mumbai", "Chennai", "Kolkata", "Pune", "Hyderabad"][i % 6],
      priority,
    });
  }
  return out;
}

/** Inbound batches awaiting putaway to their correct (temperature) zone. */
function buildPutawayTasks(products: Product[], batches: Batch[]): PutawayTask[] {
  return batches
    .filter((b) => b.status === "released" || b.status === "in_production")
    .slice(0, 10)
    .map((b, i) => {
      const product = products.find((p) => p.id === b.productId)!;
      const rnd = mulberry32(hashSeed(b.id + "put"));
      const status: PutawayTask["status"] = rnd() > 0.6 ? "stored" : rnd() > 0.4 ? "in_progress" : "pending";
      return {
        id: `PUT-${i}`,
        ref: `GRN-${7700 + i}`,
        productName: product.name,
        batchNo: b.batchNo,
        units: Math.floor(rnd() * 40000) + 2000,
        suggestedZone: zoneForStorage(product.storage),
        status,
        receivedAt: addDays(NOW, -Math.floor(rnd() * 5)),
      } satisfies PutawayTask;
    });
}

/** Dispatch dock lanes built from outbound shipments. */
function buildDispatchLanes(shipments: Shipment[], products: Product[]): DispatchLane[] {
  return shipments
    .filter((s) => s.status !== "delivered")
    .slice(0, 5)
    .map((s, i) => {
      const rnd = mulberry32(hashSeed(s.id + "dock"));
      const product = products.find((p) => p.id === s.productId);
      const status: DispatchLane["status"] =
        s.progress > 0.05 ? "departed" : rnd() > 0.5 ? "staged" : "loading";
      return {
        id: `LANE-${i}`,
        dock: DOCKS[i % DOCKS.length],
        carrier: s.carrier.split(" ")[0],
        destination: s.destination.location.city,
        units: s.units,
        coldChain: !!product?.tempRange,
        status,
        cutoff: addDays(NOW, rnd() * 0.5),
      } satisfies DispatchLane;
    });
}

// ────────────────────────────────────────────────────────────────────────────
// Assemble (memoized singleton)
// ────────────────────────────────────────────────────────────────────────────

let _cache: VitalChainData | null = null;

export function getData(): VitalChainData {
  if (_cache) return _cache;

  const facilities = buildFacilities();
  const manufacturers = facilities.filter((f) => f.type === "manufacturer" || f.type === "cdmo");
  const products = buildProducts(manufacturers);
  const batches = buildBatches(products);
  const serials = buildSerials(batches, facilities, products);
  const shipments = buildShipments(products, batches, facilities);
  const excursions = buildExcursions(shipments, products);
  const stock = buildStock(products, batches, facilities);
  const shortages = buildShortages(products, stock);
  const recalls = buildRecalls(products, batches);
  const suppliers = buildSuppliers(facilities);
  const requirements = buildRequirements();
  const qualityAlerts = buildQualityAlerts(products, batches);

  // QMS
  const deviations = buildDeviations(excursions, qualityAlerts, batches, products);
  const capas = buildCapas(deviations);
  const batchRecords = buildBatchRecords(batches, products, deviations);
  const auditTrail = buildAuditTrail(deviations, capas, recalls);

  // WMS
  const pickTasks = buildPickTasks(products, batches);
  const putawayTasks = buildPutawayTasks(products, batches);
  const dispatchLanes = buildDispatchLanes(shipments, products);

  const alerts = buildAlerts(
    excursions,
    shortages,
    recalls,
    serials,
    requirements,
    qualityAlerts,
    capas,
    batchRecords,
    pickTasks
  );

  _cache = {
    markets: MARKETS,
    facilities,
    products,
    batches,
    serials,
    shipments,
    excursions,
    stock,
    shortages,
    recalls,
    suppliers,
    requirements,
    qualityAlerts,
    deviations,
    capas,
    batchRecords,
    auditTrail,
    pickTasks,
    putawayTasks,
    dispatchLanes,
    alerts,
  };
  return _cache;
}

// ────────────────────────────────────────────────────────────────────────────
// Time-series helpers (computed on demand for charts)
// ────────────────────────────────────────────────────────────────────────────

/** Synthesize a temperature/humidity profile for a shipment's journey. */
export function sensorSeries(shipment: Shipment, points = 48): SensorReading[] {
  const rnd = mulberry32(hashSeed(shipment.id + "sensor"));
  const { min, max } = shipment.tempRange;
  const mid = (min + max) / 2;
  const out: SensorReading[] = [];
  const start = new Date(shipment.departedAt).getTime();
  const end = NOW.getTime();
  const span = Math.max(end - start, dayMs);
  // pre-position excursion windows
  const breachWindows = Array.from({ length: shipment.excursionCount }, () => Math.floor(rnd() * points));
  for (let i = 0; i < points; i++) {
    const inBreach = breachWindows.some((w) => Math.abs(w - i) <= 1);
    const drift = (rnd() - 0.5) * (max - min) * 0.7;
    let temp = mid + drift;
    if (inBreach) temp = max + 1 + rnd() * 6;
    temp = +temp.toFixed(1);
    out.push({
      t: new Date(start + (span * i) / points).toISOString(),
      temp,
      humidity: +(45 + rnd() * 25).toFixed(0),
      breach: temp < min || temp > max,
    });
  }
  return out;
}

/** Synthesize a demand history + forecast with confidence band for a product. */
export function demandSeries(productId: string, history = 30, horizon = 14): DemandPoint[] {
  const rnd = mulberry32(hashSeed(productId + "demand"));
  const base = 200 + rnd() * 600;
  const trend = (rnd() - 0.4) * 6;
  const seasonAmp = base * 0.18;
  const out: DemandPoint[] = [];
  for (let i = -history; i < horizon; i++) {
    const season = Math.sin((i / 7) * Math.PI) * seasonAmp;
    const value = Math.max(0, base + trend * i + season);
    const isFuture = i >= 0;
    const noise = (rnd() - 0.5) * base * 0.12;
    const forecast = Math.round(value);
    const spread = Math.round(value * (0.08 + (isFuture ? (i / horizon) * 0.15 : 0)));
    out.push({
      date: addDays(NOW, i),
      actual: isFuture ? null : Math.round(value + noise),
      forecast,
      lower: Math.max(0, forecast - spread),
      upper: forecast + spread,
    });
  }
  return out;
}

/** Reconstruct the hash-chained chain-of-custody for a serial unit. */
export function chainOfCustody(serial: SerialUnit, facilities: Facility[]): ChainEvent[] {
  const rnd = mulberry32(hashSeed(serial.id + "coc"));
  const steps: ChainEvent["step"][] = ["commissioning", "packing", "shipping", "receiving", "inspecting", "dispensing"];
  const path = facilities.filter((f) => f.location.market === "IN").slice(0, 6);
  let prevHash = "00000000";
  const out: ChainEvent[] = [];
  const n = serial.status === "dispensed" ? 6 : serial.status === "in_transit" ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const fac = path[i % path.length];
    const payload = `${serial.serial}|${steps[i]}|${fac.id}`;
    const hash = chainHash(prevHash, payload + i);
    out.push({
      id: `CE-${serial.id}-${i}`,
      serialId: serial.id,
      timestamp: addDays(NOW, -(n - i) * 2 - rnd()),
      step: steps[i],
      facilityId: fac.id,
      facilityName: fac.name,
      location: fac.location,
      hash,
      prevHash,
    });
    prevHash = hash;
  }
  return out;
}

/** Spark helper: deterministic small series for KPI cards. */
export function spark(seed: string, n = 12, up = true): number[] {
  const rnd = mulberry32(hashSeed(seed));
  let v = 40 + rnd() * 20;
  return Array.from({ length: n }, (_, i) => {
    v += (rnd() - (up ? 0.4 : 0.6)) * 8;
    v = clamp(v, 5, 100);
    return +v.toFixed(1);
  });
}
