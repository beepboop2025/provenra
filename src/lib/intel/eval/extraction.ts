import { CDSCO_GOLDEN_SAMPLE, type CdscoGoldenRecord } from "@/lib/intel/eval/golden";

/**
 * AI extraction accuracy evaluator.
 *
 * The CDSCO PDF extraction agent is asked to return a JSON array of records with
 * the shape { product, manufacturer, batch, defect, lab }. This module compares
 * any extraction output against a small golden truth set and computes:
 *   - recordRecall        : fraction of expected records matched
 *   - fieldAccuracy       : exact-match accuracy across all fields of matched records
 *   - severeDefectAccuracy: fraction of records where severe-defect classification matches
 *
 * All metrics are deterministic and do not call any LLM, so they are safe to run
 * in CI or on a cron schedule.
 */

export interface ExtractionEvalResult {
  evalName: string;
  totalSamples: number;
  matchedRecords: number;
  recordRecall: number;
  fieldAccuracy: number;
  severeAccuracy: number;
  mismatches: string[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeField(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s,;]+/g, " ")
    .trim();
}

function isSevereDefect(defect: string): boolean {
  return /deg|glycol|spurious|nitrosamine|adulter/i.test(defect);
}

function recordKey(r: CdscoGoldenRecord): string {
  return normalizeField(`${r.product}|${r.manufacturer}|${r.batch}`);
}

function fieldsMatch(extracted: Record<string, unknown>, expected: CdscoGoldenRecord): boolean {
  const keys: (keyof CdscoGoldenRecord)[] = ["product", "manufacturer", "batch", "defect", "lab"];
  return keys.every((k) => normalizeField(str(extracted[k])) === normalizeField(expected[k]));
}

function fieldAccuracy(extracted: Record<string, unknown>, expected: CdscoGoldenRecord): number {
  const keys: (keyof CdscoGoldenRecord)[] = ["product", "manufacturer", "batch", "defect", "lab"];
  const matches = keys.filter((k) => normalizeField(str(extracted[k])) === normalizeField(expected[k]));
  return matches.length / keys.length;
}

export function evaluateCdscoExtraction(
  extracted: Array<Record<string, unknown>>,
  expected: CdscoGoldenRecord[] = CDSCO_GOLDEN_SAMPLE,
): ExtractionEvalResult {
  const totalSamples = expected.length;
  const expectedByKey = new Map(expected.map((r) => [recordKey(r), r]));
  const seen = new Set<string>();
  let matchedRecords = 0;
  let totalFieldAccuracy = 0;
  let severeMatches = 0;
  const mismatches: string[] = [];

  for (const row of extracted) {
    const candidate: CdscoGoldenRecord = {
      product: str(row.product),
      manufacturer: str(row.manufacturer),
      batch: str(row.batch),
      defect: str(row.defect),
      lab: str(row.lab),
    };
    const key = recordKey(candidate);
    const truth = expectedByKey.get(key);
    if (truth && !seen.has(key)) {
      seen.add(key);
      matchedRecords++;
      totalFieldAccuracy += fieldAccuracy(row, truth);
      if (isSevereDefect(candidate.defect) === isSevereDefect(truth.defect)) {
        severeMatches++;
      }
    } else {
      mismatches.push(`Unmatched extraction: ${JSON.stringify(candidate)}`);
    }
  }

  for (const [key, truth] of expectedByKey) {
    if (!seen.has(key)) {
      mismatches.push(`Missing expected record: ${truth.product} / ${truth.batch}`);
    }
  }

  return {
    evalName: "cdsco-pdf-extraction",
    totalSamples,
    matchedRecords,
    recordRecall: totalSamples > 0 ? matchedRecords / totalSamples : 0,
    fieldAccuracy: matchedRecords > 0 ? totalFieldAccuracy / matchedRecords : 0,
    severeAccuracy: matchedRecords > 0 ? severeMatches / matchedRecords : 0,
    mismatches,
  };
}
