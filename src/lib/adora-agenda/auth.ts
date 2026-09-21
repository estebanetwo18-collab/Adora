// Cookie-based auth for the whole app. Uses Web Crypto (crypto.subtle) so
// the exact same code runs in the Edge proxy and in Node API routes.
//
// Two ways in: the env-configured master login (works even before Redis is
// set up, or if the users list is empty/unreachable) and per-person accounts
// stored in AgendaState.users (checked by the login route, which has access
// to the store). The session cookie signs *both* the user id and their role,
// so every request can tell who's asking without a DB round-trip.

import type { UserRole } from "./types";

const COOKIE_NAME = "adora_session";
const SESSION_DAYS = 30;
export const MASTER_SUBJECT = "master";

function authUser(): string {
  return process.env.ADORA_AUTH_USER || "adoramaster2026";
}
function authPassword(): string {
  return process.env.ADORA_AUTH_PASSWORD || "adoraAdios2026!";
}
// Signs the session cookie so it can't be forged by just setting a cookie
// value in devtools. Set ADORA_AUTH_SECRET in Vercel for production; this
// fallback keeps login working before that's configured.
function authSecret(): string {
  return process.env.ADORA_AUTH_SECRET || "adora-nail-salon-default-secret-change-me";
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

// ---------- password hashing (per-user accounts) ----------

export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `${toHex(salt)}:${toHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const saltHex = stored.split(":")[0];
  if (!saltHex) return false;
  const candidate = await hashPassword(password, saltHex);
  return candidate === stored;
}

// ---------- master (env-configured) login ----------

export function checkMasterCredentials(username: string, password: string): boolean {
  return username === authUser() && password === authPassword();
}

// ---------- signed session cookie ----------

export type Session = { sub: string; role: UserRole };

export async function createSessionValue(session: Session): Promise<{ value: string; maxAgeSeconds: number }> {
  const maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60;
  const expires = Date.now() + maxAgeSeconds * 1000;
  const payload = `${session.sub}|${session.role}|${expires}`;
  const sig = await hmac(payload);
  return { value: `${payload}|${sig}`, maxAgeSeconds };
}

export async function readSession(value: string | undefined | null): Promise<Session | null> {
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length !== 4) return null;
  const [sub, role, expiresStr, sig] = parts;
  const expires = Number(expiresStr);
  if (!sub || !role || !Number.isFinite(expires) || expires < Date.now()) return null;
  const expected = await hmac(`${sub}|${role}|${expiresStr}`);
  if (expected !== sig) return null;
  return { sub, role: role as UserRole };
}

export async function isValidSessionValue(value: string | undefined | null): Promise<boolean> {
  return (await readSession(value)) !== null;
}

export { COOKIE_NAME };
