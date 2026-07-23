import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@o2plus/types";

/**
 * Common configuration injected into every data access function.
 * This ensures functions are portable across browser, React Native, and server environments.
 */
export interface ApiConfig {
  /** Injected Supabase client, configured with the correct environment credentials/storage */
  supabase: SupabaseClient<Database>;
  /** Optional base URL for API routes that bypass Supabase (e.g. Twilio OTP routes) */
  baseUrl?: string;
  /** Optional fetch override for environments that need custom fetch behavior */
  fetch?: typeof globalThis.fetch;
}
