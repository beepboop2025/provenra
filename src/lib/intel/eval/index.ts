import { getDb, initSchema } from "@/lib/intel/db";
import { evaluateCdscoExtraction, type ExtractionEvalResult } from "@/lib/intel/eval/extraction";
import { CDSCO_GOLDEN_SAMPLE, CDSCO_GOLDEN_LLM_RESPONSE } from "@/lib/intel/eval/golden";

/**
 * AI-extraction eval runner.
 *
 * Runs a deterministic, offline accuracy check against the CDSCO PDF golden
 * sample and persists the result for observability. Does not call any external
 * LLM or API.
 */

export type { ExtractionEvalResult };

function parseJsonArray(text: string): Array<Record<string, unknown>> {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

export function runAiExtractionEval(): ExtractionEvalResult {
  initSchema();
  const extracted = parseJsonArray(CDSCO_GOLDEN_LLM_RESPONSE);
  const result = evaluateCdscoExtraction(extracted, CDSCO_GOLDEN_SAMPLE);
  recordEvalRun(result);
  return result;
}

export function recordEvalRun(result: ExtractionEvalResult): void {
  initSchema();
  const db = getDb();
  db.prepare(
    `INSERT INTO eval_runs (
      eval_name, run_at, total_samples, matched_records, record_recall,
      field_accuracy, severe_accuracy, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    result.evalName,
    new Date().toISOString(),
    result.totalSamples,
    result.matchedRecords,
    result.recordRecall,
    result.fieldAccuracy,
    result.severeAccuracy,
    JSON.stringify({ mismatches: result.mismatches }),
  );
}

export function getLatestEvalRun(evalName = "cdsco-pdf-extraction"): ExtractionEvalResult | null {
  initSchema();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM eval_runs WHERE eval_name = ? ORDER BY run_at DESC LIMIT 1`,
    )
    .get(evalName) as
    | {
        eval_name: string;
        total_samples: number;
        matched_records: number;
        record_recall: number;
        field_accuracy: number;
        severe_accuracy: number;
        details: string;
      }
    | undefined;

  if (!row) return null;

  let details: { mismatches?: string[] } = {};
  try {
    details = JSON.parse(row.details || "{}") as { mismatches?: string[] };
  } catch {
    details = {};
  }

  return {
    evalName: row.eval_name,
    totalSamples: row.total_samples,
    matchedRecords: row.matched_records,
    recordRecall: row.record_recall,
    fieldAccuracy: row.field_accuracy,
    severeAccuracy: row.severe_accuracy,
    mismatches: details.mismatches ?? [],
  };
}
