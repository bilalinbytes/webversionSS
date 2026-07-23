/**
 * @o2plus/config — Environment variable validation.
 *
 * Every platform (web, mobile) calls createConfig(env) once at startup.
 * If a required variable is missing the app throws immediately with a clear
 * error rather than failing silently at the call site later.
 *
 * Web:    createConfig({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, ... })
 * Mobile: createConfig({ EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL, ... })
 */

export interface AppConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase anon (public) key */
  supabaseAnonKey: string;
  /** WAQI API token for AQI lookups (optional — AQI widget hides if absent) */
  waqiApiToken: string;
  /** Runtime environment */
  appEnv: "development" | "staging" | "production";
}

/**
 * Loose env source — accepts both Next.js (NEXT_PUBLIC_*) and Expo
 * (EXPO_PUBLIC_*) conventions so the same factory works on both platforms.
 */
export type EnvSource = Partial<Record<string, string | undefined>>;

/**
 * Validate environment variables and return a typed config object.
 * Throws at startup if any required variable is missing.
 */
export function createConfig(env: EnvSource): AppConfig {
  const supabaseUrl =
    env["NEXT_PUBLIC_SUPABASE_URL"] ??
    env["EXPO_PUBLIC_SUPABASE_URL"] ??
    throwMissing("SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL)");

  const supabaseAnonKey =
    env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??
    env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ??
    throwMissing("SUPABASE_ANON_KEY (NEXT_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY)");

  const rawEnv = env["NODE_ENV"] ?? env["EXPO_PUBLIC_APP_ENV"] ?? "development";
  const appEnv = (["development", "staging", "production"] as const).includes(
    rawEnv as "development" | "staging" | "production",
  )
    ? (rawEnv as AppConfig["appEnv"])
    : ("development" as const);

  return {
    supabaseUrl,
    supabaseAnonKey,
    waqiApiToken: env["WAQI_API_TOKEN"] ?? env["EXPO_PUBLIC_WAQI_API_TOKEN"] ?? "",
    appEnv,
  };
}

function throwMissing(key: string): never {
  throw new Error(
    `[o2plus/config] Required environment variable "${key}" is missing.\n` +
      `Make sure it is set in your .env.local (web) or .env (mobile) file.`,
  );
}
