"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { LegacyPanel } from "@/components/auth/LegacyPanel";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

// Fix 5: fullName and email removed from schema — they come from session
// Fix 3, 4: hospital added, specialization → specialisation (optional)
const completeProfileSchema = z.object({
  specialisation: z.string().min(1, "Specialisation is required"),
  hospital: z.string().min(1, "Hospital / Institution is required"),
  accepts_appointments: z.boolean(),
});

type ProfileFormData = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleName, setGoogleName] = useState("Loading...");
  const [googleEmail, setGoogleEmail] = useState("Loading...");
  const [pendingName, setPendingName] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      specialisation: "",
      hospital: "",
      accepts_appointments: true,
    },
  });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }

      // Read pending email registration data if present
      const raw = localStorage.getItem("saans_pending_registration");
      if (raw) {
        try {
          const pending = JSON.parse(raw) as {
            name: string;
            email: string;
            specialisation: string;
            hospital: string;
          };
          setPendingName(pending.name);
          setGoogleName(pending.name);
          setGoogleEmail(pending.email);
          // Pre-fill the form fields
          reset({ specialisation: pending.specialisation, hospital: pending.hospital, accepts_appointments: true });
          return;
        } catch {
          // malformed localStorage entry — ignore, form stays empty
        }
      }

      setGoogleName(
        user.user_metadata.full_name ?? user.user_metadata.name ?? ""
      );
      setGoogleEmail(user.email ?? "");
    });
  }, [reset, router]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("doctors").insert({
      id: user.id,
      name: pendingName ?? user.user_metadata.full_name ?? user.user_metadata.name ?? "",
      email: user.email ?? "",
      specialisation: data.specialisation,
      hospital: data.hospital,
      accepts_appointments: data.accepts_appointments,
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    localStorage.removeItem("saans_pending_registration");
    router.push("/doctordashboard");
  };

  return (
    <main className={styles.page}>
      <div className={styles.tealPanel} aria-hidden="true" />
      <div className={styles.panelBloom} aria-hidden="true" />

      <section className={styles.leftColumn}>
        <div className={styles.brand}>
          <SaansBrandIcon className={styles.brandIcon} />
          <div>
            <p className={styles.brandTitle}>Saans Sync</p>
            <p className={styles.brandTagline}>
              Connecting missing dots with your doctor....
            </p>
          </div>
        </div>

        <div className={styles.formShell}>
          <header className={styles.header}>
            <h1 className={styles.title}>Complete your profile.</h1>
            <p className={styles.subtitle}>
              Just one more step to access your clinical dashboard.
            </p>
          </header>

          <form className={styles.form} noValidate onSubmit={handleSubmit(onSubmit)}>
            {/* Fix 5: fullName and email are read-only display elements, not inputs */}
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <div className={styles.readonlyField}>{googleName}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <div className={styles.readonlyField}>{googleEmail}</div>
            </div>

            {/* Fix 3, 4: hospital + specialisation (optional, British spelling) */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="specialisation">
                Specialisation
              </label>
              <input
                id="specialisation"
                type="text"
                placeholder="e.g. Pulmonologist"
                aria-invalid={Boolean(errors.specialisation)}
                className={`${styles.input} ${errors.specialisation ? styles.inputError : ""}`}
                {...register("specialisation")}
              />
              {errors.specialisation && (
                <p role="alert" className={styles.errorText}>
                  {errors.specialisation.message}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="hospital">
                Hospital / Institution
              </label>
              <input
                id="hospital"
                type="text"
                placeholder="e.g. AIIMS Delhi"
                aria-invalid={Boolean(errors.hospital)}
                className={`${styles.input} ${errors.hospital ? styles.inputError : ""}`}
                {...register("hospital")}
              />
              {errors.hospital && (
                <p role="alert" className={styles.errorText}>
                  {errors.hospital.message}
                </p>
              )}
            </div>

            <div className={styles.field} style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                id="accepts_appointments"
                type="checkbox"
                {...register("accepts_appointments")}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="accepts_appointments" style={{ cursor: "pointer", margin: 0, fontSize: "0.95rem" }}>
                Accept appointment requests from patients through this app
              </label>
            </div>

            <button
              id="profile-submit-btn"
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
              style={{ marginTop: "1.5rem" }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Saving...
                </>
              ) : (
                "Save and Continue"
              )}
            </button>
            {error && (
              <p role="alert" className={styles.errorText}>
                {error}
              </p>
            )}
          </form>

          <p className={styles.footerText}>
            Protected under DPDP and HIPAA standards. Data encrypted at rest
            and in transit.
          </p>
        </div>
      </section>

      <section className={styles.rightColumn}>
        <LegacyPanel />
      </section>
    </main>
  );
}
