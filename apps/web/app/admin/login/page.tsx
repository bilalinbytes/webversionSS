"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import styles from "./page.module.css";

const loginSchema = z.object({
  email   : z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [authError,    setAuthError]    = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ email: data.email, password: data.password }),
      });

      const payload = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok || !payload.ok) {
        setAuthError(payload.error ?? "Invalid credentials. Please try again.");
        setIsLoading(false);
        return;
      }

      router.push("/admindashboard");
    } catch {
      setAuthError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <SaansBrandIcon className={styles.brandIcon} />
          <div>
            <p className={styles.brandTitle}>O2Plus</p>
            <p className={styles.brandTagline}>Platform Management</p>
          </div>
        </div>

        {/* Role badge */}
        <div className={styles.roleBadge}>
          <ShieldCheck size={14} strokeWidth={1.8} />
          <span>Super Admin Portal</span>
        </div>

        <h1 className={styles.title}>Sign in to Command Center</h1>
        <p className={styles.subtitle}>
          Restricted access. Authorised personnel only.
        </p>

        <form
          className={styles.form}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-email">
              Email Address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              placeholder="admin@o2plus.com"
              aria-invalid={Boolean(errors.email)}
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              {...register("email")}
            />
            {errors.email && (
              <p role="alert" className={styles.errorText}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-password">
              Password
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                className={`${styles.input} ${styles.passwordInput} ${errors.password ? styles.inputError : ""}`}
                {...register("password")}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((c) => !c)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p role="alert" className={styles.errorText}>
                {errors.password.message}
              </p>
            )}
          </div>

          {authError && (
            <p role="alert" className={styles.authError}>
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                Signing in…
              </>
            ) : (
              "Access Command Center"
            )}
          </button>
        </form>

        <p className={styles.footer}>
          Protected under DPDP and HIPAA standards. All access is logged.
        </p>
      </div>
    </main>
  );
}
