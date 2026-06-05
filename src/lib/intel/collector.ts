import Anthropic from "@anthropic-ai/sdk";
import type { IntelItem, IntelSeverity } from "@/lib/intel/types";

/**
 * Collector agent. Runs on Vercel (ISR + cron), no laptop. Pulls real public
 * pharma data, normalizes it, and hands a clean structured list to the analyst
 * agent. Sources:
 *  - openFDA recalls + shortages (JSON API, no key)
 *  - CDSCO India NSQ alerts (PDF) — discovered from the listing, extracted by
 *    Claude (PDF-native) when ANTHROPIC_API_KEY is set, else surfaced as a link.
 * Every fetch is time-boxed and wrapped so a slow/unavailable source degrades
 * gracefully instead of breaking the page.
 */

const REVALIDATE = 21_600; // 6h — matches the page ISR window
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function getJson(url: string): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: REVALIDATE },
      headers: { accept: "application/json" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const str = (v: unknown, fallback = "—"): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

/** openFDA enforcement date format is YYYYMMDD → ISO. */
function fdaDate(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s || "—";
}

function recallSeverity(classification: string): IntelSeverity {
  if (/class i\b/i.test(classification)) return "critical";
  if (/class ii\b/i.test(classification)) return "warning";
  return "info";
}

/** Drug recalls — FDA Recall Enterprise System, updated weekly. */
async function collectRecalls(): Promise<IntelItem[]> {
  const url =
    "https://api.fda.gov/drug/enforcement.json?search=report_date:[20250101+TO+20271231]&sort=report_date:desc&limit=15";
  const data = (await getJson(url)) as { results?: Record<string, unknown>[] } | null;
  const results = data?.results ?? [];
  return results.map((r, i) => {
    const classification = str(r.classification, "Recall");
    return {
      id: `recall-${str(r.recall_number, String(i))}`,
      kind: "recall" as const,
      title: str(r.product_description, "Drug recall").slice(0, 160),
      org: str(r.recalling_firm),
      reason: str(r.reason_for_recall).slice(0, 200),
      classification,
      date: fdaDate(r.report_date),
      status: str(r.status, "Ongoing"),
      source: "openFDA · FDA RES",
      severity: recallSeverity(classification),
      region: str(r.country, "US"),
    };
  });
}

/** Current drug shortages — openFDA shortages dataset. */
async function collectShortages(): Promise<IntelItem[]> {
  const url = "https://api.fda.gov/drug/shortages.json?sort=update_date:desc&limit=15";
  const data = (await getJson(url)) as { results?: Record<string, unknown>[] } | null;
  const results = data?.results ?? [];
  return results.map((r, i) => {
    const status = str(r.status, "Current");
    const current = /current|ongoing/i.test(status);
    return {
      id: `shortage-${i}-${str(r.update_date, "")}`,
      kind: "shortage" as const,
      title: str(r.generic_name ?? r.proprietary_name, "Drug shortage").slice(0, 160),
      org: str(r.company_name),
      reason: str(r.shortage_reason ?? r.therapeutic_category, "Supply disruption").slice(0, 200),
      classification: str(r.therapeutic_category, "Shortage"),
      date: str(r.update_date, "—").slice(0, 10),
      status,
      source: "openFDA · Drug Shortages",
      severity: current ? "warning" : "info",
      region: "US",
    };
  });
}

// ── CDSCO India NSQ (PDF) ────────────────────────────────────────────────────

const CDSCO_BASE =
  "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadAlertsFiles";
const CDSCO_LISTING = "https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/";
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

async function getText(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: REVALIDATE }, headers: { "user-agent": UA } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** The listing page renders month labels (e.g. "April-2025") in its HTML even
 *  though the PDF links are JS-rendered — parse the newest month from those. */
function latestMonth(html: string): { idx: number; year: number; label: string } | null {
  const re = /(january|february|march|april|may|june|july|august|september|october|november|december)[\s-]+(20\d{2})/gi;
  let m: RegExpExecArray | null;
  let best: { idx: number; year: number; label: string; score: number } | null = null;
  while ((m = re.exec(html))) {
    const idx = MONTHS.indexOf(m[1].toLowerCase());
    const year = Number(m[2]);
    const score = year * 12 + idx;
    if (idx >= 0 && (!best || score > best.score)) {
      best = { idx, year, label: `${cap(m[1])} ${year}`, score };
    }
  }
  return best;
}

/** Filename casing is inconsistent across months — try the known variants. */
function pdfCandidates(idx: number, year: number): string[] {
  const Title = cap(MONTHS[idx]);
  const Upper = MONTHS[idx].toUpperCase();
  return [
    `NSQ ALERT FOR THE MONTH OF ${Upper}-${year}.pdf`,
    `NSQ Alert For The Month of ${Title}-${year}.pdf`,
    `NSQ ALERT FOR THE MONTH OF ${Title}-${year}.pdf`,
  ].map((name) => `${CDSCO_BASE}/${encodeURIComponent(name)}`);
}

async function findPdf(idx: number, year: number): Promise<{ url: string; buf: ArrayBuffer } | null> {
  for (const url of pdfCandidates(idx, year)) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15_000);
      const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: REVALIDATE }, headers: { "user-agent": UA } });
      clearTimeout(t);
      if (res.ok && (res.headers.get("content-type") ?? "").includes("pdf")) {
        return { url, buf: await res.arrayBuffer() };
      }
    } catch {
      /* try next variant */
    }
  }
  return null;
}

const CDSCO_SYS = `You extract structured records from an Indian CDSCO "Not of Standard Quality" (NSQ) drug alert PDF.
Return ONLY a JSON array — no prose, no code fences. Each element:
{"product": string, "manufacturer": string, "batch": string, "defect": string, "lab": string}
Read the table in the PDF. Use empty strings for missing fields. Return at most 12 rows.`;

function jsonArray(text: string): Record<string, unknown>[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

/** Discover the latest CDSCO NSQ alert; extract its rows with Claude when a key
 *  is set, otherwise return a single linked pointer item. Always fault-tolerant. */
export async function collectCdsco(): Promise<IntelItem[]> {
  const html = await getText(CDSCO_LISTING);
  const latest = html ? latestMonth(html) : null;

  // Could not even read the listing → link to the portal.
  if (!latest) {
    return [{
      id: "cdsco-listing",
      kind: "recall",
      title: "CDSCO NSQ drug alerts (India)",
      org: "CDSCO",
      reason: "Monthly Not-of-Standard-Quality drug alerts. Open the CDSCO portal for the latest list.",
      classification: "NSQ",
      date: "—",
      status: "Published monthly",
      source: "CDSCO",
      severity: "warning",
      region: "IN",
      url: CDSCO_LISTING,
    }];
  }

  const isoDate = `${latest.year}-${String(latest.idx + 1).padStart(2, "0")}-01`;
  const found = await findPdf(latest.idx, latest.year);
  const pointer: IntelItem = {
    id: `cdsco-${latest.year}-${latest.idx}`,
    kind: "recall",
    title: `CDSCO NSQ Alert — ${latest.label}`,
    org: "CDSCO",
    reason: "Monthly list of Not-of-Standard-Quality drug batches flagged by government labs.",
    classification: "NSQ",
    date: isoDate,
    status: "Published",
    source: "CDSCO NSQ",
    severity: "warning",
    region: "IN",
    url: found?.url ?? CDSCO_LISTING,
  };
  if (!found) return [pointer];

  // Extract individual flagged batches with Claude (PDF-native) when enabled.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || found.buf.byteLength > 9_000_000) return [pointer];

  try {
    const client = new Anthropic({ apiKey });
    const b64 = Buffer.from(found.buf).toString("base64");
    const resp = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2500,
      system: [{ type: "text", text: CDSCO_SYS, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: `Extract up to 12 flagged drugs from this CDSCO NSQ alert for ${latest.label}. Return only the JSON array.` },
        ],
      }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const rows = jsonArray(text);
    if (rows.length === 0) return [pointer];

    return rows.slice(0, 12).map((r, i) => {
      const defect = str(r.defect, "");
      const batch = str(r.batch, "");
      const severe = /deg|glycol|spurious|nitrosamine|adulter/i.test(defect);
      return {
        id: `cdsco-${latest.year}-${latest.idx}-${i}`,
        kind: "recall" as const,
        title: str(r.product, "Flagged drug").slice(0, 160),
        org: str(r.manufacturer),
        reason: `${defect || "Failed pharmacopoeial quality test"}${batch ? ` · Batch ${batch}` : ""}`.slice(0, 200),
        classification: "NSQ",
        date: isoDate,
        status: "Flagged NSQ",
        source: `CDSCO NSQ · ${latest.label}`,
        severity: severe ? ("critical" as const) : ("warning" as const),
        region: "IN",
        url: found.url,
      };
    });
  } catch {
    return [pointer];
  }
}

/** Run all source agents in parallel and merge, newest first. */
export async function collectIntel(): Promise<IntelItem[]> {
  const [recalls, shortages, cdsco] = await Promise.all([
    collectRecalls(),
    collectShortages(),
    collectCdsco(),
  ]);
  return [...recalls, ...shortages, ...cdsco].sort((a, b) => (a.date < b.date ? 1 : -1));
}
