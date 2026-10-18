import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Secret for a guest's order page. The customer gets the token (in their link);
 * the database stores only its SHA-256 hash, so a leaked database row can't be
 * turned back into a working link.
 */
export function createOrderToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOrderToken(token) };
}

export function hashOrderToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison, so response timing reveals nothing about the hash. */
export function tokenMatches(token: string, storedHash: string): boolean {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token) || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashOrderToken(token), "hex"), Buffer.from(storedHash, "hex"));
}
