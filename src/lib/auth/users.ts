import bcrypt from "bcryptjs";

/**
 * Wave 1 uses environment-backed demo credentials so the product is gated
 * behind real auth without requiring a user-management UI.
 *
 * Configure in .env.local:
 *   DEMO_USER_EMAIL=admin@provenra.app
 *   DEMO_USER_PASSWORD=change-me-in-production
 *
 * The password is hashed with bcrypt at runtime and compared with a
 * timing-safe bcrypt check. If DEMO_USER_PASSWORD is not set, login is
 * disabled and the app returns a clear error.
 */

export type AppUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

function getDemoUser(): AppUser {
  return {
    id: "user-demo-001",
    email: process.env.DEMO_USER_EMAIL || "admin@provenra.app",
    role: "admin",
  };
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.DEMO_USER_PASSWORD && process.env.DEMO_USER_PASSWORD.length >= 6);
}

let cachedPasswordHash: string | null = null;

async function getExpectedPasswordHash(): Promise<string | null> {
  const expectedPassword = process.env.DEMO_USER_PASSWORD;
  if (!expectedPassword || expectedPassword.length < 6) return null;
  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash(expectedPassword, 10);
  }
  return cachedPasswordHash;
}

export async function verifyCredentials(email: string, password: string): Promise<AppUser | null> {
  const expectedEmail = process.env.DEMO_USER_EMAIL || "admin@provenra.app";
  const expectedHash = await getExpectedPasswordHash();

  if (!expectedHash) {
    console.warn("[auth] DEMO_USER_PASSWORD is not configured; login is disabled.");
    return null;
  }

  if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
    return null;
  }

  const match = await bcrypt.compare(password, expectedHash);
  if (!match) return null;

  return getDemoUser();
}

export function getUserById(userId: string): AppUser | null {
  if (userId === getDemoUser().id) return getDemoUser();
  return null;
}
