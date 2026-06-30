// Signed guest-session cookie. Works in both the Edge (middleware) and Node
// (server components) runtimes via the Web Crypto API.
//
// Format: `<token>.<hmac>` where hmac = HMAC-SHA256(token, GUEST_SECRET).
// The signature stops a visitor from forging someone else's guest id.

export const GUEST_COOKIE = "cb_guest";

function secret(): string {
  return process.env.GUEST_SECRET ?? "dev-insecure-secret";
}

function toBase64Url(bytes: ArrayBuffer): string {
  const b = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token),
  );
  return toBase64Url(sig);
}

/** Generate a fresh random guest token. */
export function generateGuestToken(): string {
  return crypto.randomUUID();
}

/** Produce the signed cookie value for a token. */
export async function signGuestToken(token: string): Promise<string> {
  return `${token}.${await hmac(token)}`;
}

/** Verify a signed cookie value; returns the token, or null if tampered. */
export async function verifyGuestToken(
  value: string | undefined,
): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const token = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(token);
  // Constant-time-ish compare.
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? token : null;
}
