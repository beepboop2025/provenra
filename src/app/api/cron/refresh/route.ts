import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Cloud cron endpoint. Vercel Cron calls this on a schedule (see vercel.json) to
 * re-run the collector + analyst agents and refresh /intel — entirely on Vercel,
 * no laptop. If CRON_SECRET is set, Vercel sends it as a Bearer token; we verify
 * it. If it isn't set, the endpoint still works (handy before secrets are added).
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

  revalidatePath("/intel");
  return NextResponse.json({ ok: true, revalidated: "/intel", at: new Date().toISOString() });
}
