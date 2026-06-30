import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Stateless JWT session management.
 *
 * The session cookie is HttpOnly, Secure, SameSite lax, and signed with
 * SESSION_SECRET. It carries only the minimum fields needed for auth checks:
 * userId, email, role, and expiry. No PII or passwords.
 */

const SESSION_COOKIE = "session";
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  console.warn("[auth] SESSION_SECRET is not set. Auth will fail in production.");
}

function getEncodedKey() {
  return new TextEncoder().encode(SESSION_SECRET || "fallback-secret-do-not-use");
}

export type SessionPayload = {
  userId: string;
  email: string;
  role: "admin" | "user";
  exp?: number;
};

export type Session = {
  userId: string;
  email: string;
  role: "admin" | "user";
};

export async function encrypt(payload: SessionPayload): Promise<string> {
  const secret = getEncodedKey();
  return new SignJWT({ userId: payload.userId, email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function decrypt(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), { algorithms: ["HS256"] });
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;
    if (typeof userId !== "string" || typeof email !== "string") return null;
    return {
      userId,
      email,
      role: role === "admin" ? "admin" : "user",
    };
  } catch (err) {
    console.warn("[auth] session verify failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decrypt(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
