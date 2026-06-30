import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncCdscoNsq } from "@/lib/intel/cdsco";

/**
 * Cloud cron endpoint. Vercel Cron calls this on a schedule (see vercel.json) to
 * refresh live intelligence feeds — currently the persisted CDSCO NSQ feed.
 * If CRON_SECRET is set, Vercel sends it as a Bearer token; we verify it.
 * If it isn't set, the endpoint still works (handy before secrets are added).
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
    const result = await syncCdscoNsq();
    revalidatePath("/nsq");
    revalidatePath("/intel");
    return NextResponse.json({
      ok: true,
      revalidated: ["/nsq", "/intel"],
      cdsco: result,
      at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[cron/refresh] sync failed:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
