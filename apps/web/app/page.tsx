import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Stethoscope,
  Smartphone,
  Mail,
  ChevronRight,
} from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.root}>

      {/* ─── NAVBAR ─── */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand}>
            <div className={styles.navBrandIcon}>
              <Activity size={16} strokeWidth={2.5} />
            </div>
            <span className={styles.navBrandName}>O2Plus</span>
          </Link>

          <div className={styles.navCenter}>
            <a href="#home"    className={styles.navLink}>Home</a>
            <a href="#about"   className={styles.navLink}>About</a>
            <a href="#contact" className={styles.navLink}>Contact</a>
          </div>

          <div className={styles.navRight}>
            <Link href="/patient/login" className={styles.navBtnOutline}>Patient Login</Link>
            <Link href="/login"         className={styles.navBtnFill}>Doctor Login</Link>
          </div>
        </div>
      </header>

      {/* ─── HOME ─── */}
      <section id="home" className={styles.hero}>
        {/* Background dark panel (matches login page right panel) */}
        <div className={styles.heroBg} />

        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <p className={styles.heroEyebrow}>Respiratory Care Platform</p>
            <h1 className={styles.heroHeading}>
              Your patients.<br />
              Between visits.<br />
              <em>Always monitored.</em>
            </h1>
            <p className={styles.heroBody}>
              O2Plus connects pulmonologists with their patients in real-time —
              tracking breathing, symptoms, and recovery without anyone needing to
              physically be in a clinic.
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
              New clinic?{" "}
              <Link href="/register" className={styles.heroRegisterLink}>
                Create an account <ChevronRight size={13} />
              </Link>
            </p>
          </div>

          <div className={styles.heroRight}>
            {/* Floating clinical card */}
            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <div className={styles.heroCardLiveDot} />
                <span className={styles.heroCardLiveLabel}>Live monitoring</span>
              </div>
              <div className={styles.heroPatientList}>
                {[
                  { name: "Arjun K.",   dx: "COPD · Stage III",              risk: "High",     riskColor: "#ea580c", riskBg: "#fff7ed" },
                  { name: "Priya S.",   dx: "Asthma · Well controlled",      risk: "Stable",   riskColor: "#16a34a", riskBg: "#f0fdf4" },
                  { name: "Ramesh V.",  dx: "ILD · Post-ICU recovery",       risk: "Moderate", riskColor: "#ca8a04", riskBg: "#fefce8" },
                ].map((p, i) => (
                  <div key={i} className={styles.heroPatientRow}>
                    <div className={styles.heroPatientAvatar}
                      style={{ background: p.riskBg, color: p.riskColor }}>
                      {p.name[0]}
                    </div>
                    <div className={styles.heroPatientInfo}>
                      <span className={styles.heroPatientName}>{p.name}</span>
                      <span className={styles.heroPatientDx}>{p.dx}</span>
                    </div>
                    <span className={styles.heroPatientRisk}
                      style={{ color: p.riskColor, background: p.riskBg }}>
                      {p.risk}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.heroCardFooter}>
                <span>3 of 18 patients shown</span>
                <span className={styles.heroCardFooterArrow}>View all →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className={styles.about}>
        <div className={styles.aboutInner}>

          <div className={styles.aboutTop}>
            <p className={styles.sectionEyebrow}>About O2Plus</p>
            <h2 className={styles.sectionHeading}>
              Medicine happens<br />outside the clinic too.
            </h2>
            <p className={styles.sectionBody}>
              Between appointments, patients manage complex respiratory conditions alone.
              O2Plus bridges that gap — giving doctors a real-time view into how their
              patients are actually doing, and giving patients a simple way to stay connected.
            </p>
          </div>

          <div className={styles.aboutGrid}>
            <div className={styles.aboutCard}>
              <div className={styles.aboutCardNum}>01</div>
              <h3 className={styles.aboutCardTitle}>For Doctors</h3>
              <p className={styles.aboutCardBody}>
                See your entire patient panel at once. Know who needs attention before
                they call you. Make decisions with current data, not last week&apos;s notes.
              </p>
            </div>
            <div className={styles.aboutCard}>
              <div className={styles.aboutCardNum}>02</div>
              <h3 className={styles.aboutCardTitle}>For Patients</h3>
              <p className={styles.aboutCardBody}>
                Log how you feel in under a minute each day. Get reminders for medication.
                Know your doctor is watching over your recovery — even from home.
              </p>
            </div>
            <div className={styles.aboutCard}>
              <div className={styles.aboutCardNum}>03</div>
              <h3 className={styles.aboutCardTitle}>Built on Guidelines</h3>
              <p className={styles.aboutCardBody}>
                Every alert, every threshold, every score in O2Plus is grounded in
                published global respiratory medicine standards — not guesswork.
              </p>
            </div>
          </div>

          {/* Conditions strip */}
          <div className={styles.conditionsStrip}>
            <p className={styles.conditionsLabel}>Conditions we support</p>
            <div className={styles.conditionsTags}>
              {["Asthma", "COPD", "ILD & Pulmonary Fibrosis", "Bronchiectasis", "Post-ICU Recovery"].map((c, i) => (
                <span key={i} className={styles.conditionTag}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="contact" className={styles.contact}>
        <div className={styles.contactInner}>
          <div className={styles.contactLeft}>
            <p className={styles.sectionEyebrow}>Get in touch</p>
            <h2 className={styles.sectionHeading}>
              Ready to bring your practice online?
            </h2>
            <p className={styles.sectionBody}>
              Whether you&apos;re a solo specialist or running a multi-doctor department,
              O2Plus is ready for you. Setup takes minutes.
            </p>
            <div className={styles.contactInfoList}>
              <div className={styles.contactInfoItem}>
                <div className={styles.contactInfoIcon}><Mail size={18} /></div>
                <div>
                  <div className={styles.contactInfoLabel}>Email</div>
                  <div className={styles.contactInfoValue}>support@o2plus.app</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contactRight}>
            <div className={styles.contactCard}>
              <h3 className={styles.contactCardTitle}>Register your practice</h3>
              <p className={styles.contactCardSub}>No credit card. Instant access.</p>
              <div className={styles.contactForm}>
                <div className={styles.contactField}>
                  <label className={styles.contactLabel}>Your name</label>
                  <div className={styles.contactInputMock}>Dr. </div>
                </div>
                <div className={styles.contactField}>
                  <label className={styles.contactLabel}>Work email</label>
                  <div className={styles.contactInputMock}>doctor@hospital.com</div>
                </div>
              </div>
              <Link href="/register" className={styles.contactCta}>
                Get started <ArrowRight size={16} />
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
              <div className={styles.navBrandIcon} style={{ width: 28, height: 28, borderRadius: 7 }}>
                <Activity size={14} strokeWidth={2.5} />
              </div>
              <span className={styles.footerBrandName}>O2Plus</span>
            </div>
            <p className={styles.footerTagline}>Respiratory care, between visits.</p>
          </div>
          <nav className={styles.footerNav}>
            <Link href="/login"         className={styles.footerLink}>Doctor Login</Link>
            <Link href="/patient/login" className={styles.footerLink}>Patient Login</Link>
            <Link href="/register"      className={styles.footerLink}>Register</Link>
            <a href="#contact"          className={styles.footerLink}>Contact</a>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <p className={styles.footerDisclaimer}>
            O2Plus is a clinical decision support tool for licensed practitioners. In emergencies, call 112 or visit your nearest hospital.
          </p>
          <p className={styles.footerCopy}>© 2025 O2Plus</p>
        </div>
      </footer>

    </div>
  );
}