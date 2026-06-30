import { NextResponse } from "next/server";
import { runAiExtractionEval } from "@/lib/intel/eval";

/**
 * Cron endpoint for running the AI-extraction eval harness.
 *
 * If CRON_SECRET is set, requests must include it as a Bearer token. The eval is
 * deterministic and offline — it compares a golden CDSCO extraction sample to the
 * expected output and stores the metrics for observability.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = runAiExtractionEval();
    return NextResponse.json({
      ok: true,
      result: {
        evalName: result.evalName,
        totalSamples: result.totalSamples,
        matchedRecords: result.matchedRecords,
        recordRecall: result.recordRecall,
        fieldAccuracy: result.fieldAccuracy,
        severeAccuracy: result.severeAccuracy,
      },
      at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[cron/eval] eval failed:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
