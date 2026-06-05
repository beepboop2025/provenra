import { NextResponse } from "next/server";

// Temporary: check whether CDSCO is reachable from the Vercel runtime. Remove after.
export const dynamic = "force-dynamic";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

async function probe(url: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA }, cache: "no-store" });
    clearTimeout(t);
    return { status: res.status, type: res.headers.get("content-type"), bytes: (await res.arrayBuffer()).byteLength };
  } catch (e) {
    return { error: String(e).slice(0, 160) };
  }
}

export async function GET() {
  const listing = await probe("https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/");
  const pdf = await probe(
    "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadAlertsFiles/" +
      encodeURIComponent("NSQ ALERT FOR THE MONTH OF JANUARY-2025.pdf")
  );
  return NextResponse.json({ listing, pdf });
}
