import Link from "next/link";
import {
  Activity,
  Stethoscope,
  Smartphone,
  ArrowRight,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Shield,
  Zap,
  BarChart3,
  Clock,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  Wind,
} from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.root}>
      {/* ═══ NAVBAR ═══ */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandOrb}>
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <span className={styles.brandName}>O2Plus</span>
          </Link>

          <nav className={styles.navMenu}>
            <a href="#home"     className={styles.navItem}>Home</a>
            <a href="#about"    className={styles.navItem}>About</a>
            <a href="#features" className={styles.navItem}>Features</a>
            <a href="#programs" className={styles.navItem}>Programs</a>
            <a href="#contact"  className={styles.navItem}>Contact</a>
          </nav>

          <div className={styles.navCtas}>
            <Link href="/patient/login" className={styles.navBtnGhost}>Patient Portal</Link>
            <Link href="/login"         className={styles.navBtnPrimary}>Doctor Login</Link>
          </div>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section id="home" className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
        <div className={styles.gridOverlay} />

        {/* Floating particles */}
        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].map((i) => (
          <div key={i} className={styles.particle} style={{
            left: `${(i * 5.1) % 100}%`,
            top:  `${(i * 7.3 + 10) % 90}%`,
            animationDelay: `${(i * 0.4) % 8}s`,
            animationDuration: `${6 + (i % 5)}s`,
          }} />
        ))}

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgePulse} />
            Trusted by Leading Pulmonology Departments
          </div>

          <h1 className={styles.heroTitle}>
            The Future of<br />
            <span className={styles.heroGradText}>Respiratory Care</span><br />
            Is Here
          </h1>

          <p className={styles.heroSubtitle}>
            O2Plus is an enterprise-grade clinical intelligence platform empowering
            pulmonologists to monitor, triage, and manage patients with Asthma, COPD,
            ILD, Bronchiectasis &amp; Post-ICU conditions — in real-time, between hospital visits.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/login" className={styles.ctaPrimary}>
              <Stethoscope size={18} />
              <span>Launch Doctor Workstation</span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/patient/login" className={styles.ctaSecondary}>
              <Smartphone size={18} />
              <span>Patient Companion</span>
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>5</span>
              <span className={styles.statLabel}>Disease Programs</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNumber}>60s</span>
              <span className={styles.statLabel}>Patient Check-In</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNumber}>24/7</span>
              <span className={styles.statLabel}>Autonomous Triage</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNumber}>1-Click</span>
              <span className={styles.statLabel}>Excel Export</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className={styles.dashPreview}>
          <div className={styles.dashWindow}>
            <div className={styles.dashWindowBar}>
              <div className={styles.trafficDot} style={{ background: "#ff5f56" }} />
              <div className={styles.trafficDot} style={{ background: "#ffbd2e" }} />
              <div className={styles.trafficDot} style={{ background: "#27c93f" }} />
              <span className={styles.dashWindowTitle}>Clinical Decision Center — O2Plus</span>
            </div>
            <div className={styles.dashBody}>
              <div className={styles.dashKpi}>
                <div className={styles.kpiCard}><span className={styles.kpiNum} style={{color:"#f87171"}}>1</span><span className={styles.kpiLbl}>Critical</span></div>
                <div className={styles.kpiCard}><span className={styles.kpiNum} style={{color:"#fb923c"}}>2</span><span className={styles.kpiLbl}>High Risk</span></div>
                <div className={styles.kpiCard}><span className={styles.kpiNum} style={{color:"#34d399"}}>21</span><span className={styles.kpiLbl}>Stable</span></div>
                <div className={styles.kpiCard}><span className={styles.kpiNum} style={{color:"#60a5fa"}}>24</span><span className={styles.kpiLbl}>Total</span></div>
              </div>
              <div className={styles.dashRow} style={{borderLeftColor:"#ef4444"}}>
                <div className={styles.dashAvatar} style={{background:"#fef2f2",color:"#991b1b"}}>B</div>
                <div className={styles.dashPatInfo}>
                  <div className={styles.dashPatName}>Bilal Ahmed</div>
                  <div className={styles.dashPatDx}>OAD / Bronchiolitis Obliterans</div>
                </div>
                <div className={styles.dashBadge} style={{background:"#fef2f2",color:"#991b1b"}}>CRITICAL 10</div>
              </div>
              <div className={styles.dashRow} style={{borderLeftColor:"#f97316"}}>
                <div className={styles.dashAvatar} style={{background:"#fff7ed",color:"#9a3412"}}>AK</div>
                <div className={styles.dashPatInfo}>
                  <div className={styles.dashPatName}>Arun Kumar</div>
                  <div className={styles.dashPatDx}>COPD Group E</div>
                </div>
                <div className={styles.dashBadge} style={{background:"#fff7ed",color:"#9a3412"}}>HIGH 7</div>
              </div>
              <div className={styles.dashRow} style={{borderLeftColor:"#22c55e"}}>
                <div className={styles.dashAvatar} style={{background:"#f0fdf4",color:"#166534"}}>SR</div>
                <div className={styles.dashPatInfo}>
                  <div className={styles.dashPatName}>Sunita Rao</div>
                  <div className={styles.dashPatDx}>Asthma — Well Controlled</div>
                </div>
                <div className={styles.dashBadge} style={{background:"#f0fdf4",color:"#166534"}}>STABLE 2</div>
              </div>
              <div className={styles.dashFooter}>
                <span className={styles.dashLiveDot} />
                Autonomous Triage Engine Active
              </div>
            </div>
          </div>
        </div>

        <div className={styles.heroScrollCue}>
          <ChevronRight size={18} style={{transform:"rotate(90deg)"}} />
        </div>
      </section>

      {/* ═══ MARQUEE TRUST BAR ═══ */}
      <div className={styles.trustBar}>
        <div className={styles.trustTrack}>
          {["GINA Protocol","GOLD Guidelines","ATS/ERS Framework","HIPAA Compliant","Real-Time Monitoring","Autonomous Triage","1-Click Export","Mobile Companion",
            "GINA Protocol","GOLD Guidelines","ATS/ERS Framework","HIPAA Compliant","Real-Time Monitoring","Autonomous Triage","1-Click Export","Mobile Companion"].map((item, i) => (
            <span key={i} className={styles.trustItem}>
              <CheckCircle2 size={13} />{item}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ ABOUT ═══ */}
      <section id="about" className={styles.about}>
        <div className={styles.sectionInner}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutText}>
              <div className={styles.sectionPill}>About O2Plus</div>
              <h2 className={styles.sectionHeading}>
                Built by Clinicians,<br />
                <span className={styles.gradText}>For Clinicians</span>
              </h2>
              <p className={styles.bodyText}>
                O2Plus was born in the corridors of real pulmonology wards where doctors
                struggle with fragmented data, delayed alerts, and reactive care models.
                We built a specialized clinical intelligence layer that sits between
                hospital visits and gives pulmonologists superpowers.
              </p>
              <p className={styles.bodyText}>
                Every feature, every algorithm, every alert threshold in O2Plus is
                derived directly from published global guidelines — GINA, GOLD, ATS/ERS —
                not from assumptions. The result is a platform that speaks the language
                of respiratory medicine fluently.
              </p>
              <div className={styles.aboutChecks}>
                {["Evidence-based thresholds (GINA, GOLD, ATS/ERS)","Autonomous composite risk scoring","Patient-friendly bilingual companion app","1-click clinical audit export engine"].map((t, i) => (
                  <div key={i} className={styles.checkRow}>
                    <CheckCircle2 size={18} className={styles.checkIcon} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <Link href="/register" className={styles.aboutCta}>
                Register Your Practice <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.aboutVisual}>
              <div className={styles.metricCard} style={{top:"0%",left:"0"}}>
                <div className={styles.metricIcon} style={{background:"#fee2e2",color:"#dc2626"}}><Activity size={20}/></div>
                <div><div className={styles.metricNum}>SpO₂ 74%</div><div className={styles.metricSub}>🔴 Below critical threshold</div></div>
              </div>
              <div className={styles.metricCard} style={{top:"38%",right:"0"}}>
                <div className={styles.metricIcon} style={{background:"#dcfce7",color:"#16a34a"}}><Shield size={20}/></div>
                <div><div className={styles.metricNum}>Risk Score 2</div><div className={styles.metricSub}>✅ Patient stable</div></div>
              </div>
              <div className={styles.metricCard} style={{bottom:"0%",left:"10%"}}>
                <div className={styles.metricIcon} style={{background:"#dbeafe",color:"#1d4ed8"}}><FileSpreadsheet size={20}/></div>
                <div><div className={styles.metricNum}>Excel Export</div><div className={styles.metricSub}>33-column cohort registry</div></div>
              </div>
              <div className={styles.aboutCenterCard}>
                <div className={styles.centerCardInner}>
                  <Wind size={40} className={styles.centerWindIcon}/>
                  <div className={styles.centerCardTitle}>Respiratory Intelligence</div>
                  <div className={styles.centerCardSub}>5 disease programs · Real-time alerts</div>
                  <div className={styles.centerCardRing}/>
                  <div className={styles.centerCardRing2}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionPillCenter}>Platform Capabilities</div>
          <h2 className={styles.sectionHeadingCenter}>
            Everything Your Department Needs,<br />
            <span className={styles.gradText}>Nothing You Don&apos;t</span>
          </h2>
          <p className={styles.sectionSub}>
            Review 30+ patient updates in under 5 minutes without information fatigue.
          </p>
          <div className={styles.featGrid}>
            {([
              { icon:<Zap size={24}/>,           col:"#fef3c7", icol:"#d97706", title:"Autonomous Red-Flag Triage",  tag:"AI-Powered",   desc:"Composite risk scoring engine continuously ranks patients by acuity. Critical cases surface to the top automatically — zero manual sorting required." },
              { icon:<BarChart3 size={24}/>,      col:"#ede9fe", icol:"#7c3aed", title:"Longitudinal Analytics",     tag:"Clinical Intel",desc:"PFT trend charts, SpO₂ sparklines, mMRC progression — all visualized over time so you catch disease deterioration before the next hospital visit." },
              { icon:<FileSpreadsheet size={24}/>,col:"#dcfce7", icol:"#16a34a", title:"1-Click Excel Export",       tag:"Export Engine", desc:"Generate 33-column flat cohort registries or 5-sheet clinical dossiers in under one second — ready for hospital rounds, case reviews, and audits." },
              { icon:<Clock size={24}/>,          col:"#dbeafe", icol:"#1d4ed8", title:"60-Second Patient Check-In", tag:"Patient App",   desc:"Bilingual (English/Hindi) companion app designed for elderly patients with high-contrast inputs, 1-tap daily logging, and offline capability." },
              { icon:<Shield size={24}/>,         col:"#fee2e2", icol:"#dc2626", title:"Emergency Alert Engine",     tag:"Safety",        desc:"Instant doctor notifications when SpO₂ drops below protocol thresholds. With direct 112 Emergency call buttons built into the patient app." },
              { icon:<Users size={24}/>,          col:"#fdf4ff", icol:"#9333ea", title:"Multi-Doctor Cohort Mgmt",   tag:"Enterprise",    desc:"Clinic registration, bulk patient onboarding, per-doctor patient assignment, and institution-level admin dashboard with full audit logs." },
            ] as const).map((f, i) => (
              <div key={i} className={styles.featCard}>
                <div className={styles.featIconWrap} style={{background:f.col,color:f.icol}}>{f.icon}</div>
                <div className={styles.featTag}>{f.tag}</div>
                <h3 className={styles.featTitle}>{f.title}</h3>
                <p className={styles.featDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROGRAMS ═══ */}
      <section id="programs" className={styles.programs}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionPillCenter}>Specialized Programs</div>
          <h2 className={styles.sectionHeadingCenter}>
            5 Disease-Specific<br />
            <span className={styles.gradText}>Clinical Pathways</span>
          </h2>
          <p className={styles.sectionSub}>Built strictly on global pulmonology guidelines with customized scoring algorithms for each condition.</p>
          <div className={styles.programGrid}>
            {([
              { emoji:"🫁",  color:"#0ea5e9", bg:"#f0f9ff", title:"Asthma Control",          protocol:"GINA Protocol",       items:["ACT scoring (4-question daily)","Night-waking & reliever alerts","Trigger avoidance guidance","Canister usage tracking"] },
              { emoji:"🌬️", color:"#3b82f6", bg:"#eff6ff", title:"COPD Management",          protocol:"GOLD Guidelines",     items:["Target SpO₂ 88–92% monitoring","mMRC dyspnea grading","Cough frequency index","BiPAP compliance tracking"] },
              { emoji:"🔬", color:"#8b5cf6", bg:"#f5f3ff", title:"ILD & Pulmonary Fibrosis", protocol:"ATS/ERS Framework",   items:["K-BILD QoL survey (Q1–Q15)","Longitudinal PFT tracking","Rapid desaturation warnings","6MWT progress monitoring"] },
              { emoji:"🛡️", color:"#f59e0b", bg:"#fffbeb", title:"Bronchiectasis",           protocol:"Infection Surveillance",items:["Murray sputum color index","Acute infection screening","Fever >38°C alerts","Airway clearance tracking"] },
              { emoji:"🏥", color:"#10b981", bg:"#f0fdf4", title:"Post-ICU Recovery",        protocol:"Post-Critical Care",  items:["90-day milestone tracking","Daily vitals trajectory","Emergency trigger warnings","Day-since-discharge counter"] },
            ] as const).map((p, i) => (
              <div key={i} className={styles.programCard}>
                <div className={styles.programEmoji}>{p.emoji}</div>
                <div className={styles.programProtocol} style={{color:p.color,background:p.bg}}>{p.protocol}</div>
                <h3 className={styles.programTitle}>{p.title}</h3>
                <ul className={styles.programList}>
                  {p.items.map((item, j) => (
                    <li key={j} className={styles.programItem}>
                      <span className={styles.programDot} style={{background:p.color}}/>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className={styles.proof}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionPillLight}>Clinical Impact</div>
          <h2 className={styles.sectionHeadingLight}>
            Designed for the Way<br />
            <span className={styles.gradTextLight}>Pulmonologists Actually Work</span>
          </h2>
          <div className={styles.proofGrid}>
            {([
              { icon:<Zap size={32}/>,            stat:"< 5 min",   color:"#fbbf24", desc:"To review entire 30-patient cohort using the clinical workstation" },
              { icon:<Activity size={32}/>,       stat:"Real-time", color:"#34d399", desc:"SpO₂, risk score, and alert propagation from patient app to doctor dashboard" },
              { icon:<FileSpreadsheet size={32}/>,stat:"1 click",   color:"#60a5fa", desc:"Full 33-column patient registry export with all clinical parameters" },
              { icon:<Shield size={32}/>,         stat:"Auto",      color:"#f87171", desc:"Red-flag triage — critical patients always surface without doctor action" },
            ] as const).map((p, i) => (
              <div key={i} className={styles.proofCard}>
                <div style={{color:p.color}}>{p.icon}</div>
                <div className={styles.proofStat} style={{color:p.color}}>{p.stat}</div>
                <p className={styles.proofDesc}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section id="contact" className={styles.contact}>
        <div className={styles.sectionInner}>
          <div className={styles.contactGrid}>
            <div className={styles.contactLeft}>
              <div className={styles.sectionPill}>Get In Touch</div>
              <h2 className={styles.sectionHeading}>
                Ready to Transform<br />
                <span className={styles.gradText}>Your Respiratory Practice?</span>
              </h2>
              <p className={styles.bodyText}>
                Whether you&apos;re a solo pulmonologist, a multi-doctor clinic, or a large
                hospital department — O2Plus scales to your needs. Reach out and our
                clinical onboarding team will walk you through a personalized setup.
              </p>
              <div className={styles.contactCards}>
                <div className={styles.contactCard}>
                  <div className={styles.contactCardIcon}><Mail size={20}/></div>
                  <div><div className={styles.contactCardLabel}>Email</div><div className={styles.contactCardValue}>support@o2plus.app</div></div>
                </div>
                <div className={styles.contactCard}>
                  <div className={styles.contactCardIcon}><Phone size={20}/></div>
                  <div><div className={styles.contactCardLabel}>Clinical Support</div><div className={styles.contactCardValue}>Available on registration</div></div>
                </div>
                <div className={styles.contactCard}>
                  <div className={styles.contactCardIcon}><MapPin size={20}/></div>
                  <div><div className={styles.contactCardLabel}>Platform</div><div className={styles.contactCardValue}>Web + Mobile (iOS &amp; Android)</div></div>
                </div>
              </div>
            </div>

            <div className={styles.contactRight}>
              <div className={styles.contactForm}>
                <h3 className={styles.formTitle}>Register Your Practice</h3>
                <p className={styles.formSub}>Takes less than 2 minutes. Instant access.</p>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <div className={styles.formInput}>Dr. Your Name</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address</label>
                  <div className={styles.formInput}>doctor@hospital.com</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Specialty</label>
                  <div className={styles.formInput}>Pulmonology / Respiratory Medicine</div>
                </div>
                <Link href="/register" className={styles.formSubmit}>
                  Get Started Free <ArrowRight size={16} />
                </Link>
                <p className={styles.formNote}>
                  By registering, you get full access to the Doctor Workstation and can onboard patients immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <div className={styles.footerBrandOrb}><Activity size={16} strokeWidth={2.5}/></div>
              <span className={styles.footerBrandName}>O2Plus</span>
            </div>
            <p className={styles.footerTagline}>Precision Respiratory Care — Between Hospital Visits</p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Platform</div>
              <Link href="/login"         className={styles.footerLink}>Doctor Portal</Link>
              <Link href="/patient/login" className={styles.footerLink}>Patient Portal</Link>
              <Link href="/register"      className={styles.footerLink}>Register Clinic</Link>
              <Link href="/admin/login"   className={styles.footerLink}>Admin</Link>
            </div>
            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Clinical Programs</div>
              <span className={styles.footerLink}>Asthma Control (GINA)</span>
              <span className={styles.footerLink}>COPD Management (GOLD)</span>
              <span className={styles.footerLink}>ILD &amp; Fibrosis (ATS/ERS)</span>
              <span className={styles.footerLink}>Bronchiectasis</span>
              <span className={styles.footerLink}>Post-ICU Recovery</span>
            </div>
            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Quick Access</div>
              <a href="#about"    className={styles.footerLink}>About O2Plus</a>
              <a href="#features" className={styles.footerLink}>Features</a>
              <a href="#programs" className={styles.footerLink}>Programs</a>
              <a href="#contact"  className={styles.footerLink}>Contact</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerDisclaimer}>
              O2Plus is a clinical decision support and remote patient monitoring platform designed for licensed healthcare practitioners and enrolled patients.
              In medical emergencies, patients must immediately contact emergency services (112) or visit the nearest emergency department.
            </p>
            <p className={styles.footerCopy}>© 2025 O2Plus. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
