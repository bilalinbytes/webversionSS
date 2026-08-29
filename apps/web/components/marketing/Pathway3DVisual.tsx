"use client";

import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, Wind, Pill, TrendingUp, Stethoscope } from "lucide-react";

export function Pathway3DVisual() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 6;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 2800); // Smooth automatic slide every 2.8 seconds

    return () => clearInterval(timer);
  }, [totalSlides]);

  const slidesData = [
    {
      badge: "Vitals & Telemetry",
      title: "Daily Symptoms & Lung Telemetry",
      subtitle: "Log daily SpO₂, pulse rate, breathlessness & cough with instant synchronization.",
      icon: Activity,
    },
    {
      badge: "Autonomous Triage",
      title: "Red-Flag Clinical Triage Engine",
      subtitle: "Silent baseline drops trigger immediate high-acuity alerts for pulmonologist review.",
      icon: ShieldAlert,
    },
    {
      badge: "Environmental Defense",
      title: "Smart AQI & Pollution Defense",
      subtitle: "Real-time PM2.5 / PM10 monitoring warns patients before air pollution peaks.",
      icon: Wind,
    },
    {
      badge: "Medication Adherence",
      title: "Smart Prescription Checklist",
      subtitle: "Time-locked medication doses and inhaler tracking ensure zero missed treatments.",
      icon: Pill,
    },
    {
      badge: "Spirometry & PFT",
      title: "Longitudinal Lung Capacity Analytics",
      subtitle: "Continuous tracking of FEV1, FVC, and DLCO spirometry trends over time.",
      icon: TrendingUp,
    },
    {
      badge: "Doctor Care Loop",
      title: "Direct Pulmonologist Supervision",
      subtitle: "Digital prescriptions, treatment folders, and direct patient instructions.",
      icon: Stethoscope,
    },
  ];

  return (
    <div
      className="pathway3DCard"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 480,
        borderRadius: "1.5rem",
        overflow: "hidden",
        background: "radial-gradient(circle at 65% 45%, #0d2e53 0%, #081d35 45%, #041021 100%)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        boxShadow: "0 24px 60px rgba(4, 16, 33, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        userSelect: "none",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .pathway3DCard {
            min-height: 400px !important;
            border-radius: 1.1rem !important;
          }
          .pathway3DHeader {
            padding: 10px 14px !important;
          }
          .pathway3DBottom {
            padding: 12px 14px !important;
          }
        }
      `}</style>
      {/* Top Telemetry Header */}
      <div
        className="pathway3DHeader"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "rgba(4, 16, 33, 0.75)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          zIndex: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#38bdf8",
              boxShadow: "0 0 12px #38bdf8",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#f0f9ff",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            {slidesData[currentSlide]?.badge}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#38bdf8",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              padding: "2px 9px",
              borderRadius: 999,
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            Feature {currentSlide + 1} of {totalSlides}
          </span>
        </div>
      </div>

      {/* Main 3D Vector SVG Sliding Track Stage (Automatic Sliding, No Arrows) */}
      <div
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            transform: `translateX(-${currentSlide * 100}%)`,
            transition: "transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          {/* ─── SLIDE 1: DAILY VITALS & LUNG TELEMETRY ─── */}
          <div
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            <svg viewBox="0 0 460 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", maxHeight: 420 }}>
              <defs>
                <filter id="glow1" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="lungBg1" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0e3a64" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#08213d" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#041426" stopOpacity="0.4" />
                </radialGradient>
                <linearGradient id="phoneGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#020617" />
                </linearGradient>
              </defs>

              {/* Ambient Back Glow */}
              <circle cx="300" cy="190" r="120" fill="#0284c7" opacity="0.18" filter="url(#glow1)" />

              {/* Energy Laser Lines */}
              <path d="M 125 125 C 175 125, 205 165, 240 175" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" filter="url(#glow1)" />
              <path d="M 125 185 C 165 185, 185 190, 235 190" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" filter="url(#glow1)" />
              <path d="M 125 245 C 175 245, 205 210, 240 205" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" filter="url(#glow1)" />
              <path d="M 300 110 L 300 70" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" filter="url(#glow1)" />
              <path d="M 300 270 L 300 310" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" filter="url(#glow1)" />

              {/* Smartphone */}
              <rect x="25" y="45" width="105" height="270" rx="22" fill="#334155" />
              <rect x="28" y="48" width="99" height="264" rx="19" fill="url(#phoneGrad1)" />
              <rect x="33" y="53" width="89" height="254" rx="16" fill="#e2e8f0" />
              <rect x="60" y="58" width="35" height="4" rx="2" fill="#475569" />

              {/* Tactile Cards */}
              <rect x="40" y="85" width="75" height="45" rx="9" fill="#ffffff" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" />
              <path d="M 50 102 C 55 102, 59 99, 63 99 C 65 99, 66 102, 65 104" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 48 107 C 53 107, 59 107, 63 107" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
              <rect x="70" y="105" width="36" height="4" rx="2" fill="#94a3b8" />

              <rect x="40" y="145" width="75" height="45" rx="9" fill="#ffffff" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" />
              <circle cx="56" cy="162" r="5" stroke="#0284c7" strokeWidth="2" fill="none" />
              <circle cx="64" cy="162" r="1.5" fill="#0284c7" />
              <rect x="70" y="165" width="36" height="4" rx="2" fill="#94a3b8" />

              <rect x="40" y="205" width="75" height="45" rx="9" fill="#ffffff" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" />
              <circle cx="56" cy="222" r="4.5" fill="#0284c7" />
              <path d="M 50 234 C 50 230, 53 228, 56 228 C 59 228, 62 230, 62 234" fill="#0284c7" />
              <rect x="70" y="225" width="36" height="4" rx="2" fill="#94a3b8" />

              {/* Top & Bottom Badges */}
              <circle cx="300" cy="48" r="26" fill="#ffffff" stroke="#38bdf8" strokeWidth="2" />
              <path d="M 292 46 C 296 46, 301 44, 305 44" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 290 51 C 295 51, 303 51, 307 51" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />

              <circle cx="300" cy="332" r="26" fill="#ffffff" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="300" cy="326" r="5" fill="#0284c7" />
              <path d="M 293 340 C 293 336, 296 333, 300 333 C 304 333, 307 336, 307 340" fill="#0284c7" />

              {/* Central Holographic Lungs Pod */}
              <circle cx="300" cy="190" r="76" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
              <circle cx="300" cy="190" r="70" fill="url(#lungBg1)" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="300" cy="190" r="66" stroke="#00f0ff" strokeWidth="1.5" opacity="0.75" />

              {/* Translucent Lungs */}
              <g transform="translate(254, 142)">
                <path d="M 38 18 C 28 18, 16 30, 12 48 C 8 64, 10 82, 22 92 C 30 98, 38 92, 44 80 C 48 70, 48 40, 46 25 Z" fill="#7dd3fc" fillOpacity="0.5" stroke="#38bdf8" strokeWidth="1.6" filter="url(#glow1)" />
                <path d="M 58 18 C 68 18, 80 30, 84 48 C 88 64, 86 82, 74 92 C 66 98, 58 92, 52 80 C 48 70, 48 40, 50 25 Z" fill="#7dd3fc" fillOpacity="0.5" stroke="#38bdf8" strokeWidth="1.6" filter="url(#glow1)" />
                <path d="M 46 2 L 50 2 L 50 28 L 46 28 Z" fill="#ffffff" />
                <path d="M 48 30 C 42 34, 32 44, 26 56" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M 50 30 C 56 34, 66 44, 72 56" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            </svg>
          </div>

          {/* ─── SLIDE 2: AUTONOMOUS RED-FLAG TRIAGE ENGINE ─── */}
          <div
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            <svg viewBox="0 0 460 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", maxHeight: 420 }}>
              <defs>
                <filter id="glowRed" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b1" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#dc2626" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#041426" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Radar Sweep Circles */}
              <circle cx="230" cy="180" r="150" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="1.5" strokeDasharray="8 6" />
              <circle cx="230" cy="180" r="110" stroke="rgba(239, 68, 68, 0.35)" strokeWidth="1.5" />
              <circle cx="230" cy="180" r="70" fill="url(#radarGrad)" stroke="#ef4444" strokeWidth="2" />

              {/* Central Triage Shield */}
              <g transform="translate(195, 140)" filter="url(#glowRed)">
                <path d="M 35 5 L 65 18 C 65 52, 45 72, 35 78 C 25 72, 5 52, 5 18 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
                <path d="M 35 25 L 35 48" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                <circle cx="35" cy="58" r="2.5" fill="#ffffff" />
              </g>

              {/* Floating Telemetry Alert Badges */}
              <g transform="translate(45, 90)">
                <rect x="0" y="0" width="135" height="52" rx="12" fill="#0f2b48" stroke="#ef4444" strokeWidth="1.5" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.4))" />
                <circle cx="22" cy="26" r="6" fill="#ef4444" filter="url(#glowRed)" />
                <text x="36" y="24" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="system-ui">SpO₂: 87% (Drop)</text>
                <text x="36" y="38" fill="#fca5a5" fontSize="10" fontWeight="500" fontFamily="system-ui">Baseline Delta &gt; 3%</text>
              </g>

              <g transform="translate(280, 80)">
                <rect x="0" y="0" width="140" height="52" rx="12" fill="#0f2b48" stroke="#f59e0b" strokeWidth="1.5" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.4))" />
                <circle cx="22" cy="26" r="6" fill="#f59e0b" filter="url(#glowRed)" />
                <text x="36" y="24" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="system-ui">Risk Score: 11 / 15</text>
                <text x="36" y="38" fill="#fde68a" fontSize="10" fontWeight="500" fontFamily="system-ui">High Acuity Priority</text>
              </g>

              <g transform="translate(130, 290)">
                <rect x="0" y="0" width="200" height="48" rx="24" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" filter="url(#glowRed)" />
                <text x="100" y="29" fill="#ffffff" fontSize="13" fontWeight="700" textAnchor="middle" fontFamily="system-ui">⚡ Pulmonologist Escalated</text>
              </g>
            </svg>
          </div>

          {/* ─── SLIDE 3: SMART AQI & POLLUTION DEFENSE ─── */}
          <div
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            <svg viewBox="0 0 460 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", maxHeight: 420 }}>
              <defs>
                <filter id="glowGreen" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="aqiDome" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#059669" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#041426" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Environmental Dome */}
              <circle cx="230" cy="185" r="145" fill="url(#aqiDome)" stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 4" />
              <circle cx="230" cy="185" r="105" stroke="#10b981" strokeWidth="2" opacity="0.6" />

              {/* Center Dial: AQI Gauge */}
              <g transform="translate(160, 115)" filter="url(#glowGreen)">
                <circle cx="70" cy="70" r="62" fill="#0f2b48" stroke="#10b981" strokeWidth="4" />
                <text x="70" y="55" fill="#a7f3d0" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">AIR QUALITY</text>
                <text x="70" y="85" fill="#ffffff" fontSize="28" fontWeight="800" textAnchor="middle" fontFamily="system-ui">42</text>
                <text x="70" y="105" fill="#34d399" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui">GOOD (SAFE)</text>
              </g>

              {/* Particle Pods */}
              <g transform="translate(50, 160)">
                <rect x="0" y="0" width="95" height="50" rx="12" fill="#061e38" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="47" y="24" fill="#93c5fd" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui">PM 2.5</text>
                <text x="47" y="42" fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="system-ui">14 µg/m³</text>
              </g>

              <g transform="translate(315, 160)">
                <rect x="0" y="0" width="95" height="50" rx="12" fill="#061e38" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="47" y="24" fill="#93c5fd" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui">PM 10</text>
                <text x="47" y="42" fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="system-ui">28 µg/m³</text>
              </g>

              {/* Shield protection badge */}
              <g transform="translate(130, 295)">
                <rect x="0" y="0" width="200" height="42" rx="21" fill="#059669" stroke="#34d399" strokeWidth="1.5" filter="url(#glowGreen)" />
                <text x="100" y="26" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">🛡️ Active Environmental Shield</text>
              </g>
            </svg>
          </div>

          {/* ─── SLIDE 4: TACTILE MEDICATION ADHERENCE ─── */}
          <div
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            <svg viewBox="0 0 460 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", maxHeight: 420 }}>
              <defs>
                <filter id="glowBlue" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* 3D Smart Pillbox Container */}
              <rect x="70" y="65" width="320" height="230" rx="20" fill="#0c233c" stroke="#38bdf8" strokeWidth="2" filter="drop-shadow(0 14px 30px rgba(0,0,0,0.5))" />

              {/* Checklist Header */}
              <rect x="70" y="65" width="320" height="46" rx="20" fill="#08182b" />
              <text x="95" y="94" fill="#ffffff" fontSize="14" fontWeight="700" fontFamily="system-ui">Today&apos;s Prescribed Regimen</text>
              <rect x="310" y="78" width="65" height="22" rx="11" fill="#10b981" />
              <text x="342" y="93" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="system-ui">100% DONE</text>

              {/* Med Row 1 */}
              <rect x="90" y="125" width="280" height="46" rx="10" fill="#133659" stroke="#38bdf8" strokeWidth="1" />
              <circle cx="115" cy="148" r="11" fill="#10b981" />
              <path d="M 111 148 L 114 151 L 120 144" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
              <text x="135" y="145" fill="#ffffff" fontSize="13" fontWeight="700" fontFamily="system-ui">Budecort Inhaler (2 Puffs)</text>
              <text x="135" y="160" fill="#93c5fd" fontSize="10" fontFamily="system-ui">Morning · 8:00 AM — Taken</text>

              {/* Med Row 2 */}
              <rect x="90" y="180" width="280" height="46" rx="10" fill="#133659" stroke="#38bdf8" strokeWidth="1" />
              <circle cx="115" cy="203" r="11" fill="#10b981" />
              <path d="M 111 203 L 114 206 L 120 199" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
              <text x="135" y="200" fill="#ffffff" fontSize="13" fontWeight="700" fontFamily="system-ui">Pirfenidone 200mg (1 Tab)</text>
              <text x="135" y="215" fill="#93c5fd" fontSize="10" fontFamily="system-ui">After Lunch — Taken</text>

              {/* Med Row 3 */}
              <rect x="90" y="235" width="280" height="46" rx="10" fill="#133659" stroke="#38bdf8" strokeWidth="1" />
              <circle cx="115" cy="258" r="11" fill="#10b981" />
              <path d="M 111 258 L 114 261 L 120 254" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
              <text x="135" y="255" fill="#ffffff" fontSize="13" fontWeight="700" fontFamily="system-ui">Formoterol 12mcg (1 Cap)</text>
              <text x="135" y="270" fill="#93c5fd" fontSize="10" fontFamily="system-ui">Night · 9:00 PM — Taken</text>

              {/* Streak Badge */}
              <g transform="translate(140, 310)">
                <rect x="0" y="0" width="180" height="38" rx="19" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" filter="url(#glowBlue)" />
                <text x="90" y="24" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">🔥 14-Day Perfect Adherence</text>
              </g>
            </svg>
          </div>

          {/* ─── SLIDE 5: LONGITUDINAL SPIROMETRY & PFT ─── */}
          <div
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            <svg viewBox="0 0 460 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", maxHeight: 420 }}>
              <defs>
                <filter id="glowPurple" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* PFT Chart Canvas Frame */}
              <rect x="50" y="60" width="360" height="240" rx="18" fill="#0b1e36" stroke="#4f46e5" strokeWidth="2" filter="drop-shadow(0 14px 30px rgba(0,0,0,0.5))" />

              {/* Chart Grid Lines */}
              <line x1="80" y1="110" x2="380" y2="110" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="80" y1="160" x2="380" y2="160" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="80" y1="210" x2="380" y2="210" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="80" y1="260" x2="380" y2="260" stroke="#334155" strokeWidth="1.5" />

              {/* FEV1 & FVC Spirometry Curve */}
              <path
                d="M 90 250 Q 150 90, 230 130 T 370 100"
                stroke="#6366f1"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                filter="url(#glowPurple)"
              />
              <path
                d="M 90 255 Q 160 140, 240 170 T 370 140"
                stroke="#06b6d4"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                filter="url(#glowPurple)"
              />

              {/* Data Point Nodes */}
              <circle cx="150" cy="120" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
              <circle cx="230" cy="130" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
              <circle cx="370" cy="100" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" filter="url(#glowPurple)" />

              {/* Dial Badges */}
              <g transform="translate(70, 75)">
                <rect x="0" y="0" width="85" height="26" rx="8" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
                <text x="42" y="17" fill="#c7d2fe" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui">FEV₁: 84%</text>
              </g>
              <g transform="translate(165, 75)">
                <rect x="0" y="0" width="85" height="26" rx="8" fill="#082f49" stroke="#06b6d4" strokeWidth="1" />
                <text x="42" y="17" fill="#bae6fd" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui">FVC: 91%</text>
              </g>
              <g transform="translate(260, 75)">
                <rect x="0" y="0" width="95" height="26" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                <text x="47" y="17" fill="#a7f3d0" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui">DLCO: Stable</text>
              </g>

              {/* Bottom Insight Badge */}
              <g transform="translate(130, 315)">
                <rect x="0" y="0" width="200" height="38" rx="19" fill="#4f46e5" stroke="#a5b4fc" strokeWidth="1.5" filter="url(#glowPurple)" />
                <text x="100" y="24" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">📈 Sustained Lung Capacity Gain</text>
              </g>
            </svg>
          </div>

          {/* ─── SLIDE 6: SPECIALIST CARE LOOP & TELE-CONSULT ─── */}
          <div
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            <svg viewBox="0 0 460 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", maxHeight: 420 }}>
              <defs>
                <filter id="glowTeal" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Doctor Hub Card */}
              <rect x="65" y="65" width="330" height="235" rx="20" fill="#0b223c" stroke="#0ea5e9" strokeWidth="2" filter="drop-shadow(0 14px 30px rgba(0,0,0,0.5))" />

              {/* Doctor Avatar Header */}
              <circle cx="115" cy="115" r="28" fill="#0284c7" stroke="#ffffff" strokeWidth="2" filter="url(#glowTeal)" />
              <text x="115" y="122" fill="#ffffff" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="system-ui">Dr</text>

              <text x="160" y="112" fill="#ffffff" fontSize="15" fontWeight="800" fontFamily="system-ui">Dr. Sharma, MD</text>
              <text x="160" y="128" fill="#7dd3fc" fontSize="11" fontWeight="600" fontFamily="system-ui">Senior Pulmonologist · Interventional</text>

              {/* Digital Prescription & Instruction Card */}
              <rect x="90" y="160" width="280" height="52" rx="12" fill="#06182a" stroke="#38bdf8" strokeWidth="1" />
              <text x="105" y="182" fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="system-ui">CLINICAL INSTRUCTION · TODAY</text>
              <text x="105" y="199" fill="#ffffff" fontSize="12" fontFamily="system-ui">&quot;SpO₂ stable at 98%. Maintain Budecort 2 puffs.&quot;</text>

              {/* Action Buttons */}
              <rect x="90" y="225" width="135" height="42" rx="10" fill="#0284c7" />
              <text x="157" y="251" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">📋 View Full Rx</text>

              <rect x="235" y="225" width="135" height="42" rx="10" fill="#059669" />
              <text x="302" y="251" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">📅 Book Follow-Up</text>

              {/* Care Loop Verified Badge */}
              <g transform="translate(130, 315)">
                <rect x="0" y="0" width="200" height="38" rx="19" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" filter="url(#glowTeal)" />
                <text x="100" y="24" fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui">✨ Connected Specialist Loop</text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Information & Interactive Progress Indicators */}
      <div
        className="pathway3DBottom"
        style={{
          padding: "16px 20px",
          background: "linear-gradient(180deg, rgba(4, 16, 33, 0.75) 0%, rgba(2, 8, 18, 0.95) 100%)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Dynamic Titles */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "1.02rem",
              fontWeight: 700,
              color: "#ffffff",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            {slidesData[currentSlide]?.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.84rem",
              color: "#93c5fd",
              fontWeight: 500,
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              lineHeight: 1.4,
            }}
          >
            {slidesData[currentSlide]?.subtitle}
          </p>
        </div>

        {/* Glowing Progress Indicator Pills */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {slidesData.map((_, idx) => {
            const isActive = idx === currentSlide;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  height: 6,
                  width: isActive ? 28 : 8,
                  borderRadius: 4,
                  background: isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.2)",
                  boxShadow: isActive ? "0 0 10px #38bdf8" : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
