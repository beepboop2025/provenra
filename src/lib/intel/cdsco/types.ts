/**
 * CDSCO NSQ (Not-of-Standard-Quality) drug-alert types.
 */

/** Raw record shape returned by cdscoonline.gov.in /CDSCO/publicNsqDrugTable. */
export interface CdscoApiRecord {
  str_product_name: string;
  str_batch_no: string;
  dt_manufacturing_date: string;
  dt_expiry_date: string;
  str_manufactured_by: string;
  str_nsq_result: string;
  str_reporting_source: string;
  str_reported_by_lab_or_state: string;
  dt_reporting_month_year: string;
}

/** Normalized, persisted NSQ alert row with full provenance. */
export interface CdscoNsqAlert {
  id: string;
  monthKey: string;
  alertMonth: string;
  productName: string;
  batchNo: string;
  manufacturingDate: string | null;
  expiryDate: string | null;
  manufacturer: string;
  defect: string;
  reportingSource: string;
  reportedByLabOrState: string;
  sourceUrl: string;
  listingUrl: string;
  pdfUrl: string | null;
  retrievedAt: string;
  parserVersion: string;
  extractionMethod: string;
  extractionPrompt: string | null;
  rawExtractionLog: string | null;
}

/** Summary returned after a sync run. */
export interface CdscoSyncResult {
  source: "cdsco";
  status: "success" | "failed" | "noop";
  recordsFound: number;
  recordsInserted: number;
  recordsUpdated: number;
  latestRetrievedAt: string | null;
  error?: string;
}

export interface CdscoFeedMeta {
  totalRecords: number;
  latestRetrievedAt: string | null;
  months: string[];
}
