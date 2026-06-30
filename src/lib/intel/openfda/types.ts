/**
 * openFDA — drug enforcement (recalls) and shortages types.
 *
 * Both feeds come from the public openFDA API (api.fda.gov) and carry the same
 * provenance stamp as the CDSCO feed: source_url, listing_url, retrieved_at,
 * parser_version, extraction_method, plus an optional raw extraction log.
 */

/** Raw enforcement record returned by api.fda.gov/drug/enforcement.json. */
export interface OpenfdaEnforcementApiRecord {
  recall_number?: string;
  event_id?: string;
  product_description?: string;
  code_info?: string;
  recalling_firm?: string;
  reason_for_recall?: string;
  classification?: string;
  status?: string;
  distribution_pattern?: string;
  product_quantity?: string;
  country?: string;
  report_date?: string;
  recall_initiation_date?: string;
}

/** Raw shortage record returned by api.fda.gov/drug/shortages.json. */
export interface OpenfdaShortageApiRecord {
  generic_name?: string;
  company_name?: string;
  therapeutic_category?: string;
  related_info?: string;
  presentation?: string;
  status?: string;
  update_date?: string;
  dosage_form?: string;
}

/** Normalized, persisted openFDA enforcement recall row with full provenance. */
export interface OpenfdaEnforcementRecall {
  id: string;
  recallNumber: string;
  eventId: string;
  productDescription: string;
  codeInfo: string;
  recallingFirm: string;
  reasonForRecall: string;
  classification: string;
  status: string;
  distributionPattern: string;
  productQuantity: string;
  country: string;
  reportDate: string;
  recallInitiationDate: string;
  sourceUrl: string;
  listingUrl: string;
  retrievedAt: string;
  parserVersion: string;
  extractionMethod: string;
  extractionPrompt: string | null;
  rawExtractionLog: string | null;
}

/** Normalized, persisted openFDA shortage row with full provenance. */
export interface OpenfdaShortage {
  id: string;
  drugName: string;
  genericName: string;
  companyName: string;
  therapeuticCategory: string;
  shortageReason: string;
  presentation: string;
  status: string;
  updateDate: string;
  dosageForm: string;
  relatedInfo: string;
  sourceUrl: string;
  listingUrl: string;
  retrievedAt: string;
  parserVersion: string;
  extractionMethod: string;
  extractionPrompt: string | null;
  rawExtractionLog: string | null;
}

/** Summary returned after a sync run. */
export interface OpenfdaSyncResult {
  source: "openfda-enforcement" | "openfda-shortages";
  status: "success" | "failed" | "noop";
  recordsFound: number;
  recordsInserted: number;
  recordsUpdated: number;
  latestRetrievedAt: string | null;
  error?: string;
}

/** Feed metadata. */
export interface OpenfdaFeedMeta {
  totalRecalls: number;
  totalShortages: number;
  latestRetrievedAt: string | null;
  recallClassifications: string[];
  shortageStatuses: string[];
}
