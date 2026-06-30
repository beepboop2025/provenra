import { NextResponse } from "next/server";
import { getDb, initSchema } from "@/lib/intel/db";
import { getCdscoNsqMeta } from "@/lib/intel/cdsco";
import { getOpenfdaMeta } from "@/lib/intel/openfda";
import { getLatestEvalRun } from "@/lib/intel/eval";

/**
 * Basic metrics endpoint.
 *
 * Exposes aggregate counters for persisted feeds and the latest AI-extraction
 * eval. If METRICS_SECRET is set, requests must include it as a Bearer token;
 * otherwise the endpoint returns the counters unauthenticated (no secrets or
 * PII are included).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.METRICS_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  initSchema();

  const cdsco = getCdscoNsqMeta();
  const openfda = getOpenfdaMeta();
  const latestEval = getLatestEvalRun();

  const runCounts = getDb()
    .prepare(
      `SELECT source, status, COUNT(*) as count
       FROM ingestion_runs
       GROUP BY source, status`,
    )
    .all() as Array<{ source: string; status: string; count: number }>;

  const runsBySource: Record<string, { success: number; failed: number; noop: number }> = {};
  for (const row of runCounts) {
    if (!runsBySource[row.source]) {
      runsBySource[row.source] = { success: 0, failed: 0, noop: 0 };
    }
    const key = row.status as "success" | "failed" | "noop";
    if (key in runsBySource[row.source]) {
      runsBySource[row.source][key] = row.count;
    }
  }

  return NextResponse.json({
    ok: true,
    counters: {
      cdsco_total_records: cdsco.totalRecords,
      openfda_recalls_total: openfda.totalRecalls,
      openfda_shortages_total: openfda.totalShortages,
      openfda_total: openfda.totalRecalls + openfda.totalShortages,
      eval_total_samples: latestEval?.totalSamples ?? 0,
      eval_matched_records: latestEval?.matchedRecords ?? 0,
      eval_record_recall: latestEval?.recordRecall ?? 0,
      eval_field_accuracy: latestEval?.fieldAccuracy ?? 0,
      eval_severe_accuracy: latestEval?.severeAccuracy ?? 0,
    },
    runs: runsBySource,
    at: new Date().toISOString(),
  });
}
