import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/**
 * Data Access Layer for auth.
 *
 * Use verifySession() in Server Components, Server Actions, and Route Handlers
 * before returning protected data. The function is cached per React render pass
 * to avoid redundant cookie/JWT work.
 */

export type VerifiedSession = {
  isAuth: true;
  userId: string;
  email: string;
  role: "admin" | "user";
};

export const verifySession = cache(async (opts?: { redirectTo?: string }): Promise<VerifiedSession> => {
  const session = await getSession();
  if (!session?.userId) {
    const target = opts?.redirectTo ?? "/login";
    redirect(target);
  }
  return { isAuth: true, userId: session.userId, email: session.email, role: session.role };
});

export async function optionalSession(): Promise<Omit<VerifiedSession, "isAuth"> | null> {
  const session = await getSession();
  if (!session?.userId) return null;
  return { userId: session.userId, email: session.email, role: session.role };
}
