import { fetchNsqTable, monthKeyFromAlertMonth, CDSCO_LISTING_URL } from "@/lib/intel/cdsco/api";
import { upsertAlerts, getAlerts, getFeedMeta, recordRun, EXTRACTION_METHOD, PARSER_VERSION } from "@/lib/intel/cdsco/store";
import type { CdscoNsqAlert, CdscoSyncResult, CdscoFeedMeta, CdscoApiRecord } from "@/lib/intel/cdsco/types";

/**
 * CDSCO NSQ ingestion orchestrator.
 *
 * Public API:
 *   - syncCdscoNsq()      fetch + persist, with a 6-hour idempotency window.
 *   - getCdscoNsqAlerts() read persisted alerts.
 *   - getCdscoNsqMeta()   feed metadata (counts, latest retrieval).
 */

const NSQ_SOURCE_URL = "https://cdscoonline.gov.in/CDSCO/publicNsqDrugTable";
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function normalizeRecord(r: CdscoApiRecord): Omit<CdscoNsqAlert, "id"> {
  const alertMonth = (r.dt_reporting_month_year || "").trim().toUpperCase();
  const monthKey = monthKeyFromAlertMonth(alertMonth);

  return {
    monthKey,
    alertMonth: alertMonth || "Unknown",
    productName: (r.str_product_name || "").trim(),
    batchNo: (r.str_batch_no || "").trim(),
    manufacturingDate: (r.dt_manufacturing_date || null),
    expiryDate: (r.dt_expiry_date || null),
    manufacturer: (r.str_manufactured_by || "").trim(),
    defect: (r.str_nsq_result || "").trim(),
    reportingSource: (r.str_reporting_source || "").trim(),
    reportedByLabOrState: (r.str_reported_by_lab_or_state || "").trim(),
    sourceUrl: NSQ_SOURCE_URL,
    listingUrl: CDSCO_LISTING_URL,
    pdfUrl: null,
    retrievedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
    extractionMethod: EXTRACTION_METHOD,
    extractionPrompt: null,
    rawExtractionLog: null,
  };
}

export async function syncCdscoNsq(options?: { force?: boolean }): Promise<CdscoSyncResult> {
  const meta = getFeedMeta();

  // Skip if synced recently, unless force is true.
  if (!options?.force && meta.latestRetrievedAt) {
    const last = new Date(meta.latestRetrievedAt).getTime();
    if (Date.now() - last < SYNC_INTERVAL_MS) {
      return {
        source: "cdsco",
        status: "noop",
        recordsFound: meta.totalRecords,
        recordsInserted: 0,
        recordsUpdated: 0,
        latestRetrievedAt: meta.latestRetrievedAt,
      };
    }
  }

  const table = await fetchNsqTable();

  if (!table) {
    const result: CdscoSyncResult = {
      source: "cdsco",
      status: "failed",
      recordsFound: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      latestRetrievedAt: meta.latestRetrievedAt,
      error: "CDSCO API did not return a usable response.",
    };
    recordRun(result);
    return result;
  }

  const rows = table.aaData ?? [];
  const normalized = rows.map(normalizeRecord);

  // Capture a small raw log sample for provenance (first record only).
  if (normalized.length > 0) {
    const sample = rows[0];
    normalized[0].rawExtractionLog = JSON.stringify({
      apiShape: "DataTables response",
      iTotalRecords: table.iTotalRecords,
      iTotalDisplayRecords: table.iTotalDisplayRecords,
      sampleRecord: sample,
    });
  }

  const result = upsertAlerts(normalized);
  recordRun(result);
  return result;
}

export function getCdscoNsqAlerts(options?: { limit?: number; monthKey?: string }): CdscoNsqAlert[] {
  return getAlerts(options);
}

export function getCdscoNsqMeta(): CdscoFeedMeta {
  return getFeedMeta();
}
