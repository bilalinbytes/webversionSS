import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "crypto";

function buildTestToken(email: string, timestamp: number, secret: string): string {
  const payload = `${email}:${timestamp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}::${sig}`).toString("base64url");
}

function verifyTestToken(token: string | undefined, expectedEmail: string, secret: string, maxAgeMs = 8 * 60 * 60 * 1000): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastSep = decoded.lastIndexOf("::");
    if (lastSep === -1) return false;

    const payload = decoded.slice(0, lastSep);
    const sig = decoded.slice(lastSep + 2);
    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");

    if (sig !== expectedSig) return false;

    const parts = payload.split(":");
    if (parts.length < 2) return false;
    const tokenEmail = parts[0];
    const timestamp = parseInt(parts[1] || "", 10);

    if (tokenEmail !== expectedEmail) return false;
    if (!Number.isFinite(timestamp)) return false;

    const now = Date.now();
    if (now - timestamp > maxAgeMs || timestamp > now + 60000) {
      return false; // Expired or future timestamp
    }

    return true;
  } catch {
    return false;
  }
}

describe("Security Hardening: Session Expiration & HMAC Token Verification", () => {
  const TEST_SECRET = "super_secure_clinical_test_secret_key_123";
  const TEST_EMAIL = "admin@o2plus.com";

  it("successfully verifies a freshly generated valid token", () => {
    const token = buildTestToken(TEST_EMAIL, Date.now(), TEST_SECRET);
    expect(verifyTestToken(token, TEST_EMAIL, TEST_SECRET)).toBe(true);
  });

  it("strictly rejects an expired session token (>8 hours old)", () => {
    const nineHoursAgo = Date.now() - 9 * 60 * 60 * 1000;
    const expiredToken = buildTestToken(TEST_EMAIL, nineHoursAgo, TEST_SECRET);
    expect(verifyTestToken(expiredToken, TEST_EMAIL, TEST_SECRET)).toBe(false);
  });

  it("strictly rejects a token signed with an incorrect secret", () => {
    const token = buildTestToken(TEST_EMAIL, Date.now(), "wrong_secret");
    expect(verifyTestToken(token, TEST_EMAIL, TEST_SECRET)).toBe(false);
  });

  it("strictly rejects a token with a mismatched email address", () => {
    const token = buildTestToken("attacker@badactor.com", Date.now(), TEST_SECRET);
    expect(verifyTestToken(token, TEST_EMAIL, TEST_SECRET)).toBe(false);
  });

  it("strictly rejects malformed or truncated tokens", () => {
    expect(verifyTestToken("invalid-base64", TEST_EMAIL, TEST_SECRET)).toBe(false);
    expect(verifyTestToken("", TEST_EMAIL, TEST_SECRET)).toBe(false);
    expect(verifyTestToken(undefined, TEST_EMAIL, TEST_SECRET)).toBe(false);
  });
});
