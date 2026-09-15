// Cookie-based auth for the whole app. Uses Web Crypto (crypto.subtle) so
// the exact same code runs in the Edge middleware and in Node API routes.

const COOKIE_NAME = "adora_session";
const SESSION_DAYS = 30;

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

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

export function checkCredentials(username: string, password: string): boolean {
  return username === authUser() && password === authPassword();
}

export async function createSessionValue(): Promise<{ value: string; maxAgeSeconds: number }> {
  const maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60;
  const expires = Date.now() + maxAgeSeconds * 1000;
  const sig = await hmac(String(expires));
  return { value: `${expires}.${sig}`, maxAgeSeconds };
}

export async function isValidSessionValue(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const [expiresStr, sig] = value.split(".");
  if (!expiresStr || !sig) return false;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = await hmac(expiresStr);
  return expected === sig;
}

export { COOKIE_NAME };
