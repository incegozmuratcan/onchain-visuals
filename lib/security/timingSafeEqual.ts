import crypto from "crypto";

/** Length-safe string compare. Different lengths return false and do not throw. */
export function timingSafeEqualText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  const length = Math.max(a.length, b.length, 1);
  const aBuf = Buffer.alloc(length);
  const bBuf = Buffer.alloc(length);
  a.copy(aBuf);
  b.copy(bBuf);
  return a.length === b.length && crypto.timingSafeEqual(aBuf, bBuf);
}
