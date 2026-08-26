import Link from "next/link";
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  FileSpreadsheet,
  Smartphone,
  Lock,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  ChevronRight,
} from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.landingPage}>
      {/* ── Global Header ── */}
      <header className={styles.navbar}>
        <Link href="/" className={styles.brand}>
          <div className={styles.brandIcon}>
            <Activity size={20} strokeWidth={2.4} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>O2Plus</span>
            <span className={styles.brandTagline}>Clinical Respiratory Platform</span>
          </div>
        </Link>

        <nav className={styles.navLinks}>
          <a href="#programs" className={styles.navLink}>Clinical Programs</a>
          <a href="#workstation" className={styles.navLink}>Doctor Workstation</a>
          <a href="#companion" className={styles.navLink}>Patient Companion</a>
          <a href="#security" className={styles.navLink}>Security</a>
        </nav>

        <div className={styles.navActions}>
          <Link href="/patient/login" className={styles.btnPatientNav}>
            Patient Portal
          </Link>
          <Link href="/login" className={styles.btnDoctorNav}>
            Doctor Login
          </Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.badgePill}>
            <span className={styles.badgeDot} />
            <span>Next-Generation Respiratory Clinical Intelligence</span>
          </div>

          <h1 className={styles.heroTitle}>
            Precision Respiratory Care{" "}
            <span className={styles.heroTitleHighlight}>Between Hospital Visits</span>
          </h1>

          <p className={styles.heroSubtitle}>
            A specialized hospital workstation and patient companion platform empowering
            pulmonologists to monitor, triage, and manage Asthma, COPD, ILD, Bronchiectasis,
            and Post-ICU recovery in real-time.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/login" className={styles.ctaDoctorPrimary}>
              <Stethoscope size={18} />
              <span>Doctor Workstation</span>
              <ArrowRight size={16} />
            </Link>

            <Link href="/patient/login" className={styles.ctaPatientSecondary}>
              <Smartphone size={18} />
              <span>Patient Companion</span>
            </Link>
          </div>

          <Link href="/register" className={styles.ctaRegisterLink}>
            <span>Are you a pulmonologist or clinic? Register your practice</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Hero Interactive Workstation Preview Mockup */}
        <div style={{ marginTop: 44 }}>
          <div className={styles.heroPreviewWrapper}>
            <div className={styles.heroPreviewInner}>
              {/* Left Action Zone */}
              <div className={styles.previewSidebar}>
                <div className={styles.previewBrand}>Clinical Decision Center</div>
                <div className={styles.previewAlertCard}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className={styles.previewBadgeCritical}>1 CRITICAL</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>Score 10</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ffffff" }}>Bilal</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#fca5a5" }}>SpO₂ &lt; 80% · OAD / Bronchiolitis</p>
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12, fontSize: 11, color: "#94a3b8" }}>
                  Autonomous Red-Flag Triage Engine Active
                </div>
              </div>

              {/* Right Table Zone */}
              <div className={styles.previewMain}>
                <div className={styles.previewKpiStrip}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#0f2b48" }}>24</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Cohort</span>
                  </div>
                  <div style={{ width: 1, background: "#e2e8f0" }} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>1</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Critical</span>
                  </div>
                  <div style={{ width: 1, background: "#e2e8f0" }} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#ea580c" }}>2</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>High Risk</span>
                  </div>
                  <div style={{ width: 1, background: "#e2e8f0" }} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#16a34a" }}>21</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Stable</span>
                  </div>
                </div>

                <div className={styles.previewTableMock}>
                  <div className={styles.previewRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>B</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Bilal</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>OAD / Bronchiolitis Obliterans</div>
                      </div>
                    </div>
                    <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>CRITICAL 10</span>
                  </div>

                  <div className={styles.previewRow} style={{ borderLeftColor: "#fed7aa" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ffedd5", color: "#9a3412", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>AK</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Arun Kumar</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>COPD Group E</div>
                      </div>
                    </div>
                    <span style={{ background: "#ffedd5", color: "#9a3412", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>HIGH 7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5 Disease Programs ── */}
      <section id="programs" className={styles.diseaseSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Clinical Specializations</div>
          <h2 className={styles.sectionTitle}>5 Dedicated Disease Management Programs</h2>
          <p className={styles.sectionSub}>
            Built strictly according to global pulmonology guidelines (GINA, GOLD, ATS/ERS) with customized symptom scoring algorithms.
          </p>
        </div>

        <div className={styles.diseaseGrid}>
          <div className={styles.diseaseCard}>
            <div className={styles.diseaseIcon}>🫁</div>
            <h3 className={styles.diseaseCardTitle}>Asthma Control</h3>
            <p className={styles.diseaseCardDesc}>
              ACT score assessment, night-waking alerts, reliever canister usage tracking, and trigger avoidance guidance.
            </p>
            <span className={styles.diseaseCardTag}>GINA Protocol</span>
          </div>

          <div className={styles.diseaseCard}>
            <div className={styles.diseaseIcon}>🌬️</div>
            <h3 className={styles.diseaseCardTitle}>COPD Management</h3>
            <p className={styles.diseaseCardDesc}>
              Target SpO₂ monitoring (88–92%), mMRC dyspnea grading, cough frequency index, and BiPAP compliance.
            </p>
            <span className={styles.diseaseCardTag}>GOLD Guidelines</span>
          </div>

          <div className={styles.diseaseCard}>
            <div className={styles.diseaseIcon}>🔬</div>
            <h3 className={styles.diseaseCardTitle}>ILD & Pulmonary Fibrosis</h3>
            <p className={styles.diseaseCardDesc}>
              K-BILD quality-of-life survey (Q1–Q15), longitudinal PFT progression tracking, and rapid desaturation warnings.
            </p>
            <span className={styles.diseaseCardTag}>ATS/ERS Framework</span>
          </div>

          <div className={styles.diseaseCard}>
            <div className={styles.diseaseIcon}>🛡️</div>
            <h3 className={styles.diseaseCardTitle}>Bronchiectasis</h3>
            <p className={styles.diseaseCardDesc}>
              Murray sputum purulence color index, acute infection screening (fever &gt; 38°C), and airway clearance tracking.
            </p>
            <span className={styles.diseaseCardTag}>Infection Surveillance</span>
          </div>

          <div className={styles.diseaseCard}>
            <div className={styles.diseaseIcon}>🏥</div>
            <h3 className={styles.diseaseCardTitle}>Post-ICU Recovery</h3>
            <p className={styles.diseaseCardDesc}>
              90-day structured post-discharge rehabilitation milestones, daily vitals trajectory, and emergency trigger warnings.
            </p>
            <span className={styles.diseaseCardTag}>Post-Critical Care</span>
          </div>
        </div>
      </section>

      {/* ── Key Workstation Features ── */}
      <section id="workstation" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Enterprise Capability</div>
          <h2 className={styles.sectionTitle}>Engineered for Doctor Focus & Speed</h2>
          <p className={styles.sectionSub}>
            Everything a pulmonologist needs to review 30+ patient updates in under 5 minutes without information fatigue.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Zap size={22} />
            </div>
            <h3 className={styles.featureTitle}>Autonomous Red-Flag Triage</h3>
            <p className={styles.featureDesc}>
              Patented rule engine continuously calculates composite risk scores and places high-acuity patients at the top of the workstation.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <FileSpreadsheet size={22} />
            </div>
            <h3 className={styles.featureTitle}>Clinical Audit & Excel Engine</h3>
            <p className={styles.featureDesc}>
              Generate full 33-column flat cohort registries or 5-sheet comprehensive clinical dossiers in 1 click for hospital rounds and case reviews.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Smartphone size={22} />
            </div>
            <h3 className={styles.featureTitle}>60-Second Patient Check-In</h3>
            <p className={styles.featureDesc}>
              Bilingual (English / Hindi) companion app designed for elderly patients with high-contrast inputs and 1-tap logging.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final Conversion CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>Start Delivering Connected Respiratory Care</h2>
          <p className={styles.ctaSub}>
            Join leading pulmonology departments and respiratory clinicians providing continuous care between hospital visits.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/login" className={styles.ctaBtnPrimary}>
              Doctor Login
            </Link>
            <Link href="/register" className={styles.ctaBtnOutline}>
              Register Practice
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>O2Plus</div>
          <div className={styles.footerLinks}>
            <Link href="/login" className={styles.footerLink}>Doctor Portal</Link>
            <Link href="/patient/login" className={styles.footerLink}>Patient Portal</Link>
            <Link href="/register" className={styles.footerLink}>Register Clinic</Link>
            <Link href="/admin/login" className={styles.footerLink}>Institutional Admin</Link>
          </div>
        </div>
        <p className={styles.footerDisclaimer}>
          O2Plus is a clinical decision support and remote patient monitoring platform designed for licensed healthcare practitioners and enrolled patients. In medical emergencies, patients must immediately contact emergency services (112) or visit the nearest emergency department.
        </p>
      </footer>
    </div>
  );
}
