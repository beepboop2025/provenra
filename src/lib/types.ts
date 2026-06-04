/**
 * VitalChain domain model.
 *
 * This file encodes the pharma supply-chain "vocabulary" as types. In regulated
 * pharma, the data model mirrors the regulatory model: a Batch has legally
 * defined relationships to SerialUnits, Expiry, and Recalls. Encoding those
 * relationships here lets the TypeScript compiler enforce correctness across
 * the whole app — the foundation of a future-proof, audit-grade system.
 *
 * Markets are first-class so the platform ships India-first but is structured
 * for international expansion (US DSCSA, EU FMD, etc.) from day one.
 */

// ────────────────────────────────────────────────────────────────────────────
// Geography & markets
// ────────────────────────────────────────────────────────────────────────────

export type MarketCode = "IN" | "US" | "EU" | "AE" | "SG" | "BR";

export interface Market {
  code: MarketCode;
  name: string;
  /** Primary regulator (CDSCO for India, FDA for US, EMA for EU, ...). */
  regulator: string;
  /** Serialization / track-and-trace mandate in this market. */
  traceScheme: string;
  currency: "INR" | "USD" | "EUR" | "AED" | "SGD" | "BRL";
  active: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Location extends GeoPoint {
  city: string;
  /** State (India) or region/province (international). */
  region: string;
  market: MarketCode;
}

// ────────────────────────────────────────────────────────────────────────────
// Facilities & supply chain network
// ────────────────────────────────────────────────────────────────────────────

export type FacilityType =
  | "manufacturer" // API/formulation plant
  | "cdmo" // contract manufacturer
  | "cfa" // carrying & forwarding agent (India distribution backbone)
  | "warehouse"
  | "distributor"
  | "port" // sea/air port of entry/exit
  | "pharmacy"
  | "hospital";

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  location: Location;
  /** GMP / GDP certification state. */
  certified: boolean;
  /** WHO-GMP, Schedule M, ISO etc. */
  certifications: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Products, batches & serialized units (track & trace core)
// ────────────────────────────────────────────────────────────────────────────

/** Indian Drugs & Cosmetics Act schedules + OTC. Drives storage/dispensing rules. */
export type DrugSchedule = "H" | "H1" | "X" | "G" | "OTC";

export type DosageForm =
  | "tablet"
  | "capsule"
  | "injection"
  | "vaccine"
  | "syrup"
  | "biologic"
  | "ointment";

/** Storage regime. Cold-chain products feed the Cold Chain module. */
export type StorageCondition =
  | "ambient" // 15–25°C
  | "cool" // 8–15°C
  | "refrigerated" // 2–8°C (most vaccines, insulin)
  | "frozen"; // -25 to -15°C

export interface TempRange {
  min: number;
  max: number;
}

export interface Product {
  id: string;
  /** Brand name. */
  name: string;
  genericName: string;
  manufacturerId: string;
  dosageForm: DosageForm;
  strength: string;
  therapeuticCategory: string;
  schedule: DrugSchedule;
  storage: StorageCondition;
  /** Required temperature band for cold-chain SKUs. */
  tempRange: TempRange | null;
  /** GS1 Global Trade Item Number — the barcode backbone of serialization. */
  gtin: string;
  /** Maximum Retail Price (India). */
  mrp: number;
  /** Is this product on the National List of Essential Medicines? */
  essential: boolean;
}

export type BatchStatus =
  | "in_production"
  | "released" // QA released to market
  | "in_distribution"
  | "quarantined" // held pending investigation
  | "recalled"
  | "expired";

export interface Batch {
  id: string;
  /** Manufacturer's batch/lot number. */
  batchNo: string;
  productId: string;
  manufacturerId: string;
  mfgDate: string; // ISO
  expiryDate: string; // ISO
  /** Total serialized units produced in this batch. */
  quantity: number;
  status: BatchStatus;
}

export type SerialStatus =
  | "commissioned" // serial assigned at packaging
  | "in_transit"
  | "at_facility"
  | "dispensed" // sold/administered to patient
  | "recalled"
  | "suspect" // flagged by anti-counterfeit engine
  | "decommissioned";

/**
 * A single saleable unit with a unique serial number. The atom of track & trace.
 * `parentId` enables aggregation hierarchy (unit → carton → case → pallet).
 */
export interface SerialUnit {
  id: string;
  /** GS1 serialized GTIN (sGTIN) human-readable form. */
  serial: string;
  gtin: string;
  batchId: string;
  status: SerialStatus;
  currentFacilityId: string;
  /** Aggregation parent (e.g. the case this unit was packed into). */
  parentId: string | null;
  /** Counterfeit risk score 0–100 from the verification engine. */
  riskScore: number;
}

/** One hop in a serial unit's chain of custody. */
export interface ChainEvent {
  id: string;
  serialId: string;
  timestamp: string;
  /** GS1 EPCIS-style business step. */
  step:
    | "commissioning"
    | "packing"
    | "shipping"
    | "receiving"
    | "inspecting"
    | "dispensing"
    | "decommissioning";
  facilityId: string;
  facilityName: string;
  location: Location;
  /** Tamper-evident hash linking to the previous event (audit chain). */
  hash: string;
  prevHash: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Cold chain (shipments & telemetry)
// ────────────────────────────────────────────────────────────────────────────

export type ShipmentStatus =
  | "scheduled"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "exception"; // active cold-chain breach or other problem

export interface Shipment {
  id: string;
  ref: string;
  productId: string;
  batchId: string;
  units: number;
  carrier: string;
  origin: Facility;
  destination: Facility;
  status: ShipmentStatus;
  departedAt: string;
  etaAt: string;
  /** Progress along route, 0–1. */
  progress: number;
  /** Required temperature band carried by this shipment. */
  tempRange: TempRange;
  /** Latest sensor reading. */
  lastTemp: number;
  /** Number of temperature excursions detected so far. */
  excursionCount: number;
}

export interface SensorReading {
  t: string; // ISO timestamp
  temp: number;
  humidity: number;
  /** True if outside the required band at this moment. */
  breach: boolean;
}

export type ExcursionSeverity = "minor" | "major" | "critical";

export interface Excursion {
  id: string;
  shipmentId: string;
  shipmentRef: string;
  productName: string;
  startedAt: string;
  durationMin: number;
  /** Peak deviation from the nearest band edge, °C. */
  peakDeviation: number;
  severity: ExcursionSeverity;
  /** Mean Kinetic Temperature over the excursion window. */
  mkt: number;
  /** Has product stability been compromised (quality decision)? */
  stabilityImpacted: boolean;
  acknowledged: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Inventory & shortage risk
// ────────────────────────────────────────────────────────────────────────────

export type StockHealth = "healthy" | "watch" | "low" | "stockout" | "excess";

export interface StockPosition {
  id: string;
  facilityId: string;
  facilityName: string;
  productId: string;
  productName: string;
  onHand: number;
  /** Average daily demand at this facility. */
  dailyDemand: number;
  reorderPoint: number;
  /** Days of cover remaining = onHand / dailyDemand. */
  daysOfCover: number;
  /** Earliest-expiring batch at this facility. */
  nextExpiry: string;
  /** Units at risk of expiring before they can be sold (FEFO). */
  expiringUnits: number;
  health: StockHealth;
}

export interface ShortageAlert {
  id: string;
  productId: string;
  productName: string;
  /** National-level projected stockout date. */
  projectedStockout: string;
  /** Facilities currently below reorder point. */
  affectedFacilities: number;
  essential: boolean;
  /** 0–100 composite shortage risk. */
  riskScore: number;
}

export interface DemandPoint {
  date: string;
  /** Historical or actual demand. */
  actual: number | null;
  /** Forecasted demand. */
  forecast: number;
  /** Forecast confidence band. */
  lower: number;
  upper: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Recall & compliance
// ────────────────────────────────────────────────────────────────────────────

/** Recall classification (FDA-style, also used by CDSCO guidance). */
export type RecallClass = "I" | "II" | "III";
export type RecallStatus =
  | "initiated"
  | "in_progress"
  | "completed"
  | "terminated";

export interface Recall {
  id: string;
  ref: string;
  productId: string;
  productName: string;
  batchIds: string[];
  reason: string;
  recallClass: RecallClass;
  status: RecallStatus;
  initiatedAt: string;
  /** Units that need to be retrieved. */
  affectedUnits: number;
  /** Units retrieved so far. */
  retrievedUnits: number;
  markets: MarketCode[];
}

export type SupplierTier = "critical" | "preferred" | "approved" | "probation";

export interface Supplier {
  id: string;
  name: string;
  type: FacilityType;
  market: MarketCode;
  tier: SupplierTier;
  /** 0–100 composite supplier risk (quality, delivery, financial, geo). */
  riskScore: number;
  onTimeDelivery: number; // %
  qualityRejectRate: number; // %
  lastAuditAt: string;
  certifications: string[];
  openCapas: number; // open corrective/preventive actions
}

export interface ComplianceRequirement {
  id: string;
  market: MarketCode;
  framework: string; // e.g. "Schedule M", "WHO-GMP", "DSCSA", "EU FMD"
  title: string;
  status: "compliant" | "at_risk" | "non_compliant";
  /** Next audit/renewal due. */
  dueDate: string;
  owner: string;
}

/** Tamper-evident audit log entry (hash-chained). */
export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  hash: string;
  prevHash: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Cross-cutting: unified alerts & KPIs
// ────────────────────────────────────────────────────────────────────────────

export type AlertModule = "trace" | "coldchain" | "inventory" | "compliance";
export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  module: AlertModule;
  severity: AlertSeverity;
  title: string;
  detail: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface Kpi {
  label: string;
  value: string;
  /** Period-over-period delta as a percentage (can be negative). */
  delta: number;
  /** Whether a positive delta is good (e.g. delivery rate) or bad (e.g. excursions). */
  deltaGood: "up" | "down";
  spark: number[];
}

/** The fully-assembled dataset the dashboard renders from. */
export interface VitalChainData {
  markets: Market[];
  facilities: Facility[];
  products: Product[];
  batches: Batch[];
  serials: SerialUnit[];
  shipments: Shipment[];
  excursions: Excursion[];
  stock: StockPosition[];
  shortages: ShortageAlert[];
  recalls: Recall[];
  suppliers: Supplier[];
  requirements: ComplianceRequirement[];
  alerts: Alert[];
}
