import { NextResponse } from "next/server";
import { getDb, initSchema } from "@/lib/intel/db";
import { getCdscoNsqMeta } from "@/lib/intel/cdsco";
import { getOpenfdaMeta } from "@/lib/intel/openfda";
import { getLatestEvalRun } from "@/lib/intel/eval";

/**
 * Public health endpoint.
 *
 * Returns a lightweight, non-sensitive status snapshot: whether the SQLite store
 * is reachable, how many persisted records each feed has, and the last ingestion
 * run status. Safe for load-balancers and uptime monitors.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  let dbHealthy = false;
  let dbError: string | null = null;

  try {
    initSchema();
    const db = getDb();
    db.prepare("SELECT 1").get();
    dbHealthy = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
    console.warn("[health] database check failed:", err);
  }

  let cdscoMeta = { totalRecords: 0, latestRetrievedAt: null as string | null, months: [] as string[] };
  let openfdaMeta = {
    totalRecalls: 0,
    totalShortages: 0,
    latestRetrievedAt: null as string | null,
    recallClassifications: [] as string[],
    shortageStatuses: [] as string[],
  };
  let lastRuns: Array<{
    source: string;
    finished_at: string;
    status: string;
    records_found: number;
    records_inserted: number;
    records_updated: number;
  }> = [];
  let latestEval: ReturnType<typeof getLatestEvalRun> = null;

  if (dbHealthy) {
    try {
      cdscoMeta = getCdscoNsqMeta();
      openfdaMeta = getOpenfdaMeta();
      latestEval = getLatestEvalRun();
      const rows = getDb()
        .prepare(
          `SELECT source, finished_at, status, records_found, records_inserted, records_updated
           FROM ingestion_runs
           ORDER BY finished_at DESC
           LIMIT 10`,
        )
        .all() as typeof lastRuns;
      lastRuns = rows;
    } catch (err) {
      console.warn("[health] metadata read failed:", err);
    }
  }

  const status = dbHealthy ? 200 : 503;

  return NextResponse.json(
    {
      ok: dbHealthy,
      uptimeSeconds: Math.floor(process.uptime()),
      responseMs: Date.now() - startedAt,
      database: { healthy: dbHealthy, error: dbError },
      feeds: {
        cdsco: {
          totalRecords: cdscoMeta.totalRecords,
          latestRetrievedAt: cdscoMeta.latestRetrievedAt,
          months: cdscoMeta.months,
        },
        openfda: {
          totalRecalls: openfdaMeta.totalRecalls,
          totalShortages: openfdaMeta.totalShortages,
          latestRetrievedAt: openfdaMeta.latestRetrievedAt,
          recallClassifications: openfdaMeta.recallClassifications,
          shortageStatuses: openfdaMeta.shortageStatuses,
        },
      },
      lastRuns,
      latestEval: latestEval
        ? {
            evalName: latestEval.evalName,
            runAt: new Date().toISOString(),
            totalSamples: latestEval.totalSamples,
            matchedRecords: latestEval.matchedRecords,
            recordRecall: latestEval.recordRecall,
            fieldAccuracy: latestEval.fieldAccuracy,
            severeAccuracy: latestEval.severeAccuracy,
          }
        : null,
      at: new Date().toISOString(),
    },
    { status },
  );
}
