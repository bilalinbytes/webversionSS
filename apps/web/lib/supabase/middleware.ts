import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() re-validates the session on every request — do not replace with
  // getSession(), which only reads from the cookie and can serve stale data.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPatientLoginRoute = path === "/patient/login";
  const isAdminLoginRoute = path === "/admin/login";
  const isDoctorProtectedRoute = path.startsWith("/doctordashboard");
  const isAdminProtectedRoute = path.startsWith("/admindashboard");
  const isPatientProtectedRoute =
    path.startsWith("/patientdashboard") ||
    (path.startsWith("/patient/") && !isPatientLoginRoute);

  // Allow the OAuth callback through without any auth gate.
  // API routes handle their own auth via Bearer token — exclude them from the
  // redirect so they can return proper 401 JSON instead of a 307 to /login.
  const isAuthRoute =
    path.startsWith("/login") ||
    isPatientLoginRoute ||
    isAdminLoginRoute ||
    path.startsWith("/admin/login") ||
    path.startsWith("/register") ||
    path.startsWith("/complete-profile") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth") ||
    path.startsWith("/api/");

  if (isPatientProtectedRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/patient/login";
      return NextResponse.redirect(url);
    }

    const { data: patientRow } = await supabase
      .from("patients")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!patientRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/patient/login";
      url.searchParams.set("error", "not_found");
      return NextResponse.redirect(url);
    }
  }

  if (isDoctorProtectedRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const { data: doctorRow } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!doctorRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/patientdashboard";
      return NextResponse.redirect(url);
    }
  }

  if (isAdminProtectedRoute) {
    const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!verifyAdminToken(adminToken)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    // Admin is authenticated via cookie — no Supabase check needed
    return NextResponse.next({ request });
  }

  // Unauthenticated user hitting a protected route → send to login
  if (user && isPatientLoginRoute) {
    const { data: patientRow } = await supabase
      .from("patients")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (patientRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/patientdashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting login or root → skip to dashboard
  if (user && (path === "/" || path.startsWith("/login") || path.startsWith("/register"))) {
    const { data: doctorRow } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = doctorRow ? "/doctordashboard" : "/patientdashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
