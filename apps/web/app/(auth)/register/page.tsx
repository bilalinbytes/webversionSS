"use client";

import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { LegacyPanel } from "@/components/auth/LegacyPanel";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import styles from "./page.module.css";

// ----------------------
// Validation Schemas — Fix 2, 3, 4
// ----------------------
const emailRegisterSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required").max(100),
    specialisation: z.string().min(1, "Specialisation is required"),
    hospital: z.string().min(1, "Hospital / Institution is required"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one capital letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms: z
      .boolean()
      .refine((val) => val === true, "You must accept the terms & conditions"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const phoneRegisterSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100),
  specialisation: z.string().min(1, "Specialisation is required"),
  hospital: z.string().min(1, "Hospital / Institution is required"),
  phone: z.string().min(10, "Please enter a valid mobile number"),
  terms: z
    .boolean()
    .refine((val) => val === true, "You must accept the terms & conditions"),
});

const googleRegisterSchema = z.object({
  terms: z
    .boolean()
    .refine((val) => val === true, "You must accept the terms & conditions"),
});

type EmailFormData = z.infer<typeof emailRegisterSchema>;
type PhoneFormData = z.infer<typeof phoneRegisterSchema>;
type GoogleFormData = z.infer<typeof googleRegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"email" | "phone" | "google">(
    "email"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [emailConfirmSent, setEmailConfirmSent] = useState(false);

  // Phone OTP State
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingPhoneData, setPendingPhoneData] = useState<PhoneFormData | null>(
    null
  );

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
  } = useForm<EmailFormData>({ resolver: zodResolver(emailRegisterSchema) });

  const {
    register: registerPhone,
    handleSubmit: handlePhoneSubmit,
    formState: { errors: phoneErrors },
    watch: watchPhone,
  } = useForm<PhoneFormData>({ resolver: zodResolver(phoneRegisterSchema) });

  const {
    register: registerGoogle,
    handleSubmit: handleGoogleSubmit,
    formState: { errors: googleErrors },
  } = useForm<GoogleFormData>({ resolver: zodResolver(googleRegisterSchema) });

  const currentPhone = watchPhone("phone");
  const formatPhone = (phone: string) => phone.startsWith("+") ? phone : `+91${phone}`;
  const phoneDoctorEmail = (phone: string) =>
    `${formatPhone(phone).replace(/^\+/, "")}@phone.saans.local`;

  const onEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    setEmailError(null);

    const supabase = createClient();
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (signUpError || !authData.user) {
      setEmailError(signUpError?.message ?? "Registration failed");
      setIsLoading(false);
      return;
    }

    // Save pending registration data for post-confirmation insert
    if (!authData.session) {
      localStorage.setItem(
        "saans_pending_registration",
        JSON.stringify({
          name: data.fullName,
          email: data.email,
          specialisation: data.specialisation,
          hospital: data.hospital,
        }),
      );
      setEmailConfirmSent(true);
      setIsLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("doctors").insert({
      id: authData.user.id,
      name: data.fullName,
      email: data.email,
      specialisation: data.specialisation,
      hospital: data.hospital,
    });

    if (insertError) {
      setEmailError(insertError.message);
      setIsLoading(false);
      return;
    }

    router.push("/doctordashboard");
  };

  const onPhoneSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    setPhoneError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(data.phone),
    });

    if (error) {
      setPhoneError(error.message);
      setIsLoading(false);
      return;
    }

    setPendingPhoneData(data);
    setPhoneStep("otp");
    setResendCooldown(30);
    setIsLoading(false);
  };

  const onGoogleSubmit = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setGoogleError(error.message);
      setIsGoogleLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    if (!pendingPhoneData) {
      setPhoneError("Please request a fresh OTP before verifying.");
      return;
    }

    setIsLoading(true);
    setPhoneError(null);

    const supabase = createClient();
    const formattedPhone = formatPhone(currentPhone);
    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: code,
      type: "sms",
    });

    if (verifyError || !authData.user) {
      setPhoneError(verifyError?.message ?? "Verification failed");
      setIsLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("doctors").insert({
      id: authData.user.id,
      name: pendingPhoneData.fullName,
      email: phoneDoctorEmail(pendingPhoneData.phone),
      specialisation: pendingPhoneData.specialisation,
      hospital: pendingPhoneData.hospital,
    });

    if (insertError) {
      setPhoneError(insertError.message);
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

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setPhoneError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(currentPhone),
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
            <h1 className={styles.title}>Create your account.</h1>
            <p className={styles.subtitle}>
              Start monitoring your patients today.
            </p>
          </header>

          <div className={styles.tabsContainer}>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setAuthMode("email");
                setPhoneStep("phone");
              }}
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
              Phone
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setAuthMode("google");
                setPhoneStep("phone");
              }}
              className={`${styles.tab} ${authMode === "google" ? styles.tabActive : ""}`}
            >
              Google
            </button>
          </div>

          {/* EMAIL TAB — Fix 2, 3, 4, 6 */}
          {authMode === "email" && (
            emailConfirmSent ? (
              <div className={styles.confirmSentState}>
                <p className={styles.confirmSentTitle}>Check your inbox</p>
                <p className={styles.confirmSentBody}>
                  We sent a confirmation link to your email address. Click the link to
                  activate your account — you will be brought back here automatically.
                </p>
                <button
                  type="button"
                  className={styles.navLinkAnchor}
                  onClick={() => setEmailConfirmSent(false)}
                >
                  Back to registration
                </button>
              </div>
            ) : (
            <form
              className={styles.form}
              noValidate
              onSubmit={handleEmailSubmit(onEmailSubmit)}
            >
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email-fullName">
                  Full Name
                </label>
                <input
                  id="email-fullName"
                  type="text"
                  placeholder="Dr. Jane Doe"
                  aria-invalid={Boolean(emailErrors.fullName)}
                  className={`${styles.input} ${emailErrors.fullName ? styles.inputError : ""}`}
                  {...registerEmail("fullName")}
                />
                {emailErrors.fullName && (
                  <p role="alert" className={styles.errorText}>
                    {emailErrors.fullName.message}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="doctor@hospital.org"
                  aria-invalid={Boolean(emailErrors.email)}
                  className={`${styles.input} ${emailErrors.email ? styles.inputError : ""}`}
                  {...registerEmail("email")}
                />
                {emailErrors.email && (
                  <p role="alert" className={styles.errorText}>
                    {emailErrors.email.message}
                  </p>
                )}
              </div>

              {/* Password + Confirm Password */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">
                    Password
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      aria-invalid={Boolean(emailErrors.password)}
                      className={`${styles.input} ${styles.passwordInput} ${emailErrors.password ? styles.inputError : ""}`}
                      {...registerEmail("password")}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((c) => !c)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className={styles.passwordHint}>
                    Must be 8+ characters with a capital letter, number, and special character.
                  </p>
                  {emailErrors.password && (
                    <p role="alert" className={styles.errorText}>
                      {emailErrors.password.message}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      aria-invalid={Boolean(emailErrors.confirmPassword)}
                      className={`${styles.input} ${styles.passwordInput} ${emailErrors.confirmPassword ? styles.inputError : ""}`}
                      {...registerEmail("confirmPassword")}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword((c) => !c)}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                  </div>
                  {emailErrors.confirmPassword && (
                    <p role="alert" className={styles.errorText}>
                      {emailErrors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Specialisation + Hospital — side by side Fix 3, 4, 6 */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email-spec">
                    Specialisation
                  </label>
                  <input
                    id="email-spec"
                    type="text"
                    placeholder="e.g. Pulmonologist"
                    aria-invalid={Boolean(emailErrors.specialisation)}
                    className={`${styles.input} ${emailErrors.specialisation ? styles.inputError : ""}`}
                    {...registerEmail("specialisation")}
                  />
                  {emailErrors.specialisation && (
                    <p role="alert" className={styles.errorText}>
                      {emailErrors.specialisation.message}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email-hospital">
                    Hospital / Institution
                  </label>
                  <input
                    id="email-hospital"
                    type="text"
                    placeholder="e.g. AIIMS Delhi"
                    aria-invalid={Boolean(emailErrors.hospital)}
                    className={`${styles.input} ${emailErrors.hospital ? styles.inputError : ""}`}
                    {...registerEmail("hospital")}
                  />
                  {emailErrors.hospital && (
                    <p role="alert" className={styles.errorText}>
                      {emailErrors.hospital.message}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.checkboxRow}>
                <div className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    id="email-terms"
                    {...registerEmail("terms")}
                    className={styles.checkbox}
                  />
                  <label htmlFor="email-terms" className={styles.checkboxLabel}>
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>
                {emailErrors.terms && (
                  <p role="alert" className={styles.errorText}>
                    {emailErrors.terms.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Registering...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
              {emailError && (
                <p role="alert" className={styles.errorText}>
                  {emailError}
                </p>
              )}
            </form>
            )
          )}

          {/* PHONE TAB — Fix 3, 4 */}
          {authMode === "phone" && (
            <div className={styles.form}>
              {phoneStep === "phone" ? (
                <form noValidate onSubmit={handlePhoneSubmit(onPhoneSubmit)}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="phone-fullName">
                      Full Name
                    </label>
                    <input
                      id="phone-fullName"
                      type="text"
                      placeholder="Dr. Jane Doe"
                      className={`${styles.input} ${phoneErrors.fullName ? styles.inputError : ""}`}
                      {...registerPhone("fullName")}
                    />
                    {phoneErrors.fullName && (
                      <p role="alert" className={styles.errorText}>
                        {phoneErrors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="phone">
                      Mobile Number
                    </label>
                    <div className={styles.phoneInputWrapper}>
                      <span className={styles.phonePrefix}>+91</span>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
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

                  {/* Specialisation + Hospital side-by-side */}
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="phone-spec">
                        Specialisation
                      </label>
                      <input
                        id="phone-spec"
                        type="text"
                        placeholder="e.g. Pulmonologist"
                        aria-invalid={Boolean(phoneErrors.specialisation)}
                        className={`${styles.input} ${phoneErrors.specialisation ? styles.inputError : ""}`}
                        {...registerPhone("specialisation")}
                      />
                      {phoneErrors.specialisation && (
                        <p role="alert" className={styles.errorText}>
                          {phoneErrors.specialisation.message}
                        </p>
                      )}
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="phone-hospital">
                        Hospital / Institution
                      </label>
                      <input
                        id="phone-hospital"
                        type="text"
                        placeholder="e.g. AIIMS Delhi"
                        aria-invalid={Boolean(phoneErrors.hospital)}
                        className={`${styles.input} ${phoneErrors.hospital ? styles.inputError : ""}`}
                        {...registerPhone("hospital")}
                      />
                      {phoneErrors.hospital && (
                        <p role="alert" className={styles.errorText}>
                          {phoneErrors.hospital.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={styles.checkboxRow}>
                    <div className={styles.checkboxContainer}>
                      <input
                        type="checkbox"
                        id="phone-terms"
                        {...registerPhone("terms")}
                        className={styles.checkbox}
                      />
                      <label
                        htmlFor="phone-terms"
                        className={styles.checkboxLabel}
                      >
                        I agree to the Terms of Service and Privacy Policy
                      </label>
                    </div>
                    {phoneErrors.terms && (
                      <p role="alert" className={styles.errorText}>
                        {phoneErrors.terms.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={styles.submitButton}
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
                    <span className={styles.readOnlyNumber}>
                      +91 {currentPhone}
                    </span>
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
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : "Resend OTP"}
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
                    style={{ marginTop: "1rem" }}
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

          {/* GOOGLE TAB */}
          {authMode === "google" && (
            <form
              className={styles.form}
              noValidate
              onSubmit={handleGoogleSubmit(onGoogleSubmit)}
            >
              <div className={styles.googleTabContent}>
                <div className={styles.googleTabIcon} aria-hidden="true">
                  <GoogleIcon />
                </div>
                <p className={styles.googleTabHeading}>
                  Register with Google
                </p>
                <p className={styles.googleTabSubtext}>
                  Link your Google account and complete your clinical profile
                  after sign-in. Fast, secure, and no password required.
                </p>
              </div>

              <div className={styles.checkboxRow}>
                <div className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    id="google-terms"
                    {...registerGoogle("terms")}
                    className={styles.checkbox}
                  />
                  <label
                    htmlFor="google-terms"
                    className={styles.checkboxLabel}
                  >
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>
                {googleErrors.terms && (
                  <p role="alert" className={styles.errorText}>
                    {googleErrors.terms.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isGoogleLoading}
                className={styles.googleButton}
                style={{ marginTop: "1rem" }}
              >
                {isGoogleLoading ? (
                  <Loader2 size={16} className={styles.spinner} />
                ) : (
                  <GoogleIcon />
                )}
                {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
              </button>
              {googleError && (
                <p role="alert" className={styles.errorText}>
                  {googleError}
                </p>
              )}
            </form>
          )}

          <p className={styles.navLink}>
            Already have an account?{" "}
            <Link href="/login" className={styles.navLinkAnchor}>
              Log in
            </Link>
          </p>
        </div>
      </section>

      <section className={styles.rightColumn}>
        <LegacyPanel />
      </section>
    </main>
  );
}
