import { mkdirSync } from "fs";
import { dirname } from "path";
import { DatabaseSync } from "node:sqlite";

/**
 * SQLite persistence for intelligence feeds.
 *
 * Uses Node.js 24+ built-in `node:sqlite` so no native dependency is required.
 * The database path defaults to `.data/provenra.db` locally and `/tmp/provenra.db`
 * on serverless platforms (Vercel) where only `/tmp` is writable.
 */

function dbPath(): string {
  if (process.env.CDSCO_DB_PATH) return process.env.CDSCO_DB_PATH;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) return "/tmp/provenra.db";
  return ".data/provenra.db";
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const path = dbPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
  } catch {
    // Directory may already exist or be unwritable; the DatabaseSync constructor
    // will surface the real error if the path is unusable.
  }

  dbInstance = new DatabaseSync(path);
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function initSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS cdsco_nsq_alerts (
      id TEXT PRIMARY KEY,
      month_key TEXT NOT NULL,
      alert_month TEXT NOT NULL,
      product_name TEXT NOT NULL,
      batch_no TEXT,
      manufacturing_date TEXT,
      expiry_date TEXT,
      manufacturer TEXT,
      defect TEXT,
      reporting_source TEXT,
      reported_by_lab_or_state TEXT,
      source_url TEXT NOT NULL,
      listing_url TEXT NOT NULL,
      pdf_url TEXT,
      retrieved_at TEXT NOT NULL,
      parser_version TEXT NOT NULL,
      extraction_method TEXT NOT NULL,
      extraction_prompt TEXT,
      raw_extraction_log TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cdsco_month ON cdsco_nsq_alerts(month_key);
    CREATE INDEX IF NOT EXISTS idx_cdsco_retrieved ON cdsco_nsq_alerts(retrieved_at);

    CREATE TABLE IF NOT EXISTS openfda_enforcement_recalls (
      id TEXT PRIMARY KEY,
      recall_number TEXT,
      event_id TEXT,
      product_description TEXT,
      code_info TEXT,
      recalling_firm TEXT,
      reason_for_recall TEXT,
      classification TEXT,
      status TEXT,
      distribution_pattern TEXT,
      product_quantity TEXT,
      country TEXT,
      report_date TEXT,
      recall_initiation_date TEXT,
      source_url TEXT NOT NULL,
      listing_url TEXT NOT NULL,
      retrieved_at TEXT NOT NULL,
      parser_version TEXT NOT NULL,
      extraction_method TEXT NOT NULL,
      extraction_prompt TEXT,
      raw_extraction_log TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_openfda_recall_status ON openfda_enforcement_recalls(status);
    CREATE INDEX IF NOT EXISTS idx_openfda_recall_classification ON openfda_enforcement_recalls(classification);
    CREATE INDEX IF NOT EXISTS idx_openfda_recall_report_date ON openfda_enforcement_recalls(report_date);
    CREATE INDEX IF NOT EXISTS idx_openfda_recall_retrieved ON openfda_enforcement_recalls(retrieved_at);

    CREATE TABLE IF NOT EXISTS openfda_shortages (
      id TEXT PRIMARY KEY,
      drug_name TEXT,
      generic_name TEXT,
      company_name TEXT,
      therapeutic_category TEXT,
      shortage_reason TEXT,
      presentation TEXT,
      status TEXT,
      update_date TEXT,
      dosage_form TEXT,
      related_info TEXT,
      source_url TEXT NOT NULL,
      listing_url TEXT NOT NULL,
      retrieved_at TEXT NOT NULL,
      parser_version TEXT NOT NULL,
      extraction_method TEXT NOT NULL,
      extraction_prompt TEXT,
      raw_extraction_log TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_openfda_shortage_status ON openfda_shortages(status);
    CREATE INDEX IF NOT EXISTS idx_openfda_shortage_update_date ON openfda_shortages(update_date);
    CREATE INDEX IF NOT EXISTS idx_openfda_shortage_retrieved ON openfda_shortages(retrieved_at);

    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      records_found INTEGER,
      records_inserted INTEGER,
      records_updated INTEGER,
      status TEXT NOT NULL,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source ON ingestion_runs(source);
    CREATE INDEX IF NOT EXISTS idx_ingestion_runs_finished ON ingestion_runs(finished_at);

    CREATE TABLE IF NOT EXISTS eval_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eval_name TEXT NOT NULL,
      run_at TEXT NOT NULL,
      total_samples INTEGER NOT NULL,
      matched_records INTEGER NOT NULL,
      record_recall REAL NOT NULL,
      field_accuracy REAL NOT NULL,
      severe_accuracy REAL NOT NULL,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_eval_runs_name ON eval_runs(eval_name);
    CREATE INDEX IF NOT EXISTS idx_eval_runs_run_at ON eval_runs(run_at);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

/**
 * Generic ingestion-run logger used by all feed stores.
 */
export function recordIngestionRun(
  source: string,
  run: {
    status: string;
    recordsFound: number;
    recordsInserted: number;
    recordsUpdated: number;
    latestRetrievedAt: string | null;
    error?: string;
  },
): void {
  initSchema();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ingestion_runs (source, started_at, finished_at, records_found, records_inserted, records_updated, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    source,
    now,
    now,
    run.recordsFound,
    run.recordsInserted,
    run.recordsUpdated,
    run.status,
    run.error ?? null,
  );
}
