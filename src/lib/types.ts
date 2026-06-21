/**
 * Provenra domain model.
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
  /** Country the API / Key Starting Material is primarily sourced from. */
  apiSource: MarketCode | "CN";
  /** % of this product's API supply concentrated in `apiSource` (geopolitical risk). */
  apiDependencePct: number;
  /** Only one qualified manufacturer exists (single-source shortage risk). */
  singleSource: boolean;
  /** Price-capped under DPCO/NLEM (margin pressure → withdrawal/shortage risk). */
  priceCapped: boolean;
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
  /** Excipient/raw-material grade — the DEG/EG cough-syrup tragedy root cause. */
  excipientGrade: "pharmacopoeial" | "uncertified";
  /** DEG/EG contamination test cleared (gates release for liquid orals). */
  degEgClear: boolean;
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
  /** Freeze excursions silently destroy DPT/Hep-B/insulin and are the most
   *  damaging, most-missed kind in India's cold chain. */
  kind: "freeze" | "heat";
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
  /** Indian states the affected batches reached — India has no mandatory
   *  nationwide recall law, so cross-state coordination must be tracked. */
  affectedStates: string[];
  /** Whether nationwide cross-state withdrawal has been coordinated. */
  nationwideCoordination: boolean;
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
  /** Revised Schedule M GMP readiness (deadline 31 Dec 2025 for MSMEs). */
  gmpReadiness: "compliant" | "gap_filed" | "in_progress" | "not_started";
  /** Number of NSQ (Not of Standard Quality) batches attributed to this supplier. */
  nsqFlags: number;
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

// ────────────────────────────────────────────────────────────────────────────
// Quality / NSQ surveillance (the #1 India problem: NSQ ≫ counterfeit)
// ────────────────────────────────────────────────────────────────────────────

/**
 * A drug-quality alert, modelled on CDSCO's monthly "Not of Standard Quality"
 * (NSQ) / spurious drug alerts. CDSCO flags ~150+ failing batches every month;
 * ingesting these and matching them to held inventory is the core of the
 * Quality Watch module.
 */
export type QualityDefect =
  | "nsq" // failed a pharmacopoeial spec (assay, dissolution, etc.)
  | "spurious" // counterfeit / falsified
  | "deg_eg" // diethylene/ethylene glycol contamination (cough-syrup tragedy)
  | "nitrosamine" // genotoxic nitrosamine impurity above limit
  | "adulterated"; // contamination / particulate / sterility failure

export interface QualityAlert {
  id: string;
  defect: QualityDefect;
  productName: string;
  batchNo: string;
  manufacturer: string;
  /** Central or state government testing laboratory that flagged it. */
  testLab: string;
  description: string;
  flaggedAt: string;
  /** Source feed, e.g. "CDSCO monthly drug alert". */
  source: string;
  /** Matched to a batch in our network? */
  inInventory: boolean;
  unitsHeld: number;
  action: "quarantined" | "investigating" | "recall_initiated" | "cleared";
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
// Quality Management System (QMS): deviation → CAPA lifecycle, batch records
// ────────────────────────────────────────────────────────────────────────────

/**
 * A GMP deviation — any departure from an approved procedure, specification or
 * standard. In a regulated plant every deviation must be investigated and, if
 * warranted, drive a CAPA. Deviations feed from QC labs, the line, and (in
 * Provenra) automatically from cold-chain excursions and CDSCO NSQ matches.
 */
export type DeviationType =
  | "temperature_excursion"
  | "oos" // out-of-specification lab result
  | "process" // process deviation on the line
  | "documentation"
  | "equipment"
  | "contamination";

export type DeviationSeverity = "minor" | "major" | "critical";
export type DeviationStatus =
  | "open"
  | "investigating"
  | "capa_assigned"
  | "closed";

export interface Deviation {
  id: string;
  ref: string; // DEV-2026-0001
  title: string;
  type: DeviationType;
  severity: DeviationSeverity;
  status: DeviationStatus;
  productName: string;
  batchNo: string;
  raisedAt: string;
  owner: string;
  /** Originating signal: "QC Lab", "Cold Chain", "CDSCO alert", "Line", ... */
  source: string;
  /** Days the deviation has been open (drives ageing / overdue flags). */
  ageDays: number;
  /** Linked CAPA, once one has been assigned. */
  capaId: string | null;
}

export type CapaKind = "corrective" | "preventive";
export type CapaStatus =
  | "open"
  | "in_progress"
  | "effectiveness_check" // action done, verifying it worked
  | "closed"
  | "overdue";

/** A Corrective and Preventive Action — the regulated response to a deviation. */
export interface Capa {
  id: string;
  ref: string; // CAPA-2026-0001
  deviationRef: string;
  kind: CapaKind;
  rootCause: string;
  action: string;
  owner: string;
  openedAt: string;
  dueAt: string;
  status: CapaStatus;
  /** 0–100 completion of the action plan. */
  progress: number;
  /** Post-closure effectiveness verdict (null until checked). */
  effective: boolean | null;
}

export type BmrStatus =
  | "in_review" // QA reviewing the batch record
  | "released" // QP/QA released to market
  | "on_hold" // blocked by an open deviation/CAPA
  | "rejected";

/**
 * Batch Manufacturing Record — the GMP release dossier for a batch. Release is
 * gated: all checklist items complete, no blocking deviations, and (for liquid
 * orals) DEG/EG clearance on pharmacopoeial-grade excipients.
 */
export interface BatchRecord {
  id: string;
  batchId: string;
  batchNo: string;
  productName: string;
  status: BmrStatus;
  /** Release checklist progress. */
  checksComplete: number;
  checksTotal: number;
  /** Open deviations blocking release. */
  openDeviations: number;
  reviewedBy: string;
  /** Carried from the batch — gates liquid-oral release. */
  degEgClear: boolean;
  excipientGrade: "pharmacopoeial" | "uncertified";
  releasedAt: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Warehouse Management (WMS): putaway, FEFO picking, dispatch
// ────────────────────────────────────────────────────────────────────────────

/** Physical storage regimes within a warehouse; quarantine holds NSQ/held stock. */
export type WarehouseZone =
  | "ambient"
  | "cold" // 2–8°C
  | "frozen" // -25 to -15°C
  | "quarantine"
  | "dispatch";

export type PickStatus =
  | "queued"
  | "picking"
  | "picked"
  | "staged"
  | "dispatched"
  | "short"; // could not fulfil full quantity

/**
 * A FEFO pick task: pull a quantity of a product, earliest-expiry batch first.
 * `fefoCompliant` records whether the *correct* (earliest-expiry) batch was
 * actually selected — the core control a WMS must enforce to prevent expiry loss.
 */
export interface PickTask {
  id: string;
  ref: string; // PCK-00001
  orderRef: string; // sales order it belongs to
  productName: string;
  batchNo: string;
  expiryDate: string;
  zone: WarehouseZone;
  qtyOrdered: number;
  qtyPicked: number;
  status: PickStatus;
  /** Was the earliest-expiry available batch picked? */
  fefoCompliant: boolean;
  picker: string;
  destination: string;
  priority: "standard" | "urgent" | "cold_chain";
}

export type PutawayStatus = "pending" | "in_progress" | "stored";

/** Inbound goods received and awaiting putaway to the correct zone. */
export interface PutawayTask {
  id: string;
  ref: string;
  productName: string;
  batchNo: string;
  units: number;
  /** Zone suggested from the product's storage regime. */
  suggestedZone: WarehouseZone;
  status: PutawayStatus;
  receivedAt: string;
}

/** A dispatch dock lane and the consignment currently staged at it. */
export interface DispatchLane {
  id: string;
  dock: string; // "Dock A1"
  carrier: string;
  destination: string;
  units: number;
  coldChain: boolean;
  status: "loading" | "staged" | "departed";
  /** Dispatch cut-off time for the lane. */
  cutoff: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Cross-cutting: unified alerts & KPIs
// ────────────────────────────────────────────────────────────────────────────

export type AlertModule =
  | "trace"
  | "coldchain"
  | "inventory"
  | "compliance"
  | "quality"
  | "warehouse"
  | "qms";
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
export interface ProvenraData {
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
  qualityAlerts: QualityAlert[];
  // QMS
  deviations: Deviation[];
  capas: Capa[];
  batchRecords: BatchRecord[];
  auditTrail: AuditEntry[];
  // WMS
  pickTasks: PickTask[];
  putawayTasks: PutawayTask[];
  dispatchLanes: DispatchLane[];
  alerts: Alert[];
}
