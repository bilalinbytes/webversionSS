import { createHmac, timingSafeEqual } from "crypto";

// ── Shared admin-auth helpers ─────────────────────────────────────────────────

export const ADMIN_NAME = "Super Admin";
export const ADMIN_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours max lifetime

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "admin@o2plus.com").trim().toLowerCase();
}

export const ADMIN_EMAIL = getAdminEmail();

export function getAdminPassword(): string {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_PASSWORD environment variable must be set in production.");
    }
    return "Admin@O2Plus#2025";
  }
  return envPassword;
}

export function verifyAdminCredentials(email?: string, password?: string): boolean {
  if (typeof email !== "string" || typeof password !== "string") return false;
  const configuredEmail = getAdminEmail();
  const configuredPassword = getAdminPassword();

  const isEmailMatch = email.trim().toLowerCase() === configuredEmail;
  const isPasswordMatch = password === configuredPassword;

  return isEmailMatch && isPasswordMatch;
}

function getSigningSecret(): string {
  const secret =
    process.env.ADMIN_AUTH_SECRET ||
    process.env.BACKEND_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_AUTH_SECRET or BACKEND_PEPPER must be configured in production.");
    }
    return "saans_dev_admin_secret_token_key_2026";
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export function buildAdminToken(email?: string): string {
  const targetEmail = (email || getAdminEmail()).trim().toLowerCase();
  const payload = `${targetEmail}:${Date.now()}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}::${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastSep = decoded.lastIndexOf("::");
    if (lastSep === -1) return false;

    const payload = decoded.slice(0, lastSep);
    const sig = decoded.slice(lastSep + 2);
    const expectedSig = sign(payload);

    // Timing-safe signature check
    const sigBuffer = Buffer.from(sig, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return false;
    }

    // Verify payload format & email
    const payloadParts = payload.split(":");
    if (payloadParts.length < 2) return false;
    const tokenEmail = payloadParts[0];
    const timestampStr = payloadParts[1];
    const timestamp = parseInt(timestampStr || "", 10);

    if (tokenEmail !== getAdminEmail()) return false;
    if (!Number.isFinite(timestamp)) return false;

    // Enforce 8-hour session expiration window (with 60s tolerance for clock drift)
    const now = Date.now();
    if (now - timestamp > ADMIN_SESSION_MAX_AGE_MS || timestamp > now + 60000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
