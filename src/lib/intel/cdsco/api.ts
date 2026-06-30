import type { CdscoApiRecord } from "@/lib/intel/cdsco/types";

/**
 * Low-level CDSCO API client.
 *
 * Discovered endpoints (public, no key required):
 *   - GET https://cdscoonline.gov.in/CDSCO/publicNsqDrugTable
 *     returns { iTotalRecords, iTotalDisplayRecords, aaData: CdscoApiRecord[] }
 *
 * The module is defensive: short timeouts, retries for transient errors, and
 * graceful fallback to an empty result set when the source is slow or changes.
 */

const CDSCO_ORIGIN = "https://cdscoonline.gov.in";
const NSQ_TABLE_URL = `${CDSCO_ORIGIN}/CDSCO/publicNsqDrugTable`;
export const CDSCO_LISTING_URL = "https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [500, 1_500];

function isTransientError(status: number, err: unknown): boolean {
  if (status >= 500 || status === 429) return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  if (err instanceof TypeError) return true; // network / DNS failures
  return false;
}

async function fetchJson<T>(label: string, url: string, timeoutMs = 15_000): Promise<T | null> {
  let lastError: unknown = null;
  let lastStatus = -1;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "user-agent": UA,
          accept: "application/json, text/javascript, */*",
          referer: `${CDSCO_ORIGIN}/CDSCO/viewPublicNSQDrug`,
        },
      });
      clearTimeout(t);

      if (!res.ok) {
        lastStatus = res.status;
        lastError = new Error(`HTTP ${res.status}`);
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          console.warn(`[${label}] client error ${res.status} at ${url}`);
          return null;
        }
      } else {
        const data = (await res.json()) as T;
        return data;
      }
    } catch (err) {
      clearTimeout(t);
      lastError = err;
      lastStatus = -1;
      if (!isTransientError(-1, err)) {
        console.warn(`[${label}] non-transient error at ${url}:`, err);
        return null;
      }
    }

    const delay = RETRY_BACKOFF_MS[attempt];
    if (delay !== undefined) await new Promise((resolve) => setTimeout(resolve, delay));
  }

  console.warn(
    `[${label}] exhausted ${MAX_RETRIES + 1} attempts at ${url}`,
    lastStatus > 0 ? `(last status ${lastStatus})` : "",
    lastError instanceof Error ? lastError.message : String(lastError),
  );
  return null;
}

export interface CdscoTableResponse {
  iTotalRecords?: number;
  iTotalDisplayRecords?: number;
  aaData?: CdscoApiRecord[];
}

export async function fetchNsqTable(): Promise<CdscoTableResponse | null> {
  return fetchJson<CdscoTableResponse>("CDSCO NSQ", NSQ_TABLE_URL, 20_000);
}

export function monthKeyFromAlertMonth(alertMonth: string): string {
  // alertMonth looks like "MAY-2026". Build a sortable "2026-05" key.
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const parts = alertMonth.trim().split(/[-\s]+/);
  if (parts.length < 2) return alertMonth;
  const monthName = parts[0].toLowerCase().substring(0, 3);
  const year = parts[parts.length - 1];
  const month = months[monthName];
  if (month && /^\d{4}$/.test(year)) return `${year}-${month}`;
  return alertMonth;
}
