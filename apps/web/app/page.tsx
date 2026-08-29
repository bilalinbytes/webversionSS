import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Stethoscope,
  Smartphone,
  Mail,
  ChevronRight,
  ShieldCheck,
  Zap,
  HeartPulse,
  Award,
  Quote,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import { Pathway3DVisual } from "@/components/marketing/Pathway3DVisual";
import { Hero3DScene } from "@/components/marketing/Hero3DScene";
import { TestimonialCarousel } from "@/components/marketing/TestimonialCarousel";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.root}>

      {/* ─── NAVBAR ─── */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand}>
            <SaansBrandIcon />
            <span className={styles.navBrandName}>O2Plus</span>
          </Link>

          <div className={styles.navCenter}>
            <a href="#home"        className={styles.navLink}>Home</a>
            <a href="#pathway"     className={styles.navLink}>Care Pathway</a>
            <a href="#about"       className={styles.navLink}>About</a>
            <a href="#testimonial" className={styles.navLink}>Clinical Review</a>
            <a href="#contact"     className={styles.navLink}>Contact</a>
          </div>

          <div className={styles.navRight}>
            <Link href="/patient/login" className={styles.navBtnOutline}>Patient Portal</Link>
            <Link href="/login"         className={styles.navBtnFill}>Doctor Login</Link>
          </div>
        </div>
      </header>

      {/* ─── HOME (HERO) ─── */}
      <section id="home" className={styles.hero}>
        <div className={styles.heroBg} />

        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <div className={styles.heroBadge}>
              <HeartPulse size={14} className={styles.badgeHeartIcon} />
              <span>Next-Gen Pulmonology Intelligence</span>
            </div>

            <h1 className={styles.heroHeading}>
              Precision Care.<br />
              Between Visits.<br />
              <em>Always Monitored.</em>
            </h1>

            <p className={styles.heroBody}>
              O2Plus empowers pulmonologists with continuous real-time SpO₂, mMRC,
              and symptom triage — preventing emergency admissions before they happen.
            </p>

            <div className={styles.heroCtas}>
              <Link href="/login" className={styles.ctaFill}>
                <Stethoscope size={17} />
                Doctor Portal
                <ArrowRight size={15} />
              </Link>
              <Link href="/patient/login" className={styles.ctaOutline}>
                <Smartphone size={17} />
                Patient App
              </Link>
            </div>

            <p className={styles.heroRegister}>
              Are you a pulmonologist or clinic?{" "}
              <Link href="/register" className={styles.heroRegisterLink}>
                Register your practice <ChevronRight size={13} />
              </Link>
            </p>
          </div>

          <div className={styles.heroRight}>
            <Hero3DScene />
          </div>
        </div>
      </section>

      {/* ─── RESPIRATORY CARE PATHWAY (STORYTELLING ANALOGY) ─── */}
      <section id="pathway" className={styles.pathwaySection}>
        <div className={styles.pathwayInner}>
          <div className={styles.pathwayHeader}>
            <p className={styles.sectionEyebrow}>Respiratory Care Journey</p>
            <h2 className={styles.sectionHeading}>
              The Pathway to Healthy Lungs &amp; <span className={styles.blueHighlight}>Continuous Protection</span>
            </h2>
            <p className={styles.sectionBody}>
              O2Plus guides patients through a structured three-stage monitoring journey, ensuring silent baseline drops are detected early and protected proactively.
            </p>
          </div>

          <div className={styles.pathwayGrid}>
            {/* Left: 3D Vector SVG Pathway Graphic */}
            <div className={styles.pathwayVisualWrap}>
              <Pathway3DVisual />
            </div>

            {/* Right: Milestone Storytelling Cards (Clean English Only) */}
            <div className={styles.pathwayCards}>
              {/* Milestone 1: Early Detection */}
              <div className={`${styles.milestoneCard} ${styles.milestoneCardStep1}`}>
                <div className={`${styles.milestoneIconWrap} ${styles.milestoneIconStep1}`}>
                  <Activity size={22} />
                </div>
                <div className={styles.milestoneBody}>
                  <div className={styles.milestoneHeaderRow}>
                    <h3 className={styles.milestoneTitle}>1. Early Detection</h3>
                    <span className={`${styles.milestoneBadge} ${styles.badgeStep1}`}>Daily Vitals &amp; Check-in</span>
                  </div>
                  <p className={styles.milestoneDesc}>
                    Continuous tracking of SpO₂, heart rate, breathlessness (mMRC grade), and VAS symptom severity detects subtle drops days before clinical deterioration.
                  </p>
                </div>
              </div>

              {/* Milestone 2: Active Protection */}
              <div className={`${styles.milestoneCard} ${styles.milestoneCardStep2}`}>
                <div className={`${styles.milestoneIconWrap} ${styles.milestoneIconStep2}`}>
                  <ShieldCheck size={22} />
                </div>
                <div className={styles.milestoneBody}>
                  <div className={styles.milestoneHeaderRow}>
                    <h3 className={styles.milestoneTitle}>2. Active Protection</h3>
                    <span className={`${styles.milestoneBadge} ${styles.badgeStep2}`}>Rx Adherence &amp; AQI Defense</span>
                  </div>
                  <p className={styles.milestoneDesc}>
                    Daily prescription checklists combined with automated air quality alerts shield patients against environmental pollution triggers and medication lapses.
                  </p>
                </div>
              </div>

              {/* Milestone 3: Stability & Recovery */}
              <div className={`${styles.milestoneCard} ${styles.milestoneCardStep3}`}>
                <div className={`${styles.milestoneIconWrap} ${styles.milestoneIconStep3}`}>
                  <Sparkles size={22} />
                </div>
                <div className={styles.milestoneBody}>
                  <div className={styles.milestoneHeaderRow}>
                    <h3 className={styles.milestoneTitle}>3. Stability &amp; Recovery</h3>
                    <span className={`${styles.milestoneBadge} ${styles.badgeStep3}`}>Proactive Triage &amp; Peace of Mind</span>
                  </div>
                  <p className={styles.milestoneDesc}>
                    Autonomous red-flag triage ensures immediate pulmonologist review during critical desaturations, preventing emergency hospital admissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABOUT (ADVERTISING & CLINICAL VALUE) ─── */}
      <section id="about" className={styles.about}>
        <div className={styles.aboutInner}>
          <div className={styles.aboutHeader}>
            <p className={styles.sectionEyebrow}>Platform Capabilities</p>
            <h2 className={styles.sectionHeading}>
              Engineered for Modern Pulmonology Teams
            </h2>
            <p className={styles.sectionBody}>
              Traditional pulmonology relies on sporadic clinic visits every 3 to 6 months.
              O2Plus turns silent post-discharge periods into an active, intelligent care loop.
            </p>
          </div>

          <div className={styles.aboutGrid}>
            <div className={styles.aboutCard}>
              <div className={styles.aboutCardIconWrap}>
                <HeartPulse size={22} />
              </div>
              <h3 className={styles.aboutCardTitle}>Real-Time Vitals Tracking</h3>
              <p className={styles.aboutCardBody}>
                Automatic trend analysis for SpO₂, pulse rate, mMRC dyspnea grades, and ACT scores — surfacing silent drops before emergency room visits.
              </p>
            </div>

            <div className={styles.aboutCard}>
              <div className={styles.aboutCardIconWrap}>
                <ShieldCheck size={22} />
              </div>
              <h3 className={styles.aboutCardTitle}>International Guideline-Based Protocol Engine</h3>
              <p className={styles.aboutCardBody}>
                Built strictly around international clinical guidelines and global respiratory care standards. Risk levels are computed autonomously without adding doctor overhead.
              </p>
            </div>

            <div className={styles.aboutCard}>
              <div className={styles.aboutCardIconWrap}>
                <Zap size={22} />
              </div>
              <h3 className={styles.aboutCardTitle}>Instant Red-Flag Triage</h3>
              <p className={styles.aboutCardBody}>
                High-acuity patients automatically bubble up to the top of the workstation so doctors can adjust prescriptions in seconds.
              </p>
            </div>
          </div>

          {/* Conditions Pill Bar */}
          <div className={styles.conditionsStrip}>
            <p className={styles.conditionsLabel}>Supported Clinical Tracks</p>
            <div className={styles.conditionsTags}>
              {["Asthma Control Guidelines", "COPD Management Guidelines", "ILD & Fibrosis Protocol", "Bronchiectasis Surveillance", "Post-ICU Rehabilitation"].map((c, i) => (
                <span key={i} className={styles.conditionTag}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIAL (CLINICAL REVIEWS CAROUSEL) ─── */}
      <section id="testimonial" className={styles.testimonialSection}>
        <div className={styles.testimonialInner}>
          <div className={styles.testimonialHeader}>
            <span className={styles.testimonialEyebrow}>Clinical Reviews</span>
            <h2 className={styles.testimonialHeading}>
              Trusted by Leading Pulmonologists &amp; Hospitals
            </h2>
          </div>

          <TestimonialCarousel />
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="contact" className={styles.contact}>
        <div className={styles.contactInner}>
          <div className={styles.contactLeft}>
            <p className={styles.sectionEyebrow}>Get In Touch</p>
            <h2 className={styles.sectionHeading}>
              Ready to Upgrade Your Pulmonology Practice?
            </h2>
            <p className={styles.sectionBody}>
              Whether you are an individual practitioner or managing a hospital department,
              O2Plus is built for instant clinical deployment.
            </p>
            <div className={styles.contactInfoList}>
              <div className={styles.contactInfoItem}>
                <div className={styles.contactInfoIcon}><Mail size={18} /></div>
                <div>
                  <div className={styles.contactInfoLabel}>Clinical Support</div>
                  <a href="mailto:o2plus8@gmail.com" className={styles.contactInfoValue} style={{ color: "inherit", textDecoration: "none" }}>
                    o2plus8@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contactRight}>
            <div className={styles.contactCard}>
              <h3 className={styles.contactCardTitle}>Register Your Clinic</h3>
              <p className={styles.contactCardSub}>Takes less than 2 minutes. Instant setup for pulmonologists and departments.</p>
              
              <div className={styles.registerPerksList}>
                <div className={styles.registerPerkItem}>
                  <CheckCircle2 size={16} className={styles.perkIcon} />
                  <span>Real-time patient vitals &amp; red-flag triage</span>
                </div>
                <div className={styles.registerPerkItem}>
                  <CheckCircle2 size={16} className={styles.perkIcon} />
                  <span>Automated guideline-based respiratory pathways</span>
                </div>
                <div className={styles.registerPerkItem}>
                  <CheckCircle2 size={16} className={styles.perkIcon} />
                  <span>HIPAA-compliant data architecture &amp; PDF reports</span>
                </div>
              </div>

              <Link href="/register" className={styles.contactCta}>
                Register Practice Now <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <div className={styles.footerBrand}>
              <SaansBrandIcon />
              <span className={styles.footerBrandName}>O2Plus</span>
            </div>
            <p className={styles.footerTagline}>Precision Respiratory Care — Between Hospital Visits</p>
          </div>
          <nav className={styles.footerNav}>
            <Link href="/login"         className={styles.footerLink}>Doctor Login</Link>
            <Link href="/patient/login" className={styles.footerLink}>Patient Login</Link>
            <Link href="/register"      className={styles.footerLink}>Register Practice</Link>
            <a href="#contact"          className={styles.footerLink}>Contact</a>
          </nav>
        </div>

        {/* ─── CREDITS ─── */}
        <div className={styles.footerCreditsRow}>
          <div className={styles.footerCreditCard}>
            <span className={styles.creditRoleLabel}>Conceptualised &amp; Prototyped by</span>
            <strong className={styles.creditName}>Dr. Irfan Shekh</strong>
            <span className={styles.creditTitle}>Assistant Professor, AIIMS Delhi</span>
          </div>
          <div className={styles.footerCreditCard}>
            <span className={styles.creditRoleLabel}>Software Architecture &amp; End-to-End Development by</span>
            <strong className={styles.creditName}>Mohammed Bilal</strong>
            <span className={styles.creditTitle}>AI &amp; Software Developer</span>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerDisclaimer}>
            O2Plus is a clinical decision support system for licensed medical practitioners. In emergencies, patients must call emergency services (112) or visit the nearest hospital.
          </p>
          <p className={styles.footerCopy}>© 2026 O2Plus</p>
        </div>
      </footer>

    </div>
  );
}
