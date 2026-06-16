import { NextResponse } from "next/server";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
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

  if (
    typeof email    !== "string" ||
    typeof password !== "string" ||
    email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
    password !== ADMIN_PASSWORD
  ) {
    return NextResponse.json(
      { error: "Invalid credentials. Please check your email and password." },
      { status: 401 },
    );
  }

  const token = buildAdminToken();

  const response = NextResponse.json({
    ok: true,
    admin: { email: ADMIN_EMAIL, name: ADMIN_NAME },
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
