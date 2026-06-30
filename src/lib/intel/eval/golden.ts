/**
 * Golden sample for evaluating CDSCO PDF AI extraction.
 *
 * These records mirror the JSON shape the LLM is asked to emit when extracting
 * from a CDSCO "Not of Standard Quality" monthly alert PDF. The eval harness
 * compares an extraction run against this truth set and reports accuracy.
 */

export interface CdscoGoldenRecord {
  product: string;
  manufacturer: string;
  batch: string;
  defect: string;
  lab: string;
}

export const CDSCO_GOLDEN_SAMPLE: CdscoGoldenRecord[] = [
  {
    product: "Paracetamol Tablets 500 mg",
    manufacturer: "Sunrise Pharmaceuticals Pvt Ltd",
    batch: "PCT-2025-04-B12",
    defect: "Assay not within limit; failed dissolution",
    lab: "CDTL, Kolkata",
  },
  {
    product: "Amoxicillin Capsules 250 mg",
    manufacturer: "Apex Labs Ltd",
    batch: "AMX-250-778",
    defect: "Diethylene glycol detected above permissible limit",
    lab: "RDTL, Mumbai",
  },
  {
    product: "Metformin Hydrochloride Tablets 500 mg",
    manufacturer: "Wellness Formulations",
    batch: "MET-500-9912",
    defect: "Related substances exceeding pharmacopoeial limits",
    lab: "CDTL, Guwahati",
  },
  {
    product: "Cetirizine Tablets 10 mg",
    manufacturer: "Nova Remedies",
    batch: "CET-10-4451",
    defect: "Spurious / suspected fake product",
    lab: "RDTL, Chennai",
  },
];

/**
 * Raw LLM-style response that should parse into the golden sample.
 * Used by tests to exercise the extraction parser + evaluator end-to-end.
 */
export const CDSCO_GOLDEN_LLM_RESPONSE = JSON.stringify(CDSCO_GOLDEN_SAMPLE);
