"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { syncCdscoNsq } from "@/lib/intel/cdsco";

/**
 * Server Action: manually trigger a CDSCO NSQ sync.
 *
 * Only authenticated users can invoke this. After a successful sync the
 * NSQ alerts view is revalidated so the UI refreshes immediately.
 */

export type SyncFormState =
  | {
      ok: boolean;
      message: string;
      recordsFound?: number;
      recordsInserted?: number;
      recordsUpdated?: number;
    }
  | undefined;

export async function syncCdscoNow(): Promise<SyncFormState> {
  await verifySession();

  try {
    const result = await syncCdscoNsq({ force: true });
    revalidatePath("/nsq");

    if (result.status === "failed") {
      return {
        ok: false,
        message: result.error || "Sync failed. CDSCO may be unavailable.",
      };
    }

    return {
      ok: true,
      message:
        result.status === "noop"
          ? `Already up to date · ${result.recordsFound} record(s) on disk.`
          : `Synced ${result.recordsFound} record(s) from CDSCO.`,
      recordsFound: result.recordsFound,
      recordsInserted: result.recordsInserted,
      recordsUpdated: result.recordsUpdated,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[syncCdscoNow] error:", err);
    return { ok: false, message };
  }
}

/**
 * Void-returning form action wrapper for Server Component `<form action>` use
 * (which requires `() => void | Promise<void>`). The nsq page only triggers the
 * sync; the state return from syncCdscoNow is unused there.
 */
export async function syncCdscoFormAction(): Promise<void> {
  await syncCdscoNow();
}
