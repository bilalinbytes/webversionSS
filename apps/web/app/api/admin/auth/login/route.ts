import { NextResponse } from "next/server";
import {
  getAdminEmail,
  verifyAdminCredentials,
  ADMIN_NAME,
  ADMIN_COOKIE,
  buildAdminToken,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };

  if (!verifyAdminCredentials(email, password)) {
    return NextResponse.json(
      { error: "Invalid credentials. Please check your email and password." },
      { status: 401 },
    );
  }

  const adminEmail = getAdminEmail();
  const token = buildAdminToken(adminEmail);

  const response = NextResponse.json({
    ok: true,
    admin: { email: adminEmail, name: ADMIN_NAME },
  });

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly : true,
    secure   : process.env.NODE_ENV === "production",
    sameSite : "lax",
    maxAge   : COOKIE_MAX_AGE,
    path     : "/",
  });

  return response;
}
