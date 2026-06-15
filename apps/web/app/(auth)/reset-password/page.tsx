"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { LegacyPanel } from "@/components/auth/LegacyPanel";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(
      passwordRegex,
      "Password must contain at least one capital letter, one number, and one special character"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
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
          {isSuccess ? (
            <div style={{ textAlign: "center", paddingTop: "2rem" }}>
              <CheckCircle 
                size={48} 
                color="#126969" 
                style={{ margin: "0 auto 1.5rem" }} 
              />
              <h1 className={styles.title} style={{ marginBottom: "1rem" }}>
                Password updated
              </h1>
              <p className={styles.subtitle} style={{ margin: "0 auto 2rem" }}>
                Your password has been successfully reset. You can now use your new password to sign in.
              </p>
              <Link 
                href="/login" 
                className={styles.submitButton}
                style={{ textDecoration: "none" }}
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <header className={styles.header}>
                <h1 className={styles.title}>Create New Password</h1>
                <p className={styles.subtitle}>
                  Please choose a strong password that you haven&apos;t used before.
                </p>
              </header>

              <form
                className={styles.form}
                noValidate
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">
                    New Password
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="........"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                      className={`${styles.input} ${styles.passwordInput} ${
                        errors.password ? styles.inputError : ""
                      }`}
                      {...register("password")}
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
                  <p className={styles.passwordHint}>
                    Minimum 8 characters, with at least 1 capital letter, 1 number, and 1 special character.
                  </p>
                  {errors.password && (
                    <p
                      id="password-error"
                      role="alert"
                      className={styles.errorText}
                    >
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className={styles.field} style={{ marginTop: "1rem" }}>
                  <label className={styles.label} htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="........"
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby={
                        errors.confirmPassword ? "confirm-password-error" : undefined
                      }
                      className={`${styles.input} ${styles.passwordInput} ${
                        errors.confirmPassword ? styles.inputError : ""
                      }`}
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p
                      id="confirm-password-error"
                      role="alert"
                      className={styles.errorText}
                    >
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={styles.submitButton}
                  style={{ marginTop: "1.75rem" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Updating...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
                {error && (
                  <p role="alert" className={styles.errorText}>
                    {error}
                  </p>
                )}
              </form>

              <p className={styles.navLink} style={{ marginTop: "2rem" }}>
                <Link 
                  href="/login" 
                  className={styles.navLinkAnchor} 
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <ArrowLeft size={16} /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      <section className={styles.rightColumn}>
        <LegacyPanel />
      </section>
    </main>
  );
}
