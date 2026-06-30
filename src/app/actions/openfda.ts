"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { syncOpenfdaFeeds } from "@/lib/intel/openfda";

/**
 * Server Action: manually trigger an openFDA recalls + shortages sync.
 *
 * Only authenticated users can invoke this. After a successful sync the
 * recall and shortage views are revalidated so the UI refreshes immediately.
 */

export type OpenfdaSyncFormState =
  | {
      ok: boolean;
      message: string;
      recallsFound?: number;
      recallsInserted?: number;
      recallsUpdated?: number;
      shortagesFound?: number;
      shortagesInserted?: number;
      shortagesUpdated?: number;
    }
  | undefined;

export async function syncOpenfdaNow(): Promise<OpenfdaSyncFormState> {
  await verifySession();

  try {
    const { recalls, shortages } = await syncOpenfdaFeeds({ force: true });
    revalidatePath("/recalls");
    revalidatePath("/shortages");

    const failed = recalls.status === "failed" || shortages.status === "failed";
    if (failed) {
      return {
        ok: false,
        message: [recalls.error, shortages.error].filter(Boolean).join("; ") || "openFDA sync failed.",
      };
    }

    return {
      ok: true,
      message: `Synced openFDA · ${recalls.recordsFound} recall(s), ${shortages.recordsFound} shortage(s).`,
      recallsFound: recalls.recordsFound,
      recallsInserted: recalls.recordsInserted,
      recallsUpdated: recalls.recordsUpdated,
      shortagesFound: shortages.recordsFound,
      shortagesInserted: shortages.recordsInserted,
      shortagesUpdated: shortages.recordsUpdated,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[syncOpenfdaNow] error:", err);
    return { ok: false, message };
  }
}

/**
 * Void-returning form action wrapper. A Server Component `<form action>` requires
 * `() => void | Promise<void>`; the recalls/shortages pages only trigger the sync
 * (and the internal revalidatePath refreshes them), so the state return is unused here.
 */
export async function syncOpenfdaFormAction(): Promise<void> {
  await syncOpenfdaNow();
}
