import { createHash } from "crypto";
import { getDb, initSchema, recordIngestionRun } from "@/lib/intel/db";
import type {
  OpenfdaEnforcementRecall,
  OpenfdaShortage,
  OpenfdaSyncResult,
  OpenfdaFeedMeta,
} from "@/lib/intel/openfda/types";

/**
 * Persistence layer for openFDA enforcement recalls and shortages.
 *
 * Every record is stamped with source_url, listing_url, retrieved_at, and
 * parser_version. IDs are content hashes so repeated syncs are idempotent.
 */

const PARSER_VERSION = "openfda-api-1.0";
const EXTRACTION_METHOD = "openfda-json-api";

function recallId(recall: Omit<OpenfdaEnforcementRecall, "id">): string {
  const payload = `${recall.recallNumber}|${recall.eventId}|${recall.productDescription}|${recall.recallingFirm}|${recall.reportDate}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

function shortageId(shortage: Omit<OpenfdaShortage, "id">): string {
  const payload = `${shortage.drugName}|${shortage.genericName}|${shortage.companyName}|${shortage.updateDate}|${shortage.status}|${shortage.dosageForm}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export function ensureTables(): void {
  initSchema();
}

export function upsertRecalls(recalls: Omit<OpenfdaEnforcementRecall, "id">[]): OpenfdaSyncResult {
  ensureTables();
  const db = getDb();
  const retrievedAt = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO openfda_enforcement_recalls (
      id, recall_number, event_id, product_description, code_info, recalling_firm,
      reason_for_recall, classification, status, distribution_pattern, product_quantity,
      country, report_date, recall_initiation_date, source_url, listing_url, retrieved_at,
      parser_version, extraction_method, extraction_prompt, raw_extraction_log
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      recall_number = excluded.recall_number,
      event_id = excluded.event_id,
      product_description = excluded.product_description,
      code_info = excluded.code_info,
      recalling_firm = excluded.recalling_firm,
      reason_for_recall = excluded.reason_for_recall,
      classification = excluded.classification,
      status = excluded.status,
      distribution_pattern = excluded.distribution_pattern,
      product_quantity = excluded.product_quantity,
      country = excluded.country,
      report_date = excluded.report_date,
      recall_initiation_date = excluded.recall_initiation_date,
      source_url = excluded.source_url,
      listing_url = excluded.listing_url,
      retrieved_at = excluded.retrieved_at,
      parser_version = excluded.parser_version,
      extraction_method = excluded.extraction_method,
      extraction_prompt = excluded.extraction_prompt,
      raw_extraction_log = excluded.raw_extraction_log
  `);

  let inserted = 0;
  let updated = 0;

  for (const r of recalls) {
    const id = recallId(r);
    const existing = db.prepare("SELECT 1 FROM openfda_enforcement_recalls WHERE id = ?").get(id);

    insert.run(
      id,
      r.recallNumber,
      r.eventId,
      r.productDescription,
      r.codeInfo,
      r.recallingFirm,
      r.reasonForRecall,
      r.classification,
      r.status,
      r.distributionPattern,
      r.productQuantity,
      r.country,
      r.reportDate,
      r.recallInitiationDate,
      r.sourceUrl,
      r.listingUrl,
      r.retrievedAt,
      r.parserVersion,
      r.extractionMethod,
      r.extractionPrompt,
      r.rawExtractionLog,
    );

    if (existing) {
      updated++;
    } else {
      inserted++;
    }
  }

  return {
    source: "openfda-enforcement",
    status: "success",
    recordsFound: recalls.length,
    recordsInserted: inserted,
    recordsUpdated: updated,
    latestRetrievedAt: retrievedAt,
  };
}

export function upsertShortages(shortages: Omit<OpenfdaShortage, "id">[]): OpenfdaSyncResult {
  ensureTables();
  const db = getDb();
  const retrievedAt = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO openfda_shortages (
      id, drug_name, generic_name, company_name, therapeutic_category, shortage_reason,
      presentation, status, update_date, dosage_form, related_info, source_url, listing_url,
      retrieved_at, parser_version, extraction_method, extraction_prompt, raw_extraction_log
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      drug_name = excluded.drug_name,
      generic_name = excluded.generic_name,
      company_name = excluded.company_name,
      therapeutic_category = excluded.therapeutic_category,
      shortage_reason = excluded.shortage_reason,
      presentation = excluded.presentation,
      status = excluded.status,
      update_date = excluded.update_date,
      dosage_form = excluded.dosage_form,
      related_info = excluded.related_info,
      source_url = excluded.source_url,
      listing_url = excluded.listing_url,
      retrieved_at = excluded.retrieved_at,
      parser_version = excluded.parser_version,
      extraction_method = excluded.extraction_method,
      extraction_prompt = excluded.extraction_prompt,
      raw_extraction_log = excluded.raw_extraction_log
  `);

  let inserted = 0;
  let updated = 0;

  for (const s of shortages) {
    const id = shortageId(s);
    const existing = db.prepare("SELECT 1 FROM openfda_shortages WHERE id = ?").get(id);

    insert.run(
      id,
      s.drugName,
      s.genericName,
      s.companyName,
      s.therapeuticCategory,
      s.shortageReason,
      s.presentation,
      s.status,
      s.updateDate,
      s.dosageForm,
      s.relatedInfo,
      s.sourceUrl,
      s.listingUrl,
      s.retrievedAt,
      s.parserVersion,
      s.extractionMethod,
      s.extractionPrompt,
      s.rawExtractionLog,
    );

    if (existing) {
      updated++;
    } else {
      inserted++;
    }
  }

  return {
    source: "openfda-shortages",
    status: "success",
    recordsFound: shortages.length,
    recordsInserted: inserted,
    recordsUpdated: updated,
    latestRetrievedAt: retrievedAt,
  };
}

export function getRecalls(options?: { limit?: number; classification?: string; status?: string }): OpenfdaEnforcementRecall[] {
  ensureTables();
  const db = getDb();

  let sql = "SELECT * FROM openfda_enforcement_recalls";
  const params: (string | number)[] = [];
  const where: string[] = [];

  if (options?.classification) {
    where.push("classification = ?");
    params.push(options.classification);
  }
  if (options?.status) {
    where.push("status = ?");
    params.push(options.status);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");

  sql += " ORDER BY report_date DESC, recalling_firm ASC";

  if (options?.limit !== undefined) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    recall_number: string;
    event_id: string;
    product_description: string;
    code_info: string;
    recalling_firm: string;
    reason_for_recall: string;
    classification: string;
    status: string;
    distribution_pattern: string;
    product_quantity: string;
    country: string;
    report_date: string;
    recall_initiation_date: string;
    source_url: string;
    listing_url: string;
    retrieved_at: string;
    parser_version: string;
    extraction_method: string;
    extraction_prompt: string | null;
    raw_extraction_log: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    recallNumber: r.recall_number,
    eventId: r.event_id,
    productDescription: r.product_description,
    codeInfo: r.code_info,
    recallingFirm: r.recalling_firm,
    reasonForRecall: r.reason_for_recall,
    classification: r.classification,
    status: r.status,
    distributionPattern: r.distribution_pattern,
    productQuantity: r.product_quantity,
    country: r.country,
    reportDate: r.report_date,
    recallInitiationDate: r.recall_initiation_date,
    sourceUrl: r.source_url,
    listingUrl: r.listing_url,
    retrievedAt: r.retrieved_at,
    parserVersion: r.parser_version,
    extractionMethod: r.extraction_method,
    extractionPrompt: r.extraction_prompt,
    rawExtractionLog: r.raw_extraction_log,
  }));
}

export function getShortages(options?: { limit?: number; status?: string }): OpenfdaShortage[] {
  ensureTables();
  const db = getDb();

  let sql = "SELECT * FROM openfda_shortages";
  const params: (string | number)[] = [];
  const where: string[] = [];

  if (options?.status) {
    where.push("status = ?");
    params.push(options.status);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");

  sql += " ORDER BY update_date DESC, drug_name ASC";

  if (options?.limit !== undefined) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    drug_name: string;
    generic_name: string;
    company_name: string;
    therapeutic_category: string;
    shortage_reason: string;
    presentation: string;
    status: string;
    update_date: string;
    dosage_form: string;
    related_info: string;
    source_url: string;
    listing_url: string;
    retrieved_at: string;
    parser_version: string;
    extraction_method: string;
    extraction_prompt: string | null;
    raw_extraction_log: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    drugName: r.drug_name,
    genericName: r.generic_name,
    companyName: r.company_name,
    therapeuticCategory: r.therapeutic_category,
    shortageReason: r.shortage_reason,
    presentation: r.presentation,
    status: r.status,
    updateDate: r.update_date,
    dosageForm: r.dosage_form,
    relatedInfo: r.related_info,
    sourceUrl: r.source_url,
    listingUrl: r.listing_url,
    retrievedAt: r.retrieved_at,
    parserVersion: r.parser_version,
    extractionMethod: r.extraction_method,
    extractionPrompt: r.extraction_prompt,
    rawExtractionLog: r.raw_extraction_log,
  }));
}

export function getFeedMeta(): OpenfdaFeedMeta {
  ensureTables();
  const db = getDb();

  const recallsTotal = db.prepare("SELECT COUNT(*) as c FROM openfda_enforcement_recalls").get() as { c: number };
  const shortagesTotal = db.prepare("SELECT COUNT(*) as c FROM openfda_shortages").get() as { c: number };

  const latestRecall = db
    .prepare("SELECT retrieved_at FROM openfda_enforcement_recalls ORDER BY retrieved_at DESC LIMIT 1")
    .get() as { retrieved_at: string } | null;
  const latestShortage = db
    .prepare("SELECT retrieved_at FROM openfda_shortages ORDER BY retrieved_at DESC LIMIT 1")
    .get() as { retrieved_at: string } | null;

  const latest = [latestRecall?.retrieved_at, latestShortage?.retrieved_at]
    .filter(Boolean)
    .sort()
    .reverse()[0] as string | undefined;

  const classifications = db
    .prepare("SELECT DISTINCT classification FROM openfda_enforcement_recalls ORDER BY classification")
    .all() as Array<{ classification: string }>;
  const statuses = db
    .prepare("SELECT DISTINCT status FROM openfda_shortages ORDER BY status")
    .all() as Array<{ status: string }>;

  return {
    totalRecalls: recallsTotal.c,
    totalShortages: shortagesTotal.c,
    latestRetrievedAt: latest ?? null,
    recallClassifications: classifications.map((c) => c.classification).filter(Boolean),
    shortageStatuses: statuses.map((s) => s.status).filter(Boolean),
  };
}

export function recordRun(source: "openfda-enforcement" | "openfda-shortages", run: Omit<OpenfdaSyncResult, "source">): void {
  ensureTables();
  recordIngestionRun(source, run);
}

export { PARSER_VERSION, EXTRACTION_METHOD };
