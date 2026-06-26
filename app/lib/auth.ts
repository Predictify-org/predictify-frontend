import crypto from "crypto";

/**
 * Validates double-submit CSRF tokens using constant-time comparison.
 * Protects wallet authentication endpoints from timing and CSRF attacks.
 */
export function validateCsrfToken(cookieToken: string | null, headerToken: string | null): boolean {
  if (!cookieToken || !headerToken) return false;

  try {
    const bufCookie = Buffer.from(cookieToken);
    const bufHeader = Buffer.from(headerToken);

    if (bufCookie.length !== bufHeader.length) {
      return false;
    }

    // Secure constant-time string comparison
    return crypto.timingSafeEqual(bufCookie, bufHeader);
  } catch {
    return false;
  }
}
