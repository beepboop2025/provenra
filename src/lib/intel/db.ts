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
