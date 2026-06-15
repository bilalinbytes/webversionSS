"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Stethoscope, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { LegacyPanel } from "@/components/auth/LegacyPanel";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import styles from "./page.module.css";

const emailLoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

const phoneLoginSchema = z.object({
  phone: z.string().min(10, "Please enter a valid mobile number"),
});

type EmailLoginFormData = z.infer<typeof emailLoginSchema>;
type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Phone OTP State
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
  });

  const {
    register: registerPhone,
    handleSubmit: handlePhoneSubmit,
    formState: { errors: phoneErrors },
    watch: watchPhone,
  } = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
  });

  const currentPhone = watchPhone("phone");
  const formatPhone = (phone: string) => phone.startsWith("+") ? phone : `+91${phone}`;

  async function signInWithGoogle() {
    setIsGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setEmailError(error.message);
      setIsGoogleLoading(false);
    }
    // On success the browser is redirected — no need to reset loading state
  }

  const onEmailSubmit = async (data: EmailLoginFormData) => {
    setIsLoading(true);
    setEmailError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setEmailError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/doctordashboard");
  };

  const onPhoneSubmit = async (data: PhoneLoginFormData) => {
    setIsLoading(true);
    setPhoneError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(data.phone),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      setPhoneError(error.message);
      setIsLoading(false);
      return;
    }

    setPhoneStep("otp");
    setResendCooldown(30);
    setIsLoading(false);
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    setIsLoading(true);
    setPhoneError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: formatPhone(currentPhone),
      token: code,
      type: "sms",
    });

    if (error) {
      setPhoneError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/doctordashboard");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setPhoneError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(currentPhone),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      setPhoneError(error.message);
      return;
    }

    setResendCooldown(30);
  };

  return (
    <main className={styles.page}>
      <div className={styles.tealPanel} aria-hidden="true" />
      <div className={styles.panelBloom} aria-hidden="true" />

      <section className={styles.leftColumn}>
        <div className={styles.brand}>
          <SaansBrandIcon className={styles.brandIcon} />
          <div>
            <p className={styles.brandTitle}>O2Plus</p>
            <p className={styles.brandTagline}>
              Connecting missing dots with your doctor....
            </p>
          </div>
        </div>

        <div className={styles.formShell}>
          <header className={styles.header}>
            <h1 className={styles.title}>Doctor Portal</h1>
            <p className={styles.subtitle}>
              Sign in to your clinical dashboard.
            </p>
          </header>

          <nav className={styles.portalSwitch} aria-label="Choose login portal">
            <Link
              href="/login"
              className={`${styles.portalOption} ${styles.portalOptionActive}`}
              aria-current="page"
            >
              <Stethoscope size={16} />
              Doctor
            </Link>
            <Link href="/patient/login" className={styles.portalOption}>
              <UserRound size={16} />
              Patient
            </Link>
          </nav>

          {callbackError && (
            <p role="alert" className={styles.errorText}>
              {callbackError === 'auth_failed'
                ? 'Google sign-in failed. Please try again.'
                : 'Something went wrong. Please try again.'}
            </p>
          )}

          <div className={styles.tabsContainer}>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setAuthMode("email")}
              className={`${styles.tab} ${authMode === "email" ? styles.tabActive : ""}`}
            >
              Email
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setAuthMode("phone")}
              className={`${styles.tab} ${authMode === "phone" ? styles.tabActive : ""}`}
            >
              Phone Number
            </button>
          </div>

          {authMode === "email" && (
            <form
              className={styles.form}
              noValidate
              onSubmit={handleEmailSubmit(onEmailSubmit)}
            >
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="doctor@hospital.org"
                  aria-invalid={Boolean(emailErrors.email)}
                  aria-describedby={emailErrors.email ? "email-error" : undefined}
                  className={`${styles.input} ${emailErrors.email ? styles.inputError : ""
                    }`}
                  {...registerEmail("email")}
                />
                {emailErrors.email && (
                  <p id="email-error" role="alert" className={styles.errorText}>
                    {emailErrors.email.message}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">
                  Password
                </label>
                <div className={styles.passwordWrap}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="........"
                    aria-invalid={Boolean(emailErrors.password)}
                    aria-describedby={
                      emailErrors.password ? "password-error" : undefined
                    }
                    className={`${styles.input} ${styles.passwordInput} ${emailErrors.password ? styles.inputError : ""
                      }`}
                    {...registerEmail("password")}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {emailErrors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className={styles.errorText}
                  >
                    {emailErrors.password.message}
                  </p>
                )}
              </div>

              <div className={styles.metaRow}>
                <Link href="/forgot-password" className={styles.forgotPassword}>
                  Forgot password?
                </Link>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Signing in...
                  </>
                ) : (
                  "Sign in to Dashboard"
                )}
              </button>
              {emailError && (
                <p role="alert" className={styles.errorText}>
                  {emailError}
                </p>
              )}
            </form>
          )}

          {authMode === "phone" && (
            <div className={styles.form}>
              {phoneStep === "phone" ? (
                <form noValidate onSubmit={handlePhoneSubmit(onPhoneSubmit)}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="phone">
                      Mobile Number
                    </label>
                    <div className={styles.phoneInputWrapper}>
                      <span className={styles.phonePrefix}>+91</span>
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="9876543210"
                        aria-invalid={Boolean(phoneErrors.phone)}
                        className={`${styles.input} ${styles.phoneInput} ${phoneErrors.phone ? styles.inputError : ""}`}
                        {...registerPhone("phone")}
                      />
                    </div>
                    {phoneErrors.phone && (
                      <p role="alert" className={styles.errorText}>
                        {phoneErrors.phone.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={styles.submitButton}
                    style={{ marginTop: "1.5rem" }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                  {phoneError && (
                    <p role="alert" className={styles.errorText}>
                      {phoneError}
                    </p>
                  )}
                </form>
              ) : (
                <div className={styles.otpFlow}>
                  <div className={styles.readOnlyPhone}>
                    <span className={styles.readOnlyNumber}>+91 {currentPhone}</span>
                    <button
                      type="button"
                      className={styles.changeLink}
                      onClick={() => setPhoneStep("phone")}
                    >
                      Change
                    </button>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Enter 6-digit OTP</label>
                    <div className={styles.otpContainer}>
                      {otp.map((digit, i) => (
                         <input
                           key={i}
                           ref={(el) => {
                             otpRefs.current[i] = el;
                           }}
                           type="text"
                           inputMode="numeric"
                           maxLength={1}
                           value={digit}
                           className={styles.otpInput}
                           onChange={(e) => handleOtpChange(i, e.target.value)}
                           onKeyDown={(e) => handleOtpKeyDown(i, e)}
                         />
                      ))}
                    </div>
                    <div className={styles.resendContainer}>
                      <span>Didn&apos;t receive code?</span>
                      <button
                        type="button"
                        className={styles.resendLink}
                        disabled={resendCooldown > 0}
                        onClick={handleResendOtp}
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                      </button>
                    </div>
                    {phoneError && (
                      <p role="alert" className={styles.errorText}>
                        {phoneError}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={isLoading || otp.join("").length < 6}
                    className={styles.submitButton}
                    style={{ marginTop: "1.5rem" }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={styles.divider} aria-hidden="true">
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>or continue with</span>
            <span className={styles.dividerLine} />
          </div>

          <button
            id="google-oauth-btn"
            type="button"
            className={styles.googleButton}
            disabled={isGoogleLoading}
            onClick={signInWithGoogle}
          >
            {isGoogleLoading ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <GoogleIcon />
            )}
            {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          <p className={styles.footerText}>
            Protected under DPDP and HIPAA standards. Data encrypted at rest
            and in transit.
          </p>
          <p className={styles.navLink}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className={styles.navLinkAnchor}>Register</Link>
          </p>
        </div>
      </section>

      <section className={styles.rightColumn}>
        <LegacyPanel />
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
