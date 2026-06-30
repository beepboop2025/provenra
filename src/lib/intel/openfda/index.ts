import {
  fetchEnforcementRecalls,
  fetchShortages,
  OPENFDA_ENFORCEMENT_URL,
  OPENFDA_SHORTAGES_URL,
  OPENFDA_ENFORCEMENT_LISTING_URL,
  OPENFDA_SHORTAGES_LISTING_URL,
} from "@/lib/intel/openfda/api";
import {
  upsertRecalls,
  upsertShortages,
  getRecalls,
  getShortages,
  getFeedMeta,
  recordRun,
  PARSER_VERSION,
  EXTRACTION_METHOD,
} from "@/lib/intel/openfda/store";
import type {
  OpenfdaEnforcementRecall,
  OpenfdaShortage,
  OpenfdaSyncResult,
  OpenfdaFeedMeta,
} from "@/lib/intel/openfda/types";

/**
 * openFDA ingestion orchestrator.
 *
 * Public API:
 *   - syncOpenfdaRecalls()    fetch + persist enforcement recalls, 6-hour window.
 *   - syncOpenfdaShortages()  fetch + persist drug shortages, 6-hour window.
 *   - syncOpenfdaFeeds()      refresh both feeds in parallel.
 *   - getOpenfdaRecalls()     read persisted recalls.
 *   - getOpenfdaShortages()   read persisted shortages.
 *   - getOpenfdaMeta()        combined feed metadata.
 */

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function fdaDate(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s || "—";
}

function normalizeRecall(r: Record<string, unknown>): Omit<OpenfdaEnforcementRecall, "id"> {
  return {
    recallNumber: str(r.recall_number),
    eventId: str(r.event_id),
    productDescription: str(r.product_description),
    codeInfo: str(r.code_info),
    recallingFirm: str(r.recalling_firm),
    reasonForRecall: str(r.reason_for_recall),
    classification: str(r.classification),
    status: str(r.status),
    distributionPattern: str(r.distribution_pattern),
    productQuantity: str(r.product_quantity),
    country: str(r.country),
    reportDate: fdaDate(r.report_date),
    recallInitiationDate: fdaDate(r.recall_initiation_date),
    sourceUrl: OPENFDA_ENFORCEMENT_URL,
    listingUrl: OPENFDA_ENFORCEMENT_LISTING_URL,
    retrievedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
    extractionMethod: EXTRACTION_METHOD,
    extractionPrompt: null,
    rawExtractionLog: null,
  };
}

function normalizeShortage(r: Record<string, unknown>): Omit<OpenfdaShortage, "id"> {
  const genericName = str(r.generic_name);
  return {
    drugName: genericName,
    genericName,
    companyName: str(r.company_name),
    therapeuticCategory: str(r.therapeutic_category),
    shortageReason: str(r.related_info),
    presentation: str(r.presentation),
    status: str(r.status),
    updateDate: str(r.update_date).slice(0, 10),
    dosageForm: str(r.dosage_form),
    relatedInfo: str(r.related_info),
    sourceUrl: OPENFDA_SHORTAGES_URL,
    listingUrl: OPENFDA_SHORTAGES_LISTING_URL,
    retrievedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
    extractionMethod: EXTRACTION_METHOD,
    extractionPrompt: null,
    rawExtractionLog: null,
  };
}

function makeFailedResult(source: "openfda-enforcement" | "openfda-shortages", error: string, meta: OpenfdaFeedMeta): OpenfdaSyncResult {
  return {
    source,
    status: "failed",
    recordsFound: 0,
    recordsInserted: 0,
    recordsUpdated: 0,
    latestRetrievedAt: meta.latestRetrievedAt,
    error,
  };
}

export async function syncOpenfdaRecalls(options?: { force?: boolean }): Promise<OpenfdaSyncResult> {
  const meta = getFeedMeta();

  if (!options?.force && meta.latestRetrievedAt) {
    const last = new Date(meta.latestRetrievedAt).getTime();
    if (Date.now() - last < SYNC_INTERVAL_MS) {
      return {
        source: "openfda-enforcement",
        status: "noop",
        recordsFound: meta.totalRecalls,
        recordsInserted: 0,
        recordsUpdated: 0,
        latestRetrievedAt: meta.latestRetrievedAt,
      };
    }
  }

  const response = await fetchEnforcementRecalls();

  if (!response) {
    const result = makeFailedResult("openfda-enforcement", "openFDA enforcement API did not return a usable response.", meta);
    recordRun(result.source, result);
    return result;
  }

  if (response.error) {
    const result = makeFailedResult(
      "openfda-enforcement",
      response.error.message || "openFDA enforcement API returned an error.",
      meta,
    );
    recordRun(result.source, result);
    return result;
  }

  const rows = (response.results ?? []) as Record<string, unknown>[];
  const normalized = rows.map(normalizeRecall);

  if (normalized.length > 0) {
    const sample = rows[0];
    normalized[0].rawExtractionLog = JSON.stringify({
      apiShape: "openFDA enforcement response",
      total: response.meta?.results?.total,
      sampleRecord: sample,
    });
  }

  const result = upsertRecalls(normalized);
  recordRun(result.source, result);
  return result;
}

export async function syncOpenfdaShortages(options?: { force?: boolean }): Promise<OpenfdaSyncResult> {
  const meta = getFeedMeta();

  if (!options?.force && meta.latestRetrievedAt) {
    const last = new Date(meta.latestRetrievedAt).getTime();
    if (Date.now() - last < SYNC_INTERVAL_MS) {
      return {
        source: "openfda-shortages",
        status: "noop",
        recordsFound: meta.totalShortages,
        recordsInserted: 0,
        recordsUpdated: 0,
        latestRetrievedAt: meta.latestRetrievedAt,
      };
    }
  }

  const response = await fetchShortages();

  if (!response) {
    const result = makeFailedResult("openfda-shortages", "openFDA shortages API did not return a usable response.", meta);
    recordRun(result.source, result);
    return result;
  }

  if (response.error) {
    const result = makeFailedResult(
      "openfda-shortages",
      response.error.message || "openFDA shortages API returned an error.",
      meta,
    );
    recordRun(result.source, result);
    return result;
  }

  const rows = (response.results ?? []) as Record<string, unknown>[];
  const normalized = rows.map(normalizeShortage);

  if (normalized.length > 0) {
    const sample = rows[0];
    normalized[0].rawExtractionLog = JSON.stringify({
      apiShape: "openFDA shortages response",
      total: response.meta?.results?.total,
      sampleRecord: sample,
    });
  }

  const result = upsertShortages(normalized);
  recordRun(result.source, result);
  return result;
}

export async function syncOpenfdaFeeds(options?: { force?: boolean }): Promise<{
  recalls: OpenfdaSyncResult;
  shortages: OpenfdaSyncResult;
}> {
  const [recalls, shortages] = await Promise.all([
    syncOpenfdaRecalls(options),
    syncOpenfdaShortages(options),
  ]);
  return { recalls, shortages };
}

export function getOpenfdaRecalls(options?: { limit?: number; classification?: string; status?: string }): OpenfdaEnforcementRecall[] {
  return getRecalls(options);
}

export function getOpenfdaShortages(options?: { limit?: number; status?: string }): OpenfdaShortage[] {
  return getShortages(options);
}

export function getOpenfdaMeta(): OpenfdaFeedMeta {
  return getFeedMeta();
}
