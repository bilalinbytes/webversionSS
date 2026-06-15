"use client";

import { Suspense, useEffect, useState } from "react";
import {
  Loader2,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeIndianPhone } from "@/lib/server/phone";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

const RESEND_SECONDS = 30;

type LoginMode = "returning" | "new" | "forgot";
type OtpStep = "phone" | "otp" | "pin";

function getPhoneErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("user not found") ||
    normalized.includes("signups not allowed") ||
    normalized.includes("not registered")
  ) {
    return "This number is not registered. Contact your doctor.";
  }

  return message;
}

function getOtpErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("expired") || normalized.includes("flow state expired")) {
    return "Your code has expired. Tap Resend to get a new one.";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("token") ||
    normalized.includes("otp") ||
    normalized.includes("code")
  ) {
    return "Incorrect code. Please try again.";
  }

  return message;
}

function PatientLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<LoginMode>("returning");
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "not_found") {
      setErrorMessage(
        "No patient account found for this number. Please contact your doctor.",
      );
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function redirectExistingPatientSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active || !session?.access_token) {
        return;
      }

      const response = await fetch("/api/patient-auth/check", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (active && response.ok) {
        router.replace("/patientdashboard");
        router.refresh();
      }
    }

    redirectExistingPatientSession();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function resetFlow(nextMode: LoginMode) {
    setMode(nextMode);
    setOtpStep("phone");
    setOtpValue("");
    setPinValue("");
    setConfirmPinValue("");
    setOtpToken("");
    setErrorMessage(null);
    setInfoMessage(null);
  }

  function sanitizePhoneInput(value: string) {
    return value.replace(/[^\d+]/g, "").slice(0, 13);
  }

  function sanitizePinInput(value: string) {
    return value.replace(/\D/g, "").slice(0, 4);
  }

  function validatePinPair() {
    if (!/^\d{4}$/.test(pinValue)) {
      setErrorMessage("Please enter a 4-digit PIN.");
      return false;
    }

    if (pinValue !== confirmPinValue) {
      setErrorMessage("PINs do not match. Please re-enter them.");
      return false;
    }

    return true;
  }

  async function sendOtp() {
    let phone: string;

    try {
      phone = normalizeIndianPhone(phoneInput);
    } catch {
      setErrorMessage("Please enter a valid number in +91XXXXXXXXXX format.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/patient-auth/start-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || data.error || "Failed to send OTP.");
        setSubmitting(false);
        return;
      }

      setNormalizedPhone(phone);
      setOtpStep("otp");
      setOtpValue("");
      setResendCooldown(RESEND_SECONDS);
      setInfoMessage(data.message || "OTP sent successfully.");
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp() {
    if (otpValue.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/patient-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: normalizedPhone,
          otp_code: otpValue.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || data.error || "OTP verification failed.");
        setSubmitting(false);
        return;
      }

      setOtpToken(data.otp_token);
      setOtpStep("pin");
      setPinValue("");
      setConfirmPinValue("");
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    if (resendCooldown > 0 || !normalizedPhone) return;

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/patient-auth/start-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: normalizedPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || data.error || "Failed to resend OTP.");
        setSubmitting(false);
        return;
      }

      setResendCooldown(RESEND_SECONDS);
      setInfoMessage(data.message || "OTP resent successfully.");
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePinLogin() {
    let phone: string;

    try {
      phone = normalizeIndianPhone(phoneInput);
    } catch {
      setErrorMessage("Please enter a valid number in +91XXXXXXXXXX format.");
      return;
    }

    if (!/^\d{4}$/.test(pinValue)) {
      setErrorMessage("Please enter your 4-digit PIN.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/patient-auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: phone,
          pin: pinValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || data.error || "Login failed.");
        setSubmitting(false);
        return;
      }

      setInfoMessage("Login successful! Redirecting...");

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        console.error("Failed to establish auth session client-side:", sessionError);
        setErrorMessage("Failed to establish session on your device. Please try again.");
        setSubmitting(false);
        return;
      }

      router.replace("/patientdashboard");
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
      setSubmitting(false);
    }
  }

  async function handleSetPin() {
    if (!validatePinPair()) return;

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/patient-auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp_token: otpToken,
          pin: pinValue,
          confirm_pin: confirmPinValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || data.error || "Failed to set PIN.");
        setSubmitting(false);
        return;
      }

      setInfoMessage(data.message || "PIN set successfully. Directing to PIN login...");
      setTimeout(() => {
        resetFlow("returning");
      }, 1500);
    } catch {
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>O2Plus</p>
          <h1 className={styles.title}>Patient Login</h1>
          <p className={styles.subtitle}>
            Use your registered patient or caretaker mobile number. OTPs are sent
            only to the primary number registered by your doctor.
          </p>
        </header>

        <nav className={styles.portalSwitch} aria-label="Choose login portal">
          <Link href="/login" className={styles.portalOption}>
            <Stethoscope size={16} />
            Doctor
          </Link>
          <Link
            href="/patient/login"
            className={`${styles.portalOption} ${styles.portalOptionActive}`}
            aria-current="page"
          >
            <UserRound size={16} />
            Patient
          </Link>
        </nav>

        {mode === "returning" ? (
          <div className={styles.form}>
            <div className={styles.flowHeader}>
              <Smartphone size={18} />
              <div>
                <p className={styles.flowTitle}>Log in with PIN</p>
                <p className={styles.flowCopy}>Enter your mobile number and 4-digit PIN.</p>
              </div>
            </div>

            <label className={styles.label} htmlFor="returning-phone">
              Mobile Number
            </label>
            <input
              id="returning-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91XXXXXXXXXX"
              value={phoneInput}
              onChange={(event) => setPhoneInput(sanitizePhoneInput(event.target.value))}
              className={styles.input}
            />

            <label className={styles.label} htmlFor="returning-pin">
              4-digit PIN
            </label>
            <input
              id="returning-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              placeholder="••••"
              value={pinValue}
              onChange={(event) => setPinValue(sanitizePinInput(event.target.value))}
              className={`${styles.input} ${styles.pinInput}`}
            />

            <button
              type="button"
              onClick={handlePinLogin}
              disabled={submitting || pinValue.length !== 4}
              className={styles.primaryButton}
            >
              Log in
            </button>

            <div className={styles.resendRow}>
              <span>Forgot your PIN?</span>
              <button
                type="button"
                onClick={() => resetFlow("forgot")}
                className={styles.linkButton}
              >
                Use OTP to reset
              </button>
            </div>

            <div className={styles.modeTextRow}>
              <span>First time here?</span>
              <button
                type="button"
                onClick={() => resetFlow("new")}
                className={styles.linkButton}
              >
                New patient setup
              </button>
            </div>
          </div>
        ) : null}

        {mode === "new" || mode === "forgot" ? (
          <div className={styles.form}>
            <div className={styles.stepRail} aria-label="Login progress">
              <span className={`${styles.stepDot} ${otpStep === "phone" ? styles.stepDotActive : ""}`}>1</span>
              <span className={styles.stepLine} />
              <span className={`${styles.stepDot} ${otpStep === "otp" ? styles.stepDotActive : ""}`}>2</span>
              <span className={styles.stepLine} />
              <span className={`${styles.stepDot} ${otpStep === "pin" ? styles.stepDotActive : ""}`}>3</span>
            </div>

            <div className={styles.flowHeader}>
              {mode === "forgot" ? <RotateCcw size={18} /> : <ShieldCheck size={18} />}
              <div>
                <p className={styles.flowTitle}>
                  {mode === "forgot" ? "Reset PIN with OTP" : "First-time setup"}
                </p>
                <p className={styles.flowCopy}>
                  {mode === "forgot"
                    ? "Verify with OTP, then create a new 4-digit PIN."
                    : "Verify once with OTP, then set a 4-digit PIN for future logins."}
                </p>
              </div>
            </div>

            {otpStep === "phone" ? (
              <>
                <label className={styles.label} htmlFor="otp-phone">
                  Mobile Number
                </label>
                <input
                  id="otp-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(sanitizePhoneInput(event.target.value))}
                  className={styles.input}
                />
                <p className={styles.helperText}>
                  You can enter the patient or caretaker number. The OTP will be
                  sent to the registered primary number.
                </p>

                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={submitting}
                  className={styles.primaryButton}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Sending...
                    </>
                  ) : mode === "forgot" ? (
                    "Send reset OTP"
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </>
            ) : null}

            {otpStep === "otp" ? (
              <>
                <div className={styles.phoneSummary}>
                  <span>{normalizedPhone}</span>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => {
                      setOtpStep("phone");
                      setOtpValue("");
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                  >
                    Change number
                  </button>
                </div>

                <label className={styles.label} htmlFor="patient-otp">
                  6-digit OTP
                </label>
                <input
                  id="patient-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={otpValue}
                  onChange={(event) =>
                    setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className={styles.input}
                />

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={submitting || otpValue.length !== 6}
                  className={styles.primaryButton}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </button>

                <div className={styles.resendRow}>
                  <span>Didn&apos;t receive a code?</span>
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={submitting || resendCooldown > 0}
                    className={styles.linkButton}
                  >
                    {resendCooldown > 0
                      ? `Resend OTP in ${resendCooldown}s`
                      : "Resend OTP"}
                  </button>
                </div>
              </>
            ) : null}

            {otpStep === "pin" ? (
              <>
                <div className={styles.phoneSummary}>
                  <span>OTP verified</span>
                  <ShieldCheck size={18} />
                </div>

                <label className={styles.label} htmlFor="new-pin">
                  {mode === "forgot" ? "New 4-digit PIN" : "Create 4-digit PIN"}
                </label>
                <input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  placeholder="••••"
                  value={pinValue}
                  onChange={(event) => setPinValue(sanitizePinInput(event.target.value))}
                  className={`${styles.input} ${styles.pinInput}`}
                />

                <label className={styles.label} htmlFor="confirm-pin">
                  Confirm PIN
                </label>
                <input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPinValue}
                  onChange={(event) => setConfirmPinValue(sanitizePinInput(event.target.value))}
                  className={`${styles.input} ${styles.pinInput}`}
                />
                <p className={styles.helperText}>
                  You will use this PIN for future logins. Keep it private.
                </p>

                <button
                  type="button"
                  onClick={handleSetPin}
                  disabled={submitting || pinValue.length !== 4 || confirmPinValue.length !== 4}
                  className={styles.primaryButton}
                >
                  {mode === "forgot" ? "Reset PIN" : "Set PIN and continue"}
                </button>
              </>
            ) : null}

            <button
              type="button"
              className={styles.backLink}
              onClick={() => resetFlow("returning")}
            >
              Back to PIN login
            </button>
          </div>
        ) : null}




        {errorMessage ? (
          <p role="alert" className={styles.errorText}>
            {errorMessage}
          </p>
        ) : null}
        {infoMessage ? (
          <p role="status" className={styles.infoText}>
            {infoMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default function PatientLoginPage() {
  return (
    <Suspense fallback={null}>
      <PatientLoginContent />
    </Suspense>
  );
}
