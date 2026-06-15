"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { LegacyPanel } from "@/components/auth/LegacyPanel";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      data.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setIsLoading(false);
      return;
    }

    setSubmittedEmail(data.email);
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
                Check your email
              </h1>
              <p className={styles.subtitle} style={{ margin: "0 auto 2rem" }}>
                We&apos;ve sent a password reset link to <br/>
                <strong>{submittedEmail}</strong>
              </p>
              <Link 
                href="/login" 
                className={styles.submitButton}
                style={{ textDecoration: "none" }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <header className={styles.header}>
                <h1 className={styles.title}>Reset Password</h1>
                <p className={styles.subtitle}>
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </header>

              <form
                className={styles.form}
                noValidate
                onSubmit={handleSubmit(onSubmit)}
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
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={`${styles.input} ${
                      errors.email ? styles.inputError : ""
                    }`}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" className={styles.errorText}>
                      {errors.email.message}
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
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
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
