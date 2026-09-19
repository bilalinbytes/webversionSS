import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function getNoCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store",
  };
}

function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If no secret is configured, allow public access for basic uptime checks
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;
  const headerSecret = request.headers.get("x-cron-secret");

  return bearerToken === cronSecret || headerSecret === cronSecret;
}

export async function GET(request: Request): Promise<NextResponse> {
  const startTime = performance.now();

  // 1. Validate secret if configured
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      {
        status: "unauthorized",
        message: "Invalid or missing cron authorization secret.",
      },
      {
        status: 401,
        headers: getNoCacheHeaders(),
      }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 2. Check configuration
  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    return NextResponse.json(
      {
        status: "misconfigured",
        timestamp: new Date().toISOString(),
        error: "Supabase environment variables are missing (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
      },
      {
        status: 503,
        headers: getNoCacheHeaders(),
      }
    );
  }

  // 3. Perform a lightweight, read-only query to keep Supabase active
  try {
    const supabase = serviceRoleKey
      ? createAdminClient()
      : createClient<Database>(supabaseUrl, anonKey!, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

    // Minimal read-only query: fetch at most 1 id from patients table
    const { error } = await supabase
      .from("patients")
      .select("id")
      .limit(1);

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          timestamp: new Date().toISOString(),
          database: "disconnected",
          latencyMs,
          error: error.message,
        },
        {
          status: 503,
          headers: getNoCacheHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "o2plus-health-keepalive",
        database: {
          status: "connected",
          query: "SELECT id FROM patients LIMIT 1",
          latencyMs,
        },
      },
      {
        status: 200,
        headers: getNoCacheHeaders(),
      }
    );
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : "Internal health-check error";

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        latencyMs,
        error: errorMessage,
      },
      {
        status: 500,
        headers: getNoCacheHeaders(),
      }
    );
  }
}

export async function HEAD(request: Request): Promise<NextResponse> {
  const getResponse = await GET(request);
  return new NextResponse(null, {
    status: getResponse.status,
    headers: getResponse.headers,
  });
}
