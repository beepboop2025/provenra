import type {
  DosageForm,
  DrugSchedule,
  Market,
  StorageCondition,
} from "@/lib/types";

/**
 * Static reference data. India-first, with international markets pre-registered
 * so expansion is a data change, not a rewrite.
 */

export const MARKETS: Market[] = [
  {
    code: "IN",
    name: "India",
    regulator: "CDSCO",
    traceScheme: "DAVA / iVEDA barcode (GS1)",
    currency: "INR",
    active: true,
  },
  {
    code: "US",
    name: "United States",
    regulator: "US FDA",
    traceScheme: "DSCSA (unit-level serialization)",
    currency: "USD",
    active: true,
  },
  {
    code: "EU",
    name: "European Union",
    regulator: "EMA",
    traceScheme: "EU FMD (2D DataMatrix + tamper-evidence)",
    currency: "EUR",
    active: true,
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    regulator: "MoHAP",
    traceScheme: "Tatmeen",
    currency: "AED",
    active: false,
  },
  {
    code: "SG",
    name: "Singapore",
    regulator: "HSA",
    traceScheme: "—",
    currency: "SGD",
    active: false,
  },
  {
    code: "BR",
    name: "Brazil",
    regulator: "ANVISA",
    traceScheme: "SNCM",
    currency: "BRL",
    active: false,
  },
];

/** India's real pharmaceutical manufacturing clusters, with coordinates. */
export const IN_HUBS = [
  { city: "Hyderabad", region: "Telangana", lat: 17.385, lng: 78.4867 },
  { city: "Ahmedabad", region: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Baddi", region: "Himachal Pradesh", lat: 30.9578, lng: 76.7914 },
  { city: "Mumbai", region: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { city: "Goa", region: "Goa", lat: 15.2993, lng: 74.124 },
  { city: "Sikkim", region: "Sikkim", lat: 27.533, lng: 88.5122 },
  { city: "Visakhapatnam", region: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  { city: "Indore", region: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { city: "Chennai", region: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { city: "Bengaluru", region: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Dehradun", region: "Uttarakhand", lat: 30.3165, lng: 78.0322 },
  { city: "Kolkata", region: "West Bengal", lat: 22.5726, lng: 88.3639 },
] as const;

/** Distribution / demand centres across India (CFAs, metros, tier-2 cities). */
export const IN_DEMAND_CENTERS = [
  { city: "Delhi", region: "Delhi", lat: 28.6139, lng: 77.209 },
  { city: "Pune", region: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Jaipur", region: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", region: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Patna", region: "Bihar", lat: 25.5941, lng: 85.1376 },
  { city: "Guwahati", region: "Assam", lat: 26.1445, lng: 91.7362 },
  { city: "Bhopal", region: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { city: "Kochi", region: "Kerala", lat: 9.9312, lng: 76.2673 },
  { city: "Nagpur", region: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Surat", region: "Gujarat", lat: 21.1702, lng: 72.8311 },
] as const;

export const INTL_NODES = [
  { city: "New Jersey", region: "NJ", lat: 40.0583, lng: -74.4057, market: "US" as const },
  { city: "Frankfurt", region: "Hesse", lat: 50.1109, lng: 8.6821, market: "EU" as const },
  { city: "Dubai", region: "Dubai", lat: 25.2048, lng: 55.2708, market: "AE" as const },
  { city: "Singapore", region: "Central", lat: 1.3521, lng: 103.8198, market: "SG" as const },
];

export const MANUFACTURERS = [
  "Aurobindo Generics",
  "Sun Lifesciences",
  "Cipla Biotech",
  "Dr. Reddy's Labs",
  "Lupin Pharma",
  "Zydus Healthcare",
  "Biocon Biologics",
  "Glenmark Sciences",
  "Torrent Pharma",
  "Mankind Remedies",
] as const;

export const CARRIERS = [
  "BlueDart Temperature Logistics",
  "Snowman Cold Chain",
  "DHL Medical Express",
  "Gati Cold Chain",
  "ColdEX Logistics",
  "Kuehne+Nagel Pharma",
] as const;

interface ProductSeed {
  name: string;
  generic: string;
  form: DosageForm;
  strength: string;
  category: string;
  schedule: DrugSchedule;
  storage: StorageCondition;
  tempMin: number | null;
  tempMax: number | null;
  mrp: number;
  essential: boolean;
}

/** A realistic catalogue spanning ambient SKUs and temperature-sensitive biologics. */
export const PRODUCTS: ProductSeed[] = [
  { name: "Covishield", generic: "ChAdOx1 nCoV-19 Vaccine", form: "vaccine", strength: "0.5ml", category: "Vaccines", schedule: "H", storage: "refrigerated", tempMin: 2, tempMax: 8, mrp: 780, essential: true },
  { name: "Humalog", generic: "Insulin Lispro", form: "injection", strength: "100IU/ml", category: "Diabetology", schedule: "H", storage: "refrigerated", tempMin: 2, tempMax: 8, mrp: 1840, essential: true },
  { name: "Enhertu", generic: "Trastuzumab Deruxtecan", form: "biologic", strength: "100mg", category: "Oncology", schedule: "H1", storage: "refrigerated", tempMin: 2, tempMax: 8, mrp: 168000, essential: false },
  { name: "Avonex", generic: "Interferon Beta-1a", form: "biologic", strength: "30mcg", category: "Neurology", schedule: "H1", storage: "frozen", tempMin: -25, tempMax: -15, mrp: 24500, essential: false },
  { name: "Augmentin", generic: "Amoxicillin + Clavulanate", form: "tablet", strength: "625mg", category: "Anti-infectives", schedule: "H", storage: "ambient", tempMin: null, tempMax: null, mrp: 215, essential: true },
  { name: "Dolo", generic: "Paracetamol", form: "tablet", strength: "650mg", category: "Analgesics", schedule: "OTC", storage: "ambient", tempMin: null, tempMax: null, mrp: 32, essential: true },
  { name: "Pantocid", generic: "Pantoprazole", form: "tablet", strength: "40mg", category: "Gastrology", schedule: "H", storage: "ambient", tempMin: null, tempMax: null, mrp: 145, essential: false },
  { name: "Telma", generic: "Telmisartan", form: "tablet", strength: "40mg", category: "Cardiology", schedule: "H", storage: "ambient", tempMin: null, tempMax: null, mrp: 118, essential: true },
  { name: "Azithral", generic: "Azithromycin", form: "tablet", strength: "500mg", category: "Anti-infectives", schedule: "H", storage: "ambient", tempMin: null, tempMax: null, mrp: 98, essential: true },
  { name: "Keytruda", generic: "Pembrolizumab", form: "biologic", strength: "100mg", category: "Oncology", schedule: "H1", storage: "refrigerated", tempMin: 2, tempMax: 8, mrp: 215000, essential: false },
  { name: "Rotavac", generic: "Rotavirus Vaccine", form: "vaccine", strength: "0.5ml", category: "Vaccines", schedule: "H", storage: "frozen", tempMin: -25, tempMax: -15, mrp: 540, essential: true },
  { name: "Lantus", generic: "Insulin Glargine", form: "injection", strength: "100IU/ml", category: "Diabetology", schedule: "H", storage: "refrigerated", tempMin: 2, tempMax: 8, mrp: 1620, essential: true },
  { name: "Crocin Syrup", generic: "Paracetamol Suspension", form: "syrup", strength: "120mg/5ml", category: "Analgesics", schedule: "OTC", storage: "ambient", tempMin: null, tempMax: null, mrp: 48, essential: false },
  { name: "Ecosprin", generic: "Aspirin", form: "tablet", strength: "75mg", category: "Cardiology", schedule: "H", storage: "ambient", tempMin: null, tempMax: null, mrp: 12, essential: true },
  { name: "Monocef", generic: "Ceftriaxone", form: "injection", strength: "1g", category: "Anti-infectives", schedule: "H", storage: "cool", tempMin: 8, tempMax: 15, mrp: 88, essential: true },
  { name: "Shycocan", generic: "Recombinant Antibody", form: "biologic", strength: "40mg", category: "Immunology", schedule: "H1", storage: "refrigerated", tempMin: 2, tempMax: 8, mrp: 9800, essential: false },
];

// Harmonized Textura categorical palette: a refined sweep from icy → mint →
// lavender → peach → coral, all desaturated to sit on pure black (no rainbow).
export const THERAPEUTIC_COLORS: Record<string, string> = {
  Vaccines: "#a1ecff",
  Diabetology: "#c6b4f5",
  Oncology: "#e6a8c8",
  Neurology: "#7fc8e8",
  "Anti-infectives": "#7fe0c2",
  Analgesics: "#f0c987",
  Gastrology: "#f0a987",
  Cardiology: "#ff7a63",
  Immunology: "#9fd8c4",
};

/** Indian states/UTs used for cross-state recall tracking. */
export const INDIAN_STATES = [
  "Maharashtra", "Uttar Pradesh", "Gujarat", "Tamil Nadu", "Karnataka",
  "West Bengal", "Rajasthan", "Madhya Pradesh", "Bihar", "Telangana",
  "Andhra Pradesh", "Kerala", "Delhi", "Punjab", "Haryana", "Assam",
] as const;

/** Government drug-testing laboratories that declare batches NSQ. */
export const TEST_LABS = [
  "CDL Kolkata (Central)",
  "CDTL Mumbai (Central)",
  "RDTL Chandigarh (Central)",
  "State Drug Lab, Maharashtra",
  "State Drug Lab, Gujarat",
  "State Drug Lab, Tamil Nadu",
  "State Drug Lab, Telangana",
] as const;

/**
 * NSQ / quality-defect templates modelled on CDSCO's monthly drug alerts
 * (incl. brands named in the Dec-2025 sweep: Telma, Pantop, Montina, Chymoral)
 * and the DEG/EG cough-syrup tragedies.
 */
export const QUALITY_DEFECTS = [
  { defect: "nsq" as const, desc: "Failed assay — active content below pharmacopoeial limit" },
  { defect: "nsq" as const, desc: "Failed dissolution test (delayed release)" },
  { defect: "nsq" as const, desc: "Failed uniformity of content" },
  { defect: "nsq" as const, desc: "Description / friability failure" },
  { defect: "deg_eg" as const, desc: "Diethylene glycol detected above acceptable limit" },
  { defect: "nitrosamine" as const, desc: "Nitrosamine impurity (NDMA) above acceptable intake" },
  { defect: "adulterated" as const, desc: "Particulate matter / microbial contamination" },
  { defect: "spurious" as const, desc: "Spurious — label declares a manufacturer who disowns the batch" },
] as const;

export const RECALL_REASONS = [
  "Failed dissolution specification (stability)",
  "Out-of-specification assay result",
  "Particulate matter detected in vials",
  "Cold-chain excursion compromising potency",
  "Mislabeling — incorrect strength on carton",
  "Microbial contamination above limit",
  "Nitrosamine impurity above acceptable intake",
  "Sterility assurance failure",
] as const;

// ── QMS reference data ───────────────────────────────────────────────────────

/** QA personnel who review batch records and own deviations/CAPAs. */
export const QA_OFFICERS = [
  "R. Iyer (QA Head)",
  "S. Banerjee (QC Lead)",
  "M. Patel (QA Officer)",
  "A. Khan (Microbiology)",
  "P. Nair (Validation)",
  "D. Sharma (Regulatory)",
] as const;

/** Investigation root causes (the "why" behind a deviation). */
export const ROOT_CAUSES = [
  "Reefer unit thermostat drift during transit",
  "Granulation end-point variability (process)",
  "Analyst calculation error in assay",
  "HVAC pressure differential out of range",
  "Excipient supplier change not fully validated",
  "Calibration overdue on dissolution apparatus",
  "Gowning SOP not followed in fill area",
  "Stability chamber excursion during study",
] as const;

/** Corrective / preventive action descriptions. */
export const CAPA_ACTIONS = [
  "Requalify reefer fleet; add redundant temperature loggers",
  "Tighten in-process controls and retrain line operators",
  "Implement second-person verification on QC calculations",
  "Recalibrate and add interlock to HVAC differential",
  "Re-validate excipient and add incoming-DEG/EG screening",
  "Reinstate calibration schedule with automated reminders",
  "Refresher gowning training and area access audit",
  "Revise stability protocol; add chamber alarm escalation",
] as const;

// ── WMS reference data ───────────────────────────────────────────────────────

/** Warehouse pickers (operators executing pick tasks). */
export const PICKERS = [
  "Ravi K.",
  "Sunita D.",
  "Imran S.",
  "Lakshmi N.",
  "Vijay P.",
  "Anita R.",
] as const;

/** Dispatch dock identifiers. */
export const DOCKS = ["Dock A1", "Dock A2", "Dock B1", "Dock B2", "Dock C1"] as const;
