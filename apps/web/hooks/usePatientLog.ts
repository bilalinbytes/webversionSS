"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitDailyLog } from "@o2plus/api-client/patient";
import type { DailyLogPayload } from "@/lib/server/log-schema";

type SubmitState = "idle" | "submitting" | "success" | "error";

interface UsePatientLogReturn {
  submitState: SubmitState;
  submitLog: (payload: DailyLogPayload) => Promise<boolean>;
  errorMessage: string | null;
  limitReached: boolean;
  reset: () => void;
}

/**
 * Hook for patient-side daily log submission.
 * Uses Bearer token auth and posts to /api/patient-logs.
 * On 500, preserves form state (returns false, doesn't reset).
 */
export function usePatientLog(): UsePatientLogReturn {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const submitLog = useCallback(async (payload: DailyLogPayload): Promise<boolean> => {
    setSubmitState("submitting");
    setErrorMessage(null);
    setLimitReached(false);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setSubmitState("error");
        setErrorMessage("Session expired. Please log in again.");
        return false;
      }

      // We only need the access token, not the supabase client for this mutation,
      // but ApiConfig expects it. We provide a dummy client since it's not used internally.
      const res = await submitDailyLog({ supabase: null as any }, payload, session.access_token);

      if (!res.success) {
        setSubmitState("error");
        setErrorMessage(res.error || "Server error. Please try again.");
        setLimitReached(res.limitReached || false);
        return false;
      }

      setSubmitState("success");
      return true;
    } catch {
      setSubmitState("error");
      setErrorMessage("Network error. Your data has been preserved — please try again.");
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setSubmitState("idle");
    setErrorMessage(null);
    setLimitReached(false);
  }, []);

  return { submitState, submitLog, errorMessage, limitReached, reset };
}
