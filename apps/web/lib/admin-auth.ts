import { createHmac } from "crypto";

// ── Shared admin-auth helpers ─────────────────────────────────────────────────
// Credentials live here. Change ADMIN_EMAIL / ADMIN_PASSWORD to update them.

export const ADMIN_EMAIL    = "admin@o2plus.com";
export const ADMIN_PASSWORD = "Admin@O2Plus#2025";
export const ADMIN_NAME     = "Super Admin";
export const ADMIN_COOKIE   = "admin_session";

const secret = () =>
  process.env.BACKEND_PEPPER ?? "o2plus-admin-secret-fallback-2025";

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function buildAdminToken(): string {
  const payload = `${ADMIN_EMAIL}:${Date.now()}`;
  const sig     = sign(payload);
  return Buffer.from(`${payload}::${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastSep = decoded.lastIndexOf("::");
    if (lastSep === -1) return false;
    const payload   = decoded.slice(0, lastSep);
    const sig       = decoded.slice(lastSep + 2);
    const expected  = sign(payload);
    return sig === expected && payload.startsWith(ADMIN_EMAIL + ":");
  } catch {
    return false;
  }
}
