import type {
  OpenfdaEnforcementApiRecord,
  OpenfdaShortageApiRecord,
} from "@/lib/intel/openfda/types";

/**
 * Low-level openFDA API client.
 *
 * openFDA provides two public JSON endpoints we persist:
 *   - drug enforcement (recalls): https://api.fda.gov/drug/enforcement.json
 *   - drug shortages:            https://api.fda.gov/drug/shortages.json
 *
 * No API key is required. The client is defensive: short timeouts, retries for
 * transient errors, and graceful fallback to an empty result set.
 */

export const OPENFDA_ENFORCEMENT_URL =
  "https://api.fda.gov/drug/enforcement.json?search=report_date:[20250101+TO+20271231]&sort=report_date:desc&limit=100";

export const OPENFDA_SHORTAGES_URL =
  "https://api.fda.gov/drug/shortages.json?sort=update_date:desc&limit=100";

export const OPENFDA_ENFORCEMENT_LISTING_URL = "https://www.fda.gov/drugs/drug-safety-and-availability/drug-recalls";
export const OPENFDA_SHORTAGES_LISTING_URL = "https://www.fda.gov/drugs/drug-shortages";

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
          accept: "application/json",
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

export interface OpenfdaApiResponse<T> {
  results?: T[];
  meta?: { results?: { total?: number } };
  error?: { message?: string };
}

export async function fetchEnforcementRecalls(): Promise<OpenfdaApiResponse<OpenfdaEnforcementApiRecord> | null> {
  return fetchJson<OpenfdaApiResponse<OpenfdaEnforcementApiRecord>>(
    "openFDA enforcement",
    OPENFDA_ENFORCEMENT_URL,
    20_000,
  );
}

export async function fetchShortages(): Promise<OpenfdaApiResponse<OpenfdaShortageApiRecord> | null> {
  return fetchJson<OpenfdaApiResponse<OpenfdaShortageApiRecord>>("openFDA shortages", OPENFDA_SHORTAGES_URL, 20_000);
}
