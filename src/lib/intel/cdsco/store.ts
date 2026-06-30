import { createHash } from "crypto";
import { getDb, initSchema } from "@/lib/intel/db";
import type { CdscoNsqAlert, CdscoSyncResult, CdscoFeedMeta } from "@/lib/intel/cdsco/types";

/**
 * Persistence layer for CDSCO NSQ alerts.
 *
 * Every record is stamped with source_url, listing_url, retrieved_at, and
 * parser_version so its origin is auditable. The id is a content hash so the
 * same alert is idempotent across syncs (upsert behaviour).
 */

const PARSER_VERSION = "cdsco-api-1.0";
const EXTRACTION_METHOD = "cdsco-json-api";

function alertId(alert: Omit<CdscoNsqAlert, "id">): string {
  const payload = `${alert.monthKey}|${alert.productName}|${alert.batchNo}|${alert.manufacturer}|${alert.defect}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export function ensureTables(): void {
  initSchema();
}

export function upsertAlerts(alerts: Omit<CdscoNsqAlert, "id">[]): CdscoSyncResult {
  ensureTables();
  const db = getDb();
  const retrievedAt = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO cdsco_nsq_alerts (
      id, month_key, alert_month, product_name, batch_no, manufacturing_date, expiry_date,
      manufacturer, defect, reporting_source, reported_by_lab_or_state,
      source_url, listing_url, pdf_url, retrieved_at, parser_version,
      extraction_method, extraction_prompt, raw_extraction_log
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      month_key = excluded.month_key,
      alert_month = excluded.alert_month,
      product_name = excluded.product_name,
      batch_no = excluded.batch_no,
      manufacturing_date = excluded.manufacturing_date,
      expiry_date = excluded.expiry_date,
      manufacturer = excluded.manufacturer,
      defect = excluded.defect,
      reporting_source = excluded.reporting_source,
      reported_by_lab_or_state = excluded.reported_by_lab_or_state,
      source_url = excluded.source_url,
      listing_url = excluded.listing_url,
      pdf_url = excluded.pdf_url,
      retrieved_at = excluded.retrieved_at,
      parser_version = excluded.parser_version,
      extraction_method = excluded.extraction_method,
      extraction_prompt = excluded.extraction_prompt,
      raw_extraction_log = excluded.raw_extraction_log
  `);

  let inserted = 0;
  let updated = 0;

  for (const a of alerts) {
    const id = alertId(a);
    const existing = db.prepare("SELECT 1 FROM cdsco_nsq_alerts WHERE id = ?").get(id);

    insert.run(
      id,
      a.monthKey,
      a.alertMonth,
      a.productName,
      a.batchNo,
      a.manufacturingDate,
      a.expiryDate,
      a.manufacturer,
      a.defect,
      a.reportingSource,
      a.reportedByLabOrState,
      a.sourceUrl,
      a.listingUrl,
      a.pdfUrl,
      a.retrievedAt,
      a.parserVersion,
      a.extractionMethod,
      a.extractionPrompt,
      a.rawExtractionLog,
    );

    if (existing) {
      updated++;
    } else {
      inserted++;
    }
  }

  return {
    source: "cdsco",
    status: "success",
    recordsFound: alerts.length,
    recordsInserted: inserted,
    recordsUpdated: updated,
    latestRetrievedAt: retrievedAt,
  };
}

export function getAlerts(options?: { limit?: number; monthKey?: string }): CdscoNsqAlert[] {
  ensureTables();
  const db = getDb();

  let sql = "SELECT * FROM cdsco_nsq_alerts";
  const params: (string | number)[] = [];

  if (options?.monthKey) {
    sql += " WHERE month_key = ?";
    params.push(options.monthKey);
  }

  sql += " ORDER BY month_key DESC, product_name ASC";

  if (options?.limit !== undefined) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    month_key: string;
    alert_month: string;
    product_name: string;
    batch_no: string;
    manufacturing_date: string | null;
    expiry_date: string | null;
    manufacturer: string;
    defect: string;
    reporting_source: string;
    reported_by_lab_or_state: string;
    source_url: string;
    listing_url: string;
    pdf_url: string | null;
    retrieved_at: string;
    parser_version: string;
    extraction_method: string;
    extraction_prompt: string | null;
    raw_extraction_log: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    monthKey: r.month_key,
    alertMonth: r.alert_month,
    productName: r.product_name,
    batchNo: r.batch_no,
    manufacturingDate: r.manufacturing_date,
    expiryDate: r.expiry_date,
    manufacturer: r.manufacturer,
    defect: r.defect,
    reportingSource: r.reporting_source,
    reportedByLabOrState: r.reported_by_lab_or_state,
    sourceUrl: r.source_url,
    listingUrl: r.listing_url,
    pdfUrl: r.pdf_url,
    retrievedAt: r.retrieved_at,
    parserVersion: r.parser_version,
    extractionMethod: r.extraction_method,
    extractionPrompt: r.extraction_prompt,
    rawExtractionLog: r.raw_extraction_log,
  }));
}

export function getFeedMeta(): CdscoFeedMeta {
  ensureTables();
  const db = getDb();

  const totalRow = db.prepare("SELECT COUNT(*) as c FROM cdsco_nsq_alerts").get() as { c: number };
  const latestRow = db
    .prepare("SELECT retrieved_at FROM cdsco_nsq_alerts ORDER BY retrieved_at DESC LIMIT 1")
    .get() as { retrieved_at: string } | null;
  const months = db
    .prepare("SELECT DISTINCT month_key FROM cdsco_nsq_alerts ORDER BY month_key DESC")
    .all() as Array<{ month_key: string }>;

  return {
    totalRecords: totalRow.c,
    latestRetrievedAt: latestRow?.retrieved_at ?? null,
    months: months.map((m) => m.month_key),
  };
}

export function recordRun(run: Omit<CdscoSyncResult, "source"> & { error?: string }): void {
  ensureTables();
  const db = getDb();
  db.prepare(
    `INSERT INTO ingestion_runs (source, started_at, finished_at, records_found, records_inserted, records_updated, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "cdsco",
    new Date().toISOString(),
    new Date().toISOString(),
    run.recordsFound,
    run.recordsInserted,
    run.recordsUpdated,
    run.status,
    run.error ?? null,
  );
}

export { PARSER_VERSION, EXTRACTION_METHOD };
