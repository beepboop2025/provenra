import type { IntelItem, IntelSeverity } from "@/lib/intel/types";

/**
 * Collector agent. Runs on Vercel (ISR + cron), no laptop involved. Pulls real
 * public pharma data from openFDA's JSON APIs, normalizes it, and hands a clean
 * structured list to the analyst agent. Every fetch is time-boxed and wrapped so
 * a slow/unavailable source degrades gracefully instead of breaking the page.
 */

const REVALIDATE = 21_600; // 6h — matches the page ISR window

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
    "https://api.fda.gov/drug/enforcement.json?search=report_date:[20250101+TO+20271231]&sort=report_date:desc&limit=18";
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
  const url = "https://api.fda.gov/drug/shortages.json?sort=update_date:desc&limit=18";
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

/** Run both source agents in parallel and merge, newest first. */
export async function collectIntel(): Promise<IntelItem[]> {
  const [recalls, shortages] = await Promise.all([collectRecalls(), collectShortages()]);
  return [...recalls, ...shortages].sort((a, b) => (a.date < b.date ? 1 : -1));
}
