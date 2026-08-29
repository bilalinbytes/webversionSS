"use client";

import React, { useState, useRef } from "react";
import {
  Wind,
  ShieldCheck,
  Activity,
  Pill,
  Droplets,
  HeartPulse,
  TrendingUp,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { normalizeDashboard } from "@o2plus/core";

export type CarePathwayType =
  | "asthma"
  | "copd"
  | "ild"
  | "bronchiectasis"
  | "post_icu"
  | "bronchiolitis_obliterans";

export interface DiseaseHero3DVisualProps {
  diagnosis: string | null;
  effectiveDashboard?: string | null;
  hasTodayLog?: boolean;
  spo2Today?: number;
  mmrcToday?: number;
  aqiToday?: number;
  onLogToday: () => void;
}

/**
 * Resolves the visual Care Pathway configuration from the patient's actual
 * diagnosis string and effective dashboard.
 *
 * Ensures patients with "OAD / Bronchiolitis Obliterans" or other OAD subtypes
 * see their clinically appropriate pathway and diagnosis without incorrect generic mapping.
 */
export function resolveCarePathwayType(
  diagnosis?: string | null,
  effectiveDashboard?: string | null,
): CarePathwayType {
  const diagLower = (diagnosis ?? "").toLowerCase().trim();
  const dbLower = (effectiveDashboard ?? "").toLowerCase().trim();

  // 1. Explicit Bronchiolitis Obliterans check
  if (diagLower.includes("bronchiolitis")) {
    return "bronchiolitis_obliterans";
  }

  // 2. Asthma-COPD Overlap (ACO) -> COPD Care Pathway
  if (
    diagLower.includes("overlap") ||
    diagLower.includes("aco") ||
    (diagLower.includes("asthma") && diagLower.includes("copd"))
  ) {
    return "copd";
  }

  // 3. Diagnosis text string pattern matching
  if (diagLower.includes("bronchiectasis")) return "bronchiectasis";
  if (
    diagLower.includes("ild") ||
    diagLower.includes("interstitial") ||
    diagLower.includes("fibrosis") ||
    diagLower.includes("ipf")
  ) {
    return "ild";
  }
  if (
    diagLower.includes("post_icu") ||
    diagLower.includes("post icu") ||
    diagLower.includes("post-icu")
  ) {
    return "post_icu";
  }
  if (
    (diagLower.startsWith("oad /") || diagLower.startsWith("oad/")) &&
    diagLower.includes("asthma")
  ) {
    return "asthma";
  }
  if (diagLower.includes("asthma") && !diagLower.includes("copd")) return "asthma";
  if (diagLower.includes("copd") || diagLower.startsWith("oad")) return "copd";

  // 4. Fall back to effectiveDashboard column
  if (dbLower === "copd") return "copd";
  if (dbLower === "ild") return "ild";
  if (dbLower === "bronchiectasis") return "bronchiectasis";
  if (dbLower === "post_icu") return "post_icu";
  if (dbLower === "asthma") return "asthma";

  // 5. Fallback through core normalizer
  const normalized = normalizeDashboard(diagnosis, effectiveDashboard);
  if (normalized === "copd") return "copd";
  if (normalized === "ild") return "ild";
  if (normalized === "bronchiectasis") return "bronchiectasis";
  if (normalized === "post_icu") return "post_icu";

  return "asthma";
}

export function DiseaseHero3DVisual({
  diagnosis,
  effectiveDashboard,
  hasTodayLog,
  spo2Today = 0,
  mmrcToday = 0,
  aqiToday = 0,
  onLogToday,
}: DiseaseHero3DVisualProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve active disease pathway configuration
  const pathwayKey = resolveCarePathwayType(diagnosis, effectiveDashboard);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateY((x / rect.width) * 12); // max 6 deg
    setRotateX((-y / rect.height) * 8); // max 4 deg
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  // Disease-specific educational content configuration
  const diseaseConfig = {
    asthma: {
      theme: {
        bg: "linear-gradient(135deg, #071c33 0%, #0c2b4c 50%, #06182a 100%)",
        accent: "#38bdf8",
        glow: "rgba(56, 189, 248, 0.25)",
        badgeBg: "rgba(56, 189, 248, 0.15)",
        badgeBorder: "rgba(56, 189, 248, 0.35)",
        badgeText: "#38bdf8",
        cardBg: "rgba(255, 255, 255, 0.95)",
      },
      headline: "Breathe Easy. Live Better.",
      subtitle: "Follow your daily plan, shield against triggers, and keep your airways open.",
      badge: "ASTHMA CARE PATHWAY",
      statusBadge: "Airways Open & Stable",
      actionGuideTitle: "Today's Helpful Actions",
      actions: [
        {
          icon: Wind,
          title: "Use prescribed inhaler correctly",
          desc: "Inhale slowly and deeply, hold breath for 5–10s for full drug delivery.",
        },
        {
          icon: ShieldCheck,
          title: "Avoid known triggers such as dust/smoke",
          desc: "Avoid dust, cold drafts, and high-AQI smoke exposure today.",
        },
        {
          icon: Activity,
          title: "Monitor peak flow if part of care plan",
          desc: "Log your morning blow to verify open, inflammation-free airways.",
        },
        {
          icon: Sparkles,
          title: "Track symptoms & follow action plan",
          desc: "If chest tightness or wheeze increases, follow prescribed reliever steps.",
        },
      ],
    },
    copd: {
      theme: {
        bg: "linear-gradient(135deg, #042427 0%, #0b3c3b 50%, #061d20 100%)",
        accent: "#2dd4bf",
        glow: "rgba(45, 212, 191, 0.25)",
        badgeBg: "rgba(45, 212, 191, 0.15)",
        badgeBorder: "rgba(45, 212, 191, 0.35)",
        badgeText: "#2dd4bf",
        cardBg: "rgba(255, 255, 255, 0.95)",
      },
      headline: "Conserve Stamina. Clear Airways.",
      subtitle: "Practice pursed-lip breathing, maintain inhaler schedule, and pace daily activities.",
      badge: "COPD CARE PATHWAY",
      statusBadge: "Airflow Paced & Protected",
      actionGuideTitle: "Today's Helpful Actions",
      actions: [
        {
          icon: Pill,
          title: "Take prescribed COPD medicines as directed",
          desc: "Take morning and evening maintenance doses consistently on schedule.",
        },
        {
          icon: Wind,
          title: "Practice prescribed breathing techniques",
          desc: "Inhale through nose for 2s, exhale slowly through pursed lips for 4s.",
        },
        {
          icon: ShieldCheck,
          title: "Avoid smoking and polluted air",
          desc: "Shield lungs from active/passive smoke, biomass fumes, and poor air quality.",
        },
        {
          icon: HeartPulse,
          title: "Monitor SpO₂ and breathlessness",
          desc: "Check oxygen levels at rest and maintain your prescribed target range (88–92%).",
        },
        {
          icon: Activity,
          title: "Maintain appropriate physical activity",
          desc: "Take short, gentle walking breaks with seated rest intervals to save stamina.",
        },
      ],
    },
    ild: {
      theme: {
        bg: "linear-gradient(135deg, #101633 0%, #1c2352 50%, #0a0e24 100%)",
        accent: "#818cf8",
        glow: "rgba(129, 140, 248, 0.25)",
        badgeBg: "rgba(129, 140, 248, 0.15)",
        badgeBorder: "rgba(129, 140, 248, 0.35)",
        badgeText: "#818cf8",
        cardBg: "rgba(255, 255, 255, 0.95)",
      },
      headline: "Protect Lung Volume. Pace Exertion.",
      subtitle: "Practice diaphragmatic expansion, monitor oxygen during exertion, and adhere to therapy.",
      badge: "ILD CARE PATHWAY",
      statusBadge: "Gas Exchange Monitored",
      actionGuideTitle: "Today's Helpful Actions",
      actions: [
        {
          icon: Pill,
          title: "Follow the prescribed treatment plan",
          desc: "Take prescribed antifibrotic and anti-inflammatory medications with meals as directed.",
        },
        {
          icon: HeartPulse,
          title: "Monitor oxygen levels as instructed",
          desc: "Check SpO₂ before and after climbing stairs or exertion, maintaining flow rates.",
        },
        {
          icon: Activity,
          title: "Track breathlessness & activity tolerance",
          desc: "Pause and recover immediately if breathing effort increases during daily chores.",
        },
        {
          icon: Wind,
          title: "Complete prescribed breathing exercises",
          desc: "Practice diaphragmatic expansion to optimize lower-lung oxygen distribution.",
        },
        {
          icon: ShieldCheck,
          title: "Keep scheduled clinical follow-ups",
          desc: "Stay on track with regular PFT tests, 6-minute walks, and clinic reviews.",
        },
      ],
    },
    bronchiectasis: {
      theme: {
        bg: "linear-gradient(135deg, #052119 0%, #0d382c 50%, #041712 100%)",
        accent: "#34d399",
        glow: "rgba(52, 211, 153, 0.25)",
        badgeBg: "rgba(52, 211, 153, 0.15)",
        badgeBorder: "rgba(52, 211, 153, 0.35)",
        badgeText: "#34d399",
        cardBg: "rgba(255, 255, 255, 0.95)",
      },
      headline: "Clear Airways. Stay Ahead.",
      subtitle: "Perform your daily airway clearance routine, stay hydrated, and monitor sputum baseline.",
      badge: "BRONCHIECTASIS CARE PATHWAY",
      statusBadge: "Airways Cleared & Hydrated",
      actionGuideTitle: "Today's Helpful Actions",
      actions: [
        {
          icon: Wind,
          title: "Follow prescribed airway-clearance techniques",
          desc: "Perform your daily huff coughing / PEP device routine to clear mucus.",
        },
        {
          icon: Droplets,
          title: "Stay adequately hydrated where appropriate",
          desc: "Drink 6–8 glasses of water daily to keep bronchial mucus thin and easy to clear.",
        },
        {
          icon: Activity,
          title: "Track changes in cough and sputum",
          desc: "Note any change in sputum volume, color, or thickness in daily logs.",
        },
        {
          icon: AlertTriangle,
          title: "Record/report hemoptysis per doctor's instructions",
          desc: "Promptly record and report any blood streaks according to your care plan.",
        },
        {
          icon: Pill,
          title: "Take prescribed medications consistently",
          desc: "Take prescribed inhalers, nebulizers, or scheduled therapies consistently.",
        },
      ],
    },
    post_icu: {
      theme: {
        bg: "linear-gradient(135deg, #1e1308 0%, #3d240d 50%, #140d05 100%)",
        accent: "#fbbf24",
        glow: "rgba(251, 191, 36, 0.25)",
        badgeBg: "rgba(251, 191, 36, 0.15)",
        badgeBorder: "rgba(251, 191, 36, 0.35)",
        badgeText: "#fbbf24",
        cardBg: "rgba(255, 255, 255, 0.95)",
      },
      headline: "Rebuild Strength. Restore Breathing.",
      subtitle: "Progress through your rehabilitation milestones, manage fatigue, and regain vitality.",
      badge: "POST-ICU RECOVERY PATHWAY",
      statusBadge: "Rehabilitation in Progress",
      actionGuideTitle: "Today's Helpful Actions",
      actions: [
        {
          icon: Activity,
          title: "Follow the prescribed rehabilitation plan",
          desc: "Complete structured physical rehabilitation exercises guided by your care team.",
        },
        {
          icon: Wind,
          title: "Practice prescribed breathing exercises",
          desc: "Practice deep lung inspiratory expansion exercises 3 times daily.",
        },
        {
          icon: TrendingUp,
          title: "Gradually increase activity as advised",
          desc: "Complete gentle walking or chair-stand routines without causing exhaustion.",
        },
        {
          icon: HeartPulse,
          title: "Monitor fatigue and breathlessness",
          desc: "Balance daily activities with restorative rest breaks to manage fatigue.",
        },
        {
          icon: Sparkles,
          title: "Maintain adequate nutrition & hydration",
          desc: "Prioritize wholesome protein intake and hydration to accelerate muscle repair.",
        },
      ],
    },
    bronchiolitis_obliterans: {
      theme: {
        bg: "linear-gradient(135deg, #07222c 0%, #0e3a47 50%, #061922 100%)",
        accent: "#22d3ee",
        glow: "rgba(34, 211, 238, 0.25)",
        badgeBg: "rgba(34, 211, 238, 0.15)",
        badgeBorder: "rgba(34, 211, 238, 0.35)",
        badgeText: "#22d3ee",
        cardBg: "rgba(255, 255, 255, 0.95)",
      },
      headline: "Protect Small Airways. Breathe Steady.",
      subtitle: "Follow your prescribed regimen, shield small airways from irritants, and pace daily activities.",
      badge: "BRONCHIOLITIS OBLITERANS CARE PATHWAY",
      statusBadge: "Small Airways Shielded & Monitored",
      actionGuideTitle: "Today's Helpful Actions",
      actions: [
        {
          icon: Pill,
          title: "Take prescribed medicines & inhalers as directed",
          desc: "Inhale slowly and use prescribed nebulizers or inhalers consistently on schedule.",
        },
        {
          icon: ShieldCheck,
          title: "Shield against environmental irritants",
          desc: "Avoid dust, toxic fumes, harsh chemicals, cold drafts, and polluted air.",
        },
        {
          icon: Activity,
          title: "Monitor symptoms & peak flow if advised",
          desc: "Track daily breathlessness, cough, and exertion tolerance in your log.",
        },
        {
          icon: Sparkles,
          title: "Follow your doctor's action plan",
          desc: "Contact your pulmonologist promptly if breathing difficulty increases.",
        },
      ],
    },
  };

  const current = diseaseConfig[pathwayKey] || diseaseConfig.asthma;
  const theme = current.theme;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "1.25rem",
        overflow: "hidden",
        background: theme.bg,
        border: `1px solid ${theme.badgeBorder}`,
        boxShadow: "0 20px 48px rgba(7, 22, 44, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        perspective: "1200px",
        userSelect: "none",
        color: "#ffffff",
      }}
    >
      <style>{`
        @keyframes subtleBreathingLoop {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.035); opacity: 1; }
        }
        @keyframes mistAerosolPuff {
          0% { stroke-dashoffset: 60; opacity: 0; transform: translateY(0); }
          30% { opacity: 0.9; }
          80% { opacity: 0.6; }
          100% { stroke-dashoffset: 0; opacity: 0; transform: translateY(-8px); }
        }
        @keyframes mucusClearanceFlow {
          0% { stroke-dashoffset: 100; opacity: 0.3; }
          50% { opacity: 0.9; }
          100% { stroke-dashoffset: 0; opacity: 0.3; }
        }
        @keyframes rehabMilestonePulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 12px ${theme.accent}); }
        }
        @keyframes floatingActionCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @media (max-width: 640px) {
          .diseaseHeroGrid {
            grid-template-columns: 1fr !important;
            padding: 16px 14px !important;
            gap: 16px !important;
          }
          .diseaseHeroHeadline {
            font-size: 1.35rem !important;
          }
          .diseaseHeroHeader {
            padding: 10px 14px !important;
          }
        }
      `}</style>

      {/* Top Header Strip */}
      <div
        className="diseaseHeroHeader"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "rgba(4, 16, 33, 0.6)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: theme.accent,
              boxShadow: `0 0 10px ${theme.accent}`,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#f0f9ff",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            {current.badge}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: theme.badgeText,
              background: theme.badgeBg,
              border: `1px solid ${theme.badgeBorder}`,
              padding: "3px 10px",
              borderRadius: 999,
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            ✓ {current.statusBadge}
          </span>
        </div>
      </div>

      {/* Main 3-Column Educational Banner Grid */}
      <div
        className="diseaseHeroGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: 20,
          padding: "20px 24px",
          alignItems: "center",
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* ─── COLUMN 1: MOTIVATIONAL & CLINICAL SUMMARY ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "#ffffff",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {current.headline}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.92rem",
              color: "#cbd5e1",
              lineHeight: 1.55,
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            {current.subtitle}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onLogToday}
              style={{
                padding: "9px 18px",
                borderRadius: "0.75rem",
                background: hasTodayLog
                  ? "rgba(255, 255, 255, 0.15)"
                  : `linear-gradient(135deg, ${theme.accent} 0%, #0284c7 100%)`,
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 700,
                border: `1px solid ${hasTodayLog ? "rgba(255,255,255,0.2)" : theme.accent}`,
                cursor: "pointer",
                boxShadow: hasTodayLog ? "none" : `0 4px 14px ${theme.glow}`,
                transition: "all 0.15s ease",
              }}
            >
              {hasTodayLog ? "✓ Today's Log Recorded" : "+ Log Today's Vitals"}
            </button>
          </div>
        </div>

        {/* ─── COLUMN 2: 3D ANIMATED ACTION DEMONSTRATION ─── */}
        <div
          style={{
            position: "relative",
            minHeight: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "translateZ(30px)",
          }}
        >
          {/* 1. ASTHMA 3D ACTION: Inhaler Mist & Trigger Shielding */}
          {pathwayKey === "asthma" && (
            <svg viewBox="0 0 320 250" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxHeight: 240, overflow: "visible" }}>
              <defs>
                <filter id="asthmaGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="asthmaLungFill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.15" />
                </radialGradient>
              </defs>

              {/* Protective Shield Outer Ring */}
              <circle cx="160" cy="125" r="100" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
              <circle cx="160" cy="125" r="88" fill="#0284c7" opacity="0.08" filter="url(#asthmaGlow)" />

              {/* 3D Breathing Lungs */}
              <g style={{ animation: "subtleBreathingLoop 4s ease-in-out infinite", transformOrigin: "160px 125px" }}>
                {/* Right Lobe */}
                <path d="M 148 55 C 132 55, 110 75, 102 105 C 94 135, 98 170, 118 185 C 132 195, 145 185, 152 162 C 158 145, 158 95, 154 70 Z" fill="url(#asthmaLungFill)" stroke="#38bdf8" strokeWidth="2" filter="url(#asthmaGlow)" />
                {/* Left Lobe */}
                <path d="M 172 55 C 188 55, 210 75, 218 105 C 226 135, 222 170, 202 185 C 188 195, 175 185, 168 162 C 162 145, 162 95, 166 70 Z" fill="url(#asthmaLungFill)" stroke="#38bdf8" strokeWidth="2" filter="url(#asthmaGlow)" />
                {/* Trachea */}
                <path d="M 156 25 L 164 25 L 164 65 L 156 65 Z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" />
                {/* Open Dilated Bronchi */}
                <path d="M 158 65 C 148 75, 134 90, 126 115" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 162 65 C 172 75, 186 90, 194 115" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* 3D Smart Inhaler (Top-Left Corner delivering aerosol) */}
              <g transform="translate(45, 30)">
                <rect x="0" y="0" width="34" height="60" rx="8" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.8" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.3))" />
                <rect x="6" y="6" width="22" height="14" rx="4" fill="#0284c7" />
                <rect x="8" y="42" width="28" height="14" rx="4" fill="#38bdf8" />
                {/* Aerosol Mist Streams into Lungs */}
                <path d="M 36 50 Q 80 50, 135 60" stroke="#00f0ff" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" style={{ animation: "mistAerosolPuff 2.5s ease-in-out infinite" }} />
                <path d="M 36 50 Q 85 65, 140 75" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" style={{ animation: "mistAerosolPuff 2.5s ease-in-out infinite 0.2s" }} />
              </g>

              {/* Deflected Trigger Icons */}
              <g transform="translate(245, 60)">
                <circle cx="16" cy="16" r="16" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="1.2" />
                <text x="16" y="21" fill="#fca5a5" fontSize="11" fontWeight="700" textAnchor="middle">Dust</text>
                <path d="M 0 16 Q -15 10, -25 2" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
              </g>

              {/* Peak Flow Badge */}
              <g transform="translate(100, 210)">
                <rect x="0" y="0" width="120" height="26" rx="13" fill="#0c2b4c" stroke="#38bdf8" strokeWidth="1" />
                <text x="60" y="17" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">PEFR: 410 L/min (Good)</text>
              </g>
            </svg>
          )}

          {/* 2. COPD 3D ACTION: Pursed-Lip Breathing & Streamlined Airflow */}
          {pathwayKey === "copd" && (
            <svg viewBox="0 0 320 250" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxHeight: 240, overflow: "visible" }}>
              <defs>
                <filter id="copdGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="copdLungFill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#ccfbf1" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0.15" />
                </radialGradient>
              </defs>

              <circle cx="160" cy="125" r="95" fill="#0d9488" opacity="0.08" filter="url(#copdGlow)" />

              {/* Pursed-Lip Continuous Airflow Ribbon */}
              <g style={{ animation: "subtleBreathingLoop 4.5s ease-in-out infinite", transformOrigin: "160px 125px" }}>
                <path d="M 148 55 C 132 55, 110 75, 102 105 C 94 135, 98 170, 118 185 C 132 195, 145 185, 152 162 C 158 145, 158 95, 154 70 Z" fill="url(#copdLungFill)" stroke="#2dd4bf" strokeWidth="2" filter="url(#copdGlow)" />
                <path d="M 172 55 C 188 55, 210 75, 218 105 C 226 135, 222 170, 202 185 C 188 195, 175 185, 168 162 C 162 145, 162 95, 166 70 Z" fill="url(#copdLungFill)" stroke="#2dd4bf" strokeWidth="2" filter="url(#copdGlow)" />
                <path d="M 156 25 L 164 25 L 164 65 L 156 65 Z" fill="#ffffff" stroke="#2dd4bf" strokeWidth="1.5" />

                {/* Exhalation Airflow Streams (Pursed-Lip Concept) */}
                <path d="M 160 30 Q 160 5, 210 10" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 6" style={{ animation: "mistAerosolPuff 3s linear infinite" }} />
                <path d="M 160 30 Q 160 5, 110 10" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 6" style={{ animation: "mistAerosolPuff 3s linear infinite 0.3s" }} />
              </g>

              {/* Target SpO2 Band Badge */}
              <g transform="translate(35, 75)">
                <rect x="0" y="0" width="90" height="42" rx="10" fill="#042427" stroke="#2dd4bf" strokeWidth="1" />
                <text x="45" y="18" fill="#99f6e4" fontSize="10" fontWeight="600" textAnchor="middle">Target SpO₂</text>
                <text x="45" y="34" fill="#ffffff" fontSize="13" fontWeight="800" textAnchor="middle">88 – 92%</text>
              </g>

              {/* Pacing Badge */}
              <g transform="translate(195, 75)">
                <rect x="0" y="0" width="90" height="42" rx="10" fill="#042427" stroke="#2dd4bf" strokeWidth="1" />
                <text x="45" y="18" fill="#99f6e4" fontSize="10" fontWeight="600" textAnchor="middle">Breathing Pace</text>
                <text x="45" y="34" fill="#ffffff" fontSize="12" fontWeight="800" textAnchor="middle">In: 2s · Out: 4s</text>
              </g>
            </svg>
          )}

          {/* 3. ILD 3D ACTION: Diaphragmatic Breathing & Gas Diffusion */}
          {pathwayKey === "ild" && (
            <svg viewBox="0 0 320 250" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxHeight: 240, overflow: "visible" }}>
              <defs>
                <filter id="ildGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="ildLungFill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#818cf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#3730a3" stopOpacity="0.15" />
                </radialGradient>
              </defs>

              <circle cx="160" cy="125" r="95" fill="#4f46e5" opacity="0.1" filter="url(#ildGlow)" />

              {/* Lungs with Delicate Interstitial Grid */}
              <g style={{ animation: "subtleBreathingLoop 5s ease-in-out infinite", transformOrigin: "160px 125px" }}>
                <path d="M 148 55 C 132 55, 110 75, 102 105 C 94 135, 98 170, 118 185 C 132 195, 145 185, 152 162 C 158 145, 158 95, 154 70 Z" fill="url(#ildLungFill)" stroke="#818cf8" strokeWidth="2" filter="url(#ildGlow)" />
                <path d="M 172 55 C 188 55, 210 75, 218 105 C 226 135, 222 170, 202 185 C 188 195, 175 185, 168 162 C 162 145, 162 95, 166 70 Z" fill="url(#ildLungFill)" stroke="#818cf8" strokeWidth="2" filter="url(#ildGlow)" />
                <path d="M 156 25 L 164 25 L 164 65 L 156 65 Z" fill="#ffffff" stroke="#818cf8" strokeWidth="1.5" />

                {/* Subpleural Reticular Diffusion Mesh (Reassuring, non-frightening) */}
                <path d="M 115 130 L 125 145 L 118 160" stroke="#c7d2fe" strokeWidth="1.2" strokeDasharray="3 2" />
                <path d="M 205 130 L 195 145 L 202 160" stroke="#c7d2fe" strokeWidth="1.2" strokeDasharray="3 2" />
              </g>

              {/* Diaphragm Expansion Arc */}
              <path d="M 100 200 Q 160 220, 220 200" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" style={{ animation: "subtleBreathingLoop 5s ease-in-out infinite", transformOrigin: "160px 200px" }} />
              <text x="160" y="235" fill="#c7d2fe" fontSize="11" fontWeight="700" textAnchor="middle">Diaphragmatic Expansion</text>
            </svg>
          )}

          {/* 4. BRONCHIECTASIS 3D ACTION: Airway Clearance & Mucus Mobilization */}
          {pathwayKey === "bronchiectasis" && (
            <svg viewBox="0 0 320 250" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxHeight: 240, overflow: "visible" }}>
              <defs>
                <filter id="bronchGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="bronchLungFill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#34d399" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#065f46" stopOpacity="0.15" />
                </radialGradient>
              </defs>

              <circle cx="160" cy="125" r="95" fill="#059669" opacity="0.1" filter="url(#bronchGlow)" />

              {/* Bronchial Tree with Upward Drainage Waves */}
              <g style={{ animation: "subtleBreathingLoop 4s ease-in-out infinite", transformOrigin: "160px 125px" }}>
                <path d="M 148 55 C 132 55, 110 75, 102 105 C 94 135, 98 170, 118 185 C 132 195, 145 185, 152 162 C 158 145, 158 95, 154 70 Z" fill="url(#bronchLungFill)" stroke="#34d399" strokeWidth="2" filter="url(#bronchGlow)" />
                <path d="M 172 55 C 188 55, 210 75, 218 105 C 226 135, 222 170, 202 185 C 188 195, 175 185, 168 162 C 162 145, 162 95, 166 70 Z" fill="url(#bronchLungFill)" stroke="#34d399" strokeWidth="2" filter="url(#bronchGlow)" />
                <path d="M 156 25 L 164 25 L 164 65 L 156 65 Z" fill="#ffffff" stroke="#34d399" strokeWidth="1.5" />

                {/* Upward Mucus Clearance Stream */}
                <path d="M 125 150 C 135 120, 150 90, 160 50" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 6" style={{ animation: "mucusClearanceFlow 2.8s linear infinite" }} />
                <path d="M 195 150 C 185 120, 170 90, 160 50" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 6" style={{ animation: "mucusClearanceFlow 2.8s linear infinite 0.4s" }} />
              </g>

              {/* Clearance Technique Badge */}
              <g transform="translate(85, 210)">
                <rect x="0" y="0" width="150" height="26" rx="13" fill="#042119" stroke="#34d399" strokeWidth="1" />
                <text x="75" y="17" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">Airway Drainage Active</text>
              </g>
            </svg>
          )}

          {/* 5. POST-ICU 3D ACTION: Progressive Rehabilitation Milestones */}
          {pathwayKey === "post_icu" && (
            <svg viewBox="0 0 320 250" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxHeight: 240, overflow: "visible" }}>
              <defs>
                <filter id="postIcuGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="postIcuLungFill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.15" />
                </radialGradient>
              </defs>

              <circle cx="160" cy="125" r="95" fill="#d97706" opacity="0.1" filter="url(#postIcuGlow)" />

              {/* Recovering Lungs with Vitality Rings */}
              <g style={{ animation: "subtleBreathingLoop 4s ease-in-out infinite", transformOrigin: "160px 125px" }}>
                <path d="M 148 55 C 132 55, 110 75, 102 105 C 94 135, 98 170, 118 185 C 132 195, 145 185, 152 162 C 158 145, 158 95, 154 70 Z" fill="url(#postIcuLungFill)" stroke="#fbbf24" strokeWidth="2" filter="url(#postIcuGlow)" />
                <path d="M 172 55 C 188 55, 210 75, 218 105 C 226 135, 222 170, 202 185 C 188 195, 175 185, 168 162 C 162 145, 162 95, 166 70 Z" fill="url(#postIcuLungFill)" stroke="#fbbf24" strokeWidth="2" filter="url(#postIcuGlow)" />
                <path d="M 156 25 L 164 25 L 164 65 L 156 65 Z" fill="#ffffff" stroke="#fbbf24" strokeWidth="1.5" />
              </g>

              {/* Rehabilitation Milestone Progress Ring */}
              <g transform="translate(60, 205)">
                <rect x="0" y="0" width="200" height="30" rx="15" fill="#1e1308" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="100" y="20" fill="#fde68a" fontSize="11" fontWeight="700" textAnchor="middle">Rehab Step 2: Active Mobility</text>
              </g>
            </svg>
          )}

          {/* 6. BRONCHIOLITIS OBLITERANS 3D ACTION: Small Airways Protection & Irritant Barrier */}
          {pathwayKey === "bronchiolitis_obliterans" && (
            <svg viewBox="0 0 320 250" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxHeight: 240, overflow: "visible" }}>
              <defs>
                <filter id="boGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="boLungFill" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#cffafe" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.15" />
                </radialGradient>
              </defs>

              {/* Protective Shield Outer Ring */}
              <circle cx="160" cy="125" r="100" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
              <circle cx="160" cy="125" r="88" fill="#0891b2" opacity="0.08" filter="url(#boGlow)" />

              {/* 3D Breathing Lungs with Small Airway Branching */}
              <g style={{ animation: "subtleBreathingLoop 4.2s ease-in-out infinite", transformOrigin: "160px 125px" }}>
                <path d="M 148 55 C 132 55, 110 75, 102 105 C 94 135, 98 170, 118 185 C 132 195, 145 185, 152 162 C 158 145, 158 95, 154 70 Z" fill="url(#boLungFill)" stroke="#22d3ee" strokeWidth="2" filter="url(#boGlow)" />
                <path d="M 172 55 C 188 55, 210 75, 218 105 C 226 135, 222 170, 202 185 C 188 195, 175 185, 168 162 C 162 145, 162 95, 166 70 Z" fill="url(#boLungFill)" stroke="#22d3ee" strokeWidth="2" filter="url(#boGlow)" />
                <path d="M 156 25 L 164 25 L 164 65 L 156 65 Z" fill="#cffafe" stroke="#22d3ee" strokeWidth="1.5" />

                {/* Bronchiolar Small Airway Arbors */}
                <path d="M 158 65 C 146 78, 130 92, 122 118" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                <path d="M 122 118 Q 112 135, 116 150" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 162 65 C 174 78, 190 92, 198 118" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                <path d="M 198 118 Q 208 135, 204 150" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Irritant Barrier Deflector */}
              <g transform="translate(240, 55)">
                <circle cx="16" cy="16" r="16" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="1.2" />
                <text x="16" y="21" fill="#fca5a5" fontSize="10" fontWeight="700" textAnchor="middle">Fumes</text>
                <path d="M 0 16 Q -15 10, -25 2" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
              </g>

              {/* Status Badge */}
              <g transform="translate(85, 210)">
                <rect x="0" y="0" width="150" height="26" rx="13" fill="#07222c" stroke="#22d3ee" strokeWidth="1" />
                <text x="75" y="17" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">Small Airways Protected</text>
              </g>
            </svg>
          )}
        </div>

        {/* ─── COLUMN 3: TODAY'S HELPFUL ACTIONS GUIDE ─── */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(14px)",
            borderRadius: "1rem",
            padding: "16px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: theme.accent,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              }}
            >
              {current.actionGuideTitle}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Daily Self-Care</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {current.actions.map((act, i) => {
              const ActionIcon = act.icon;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 10px",
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: "0.65rem",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: theme.badgeBg,
                      border: `1px solid ${theme.badgeBorder}`,
                      color: theme.badgeText,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <ActionIcon size={14} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <strong style={{ fontSize: "0.82rem", color: "#f8fafc", fontWeight: 700 }}>
                      {act.title}
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.35 }}>
                      {act.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
