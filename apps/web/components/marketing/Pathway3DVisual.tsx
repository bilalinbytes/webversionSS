"use client";

import React from "react";

export function Pathway3DVisual() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 520,
        borderRadius: "1.5rem",
        overflow: "hidden",
        background: "radial-gradient(circle at 65% 45%, #0d2e53 0%, #081d35 45%, #041021 100%)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        boxShadow: "0 24px 60px rgba(4, 16, 33, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Telemetry Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 22px",
          background: "rgba(4, 16, 33, 0.65)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          zIndex: 3,
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
            Digital Telemetry &amp; Vitals
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#38bdf8",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            padding: "3px 10px",
            borderRadius: 999,
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          }}
        >
          Live Telemetry Hub
        </span>
      </div>

      {/* Main 3D Vector SVG Composition */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px",
        }}
      >
        <svg
          viewBox="0 0 460 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: "100%",
            height: "100%",
            maxHeight: 440,
            overflow: "visible",
          }}
        >
          <defs>
            {/* Glow Filters */}
            <filter id="laserGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="orbGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="softDropShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#020b18" floodOpacity="0.65" />
            </filter>

            <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0a2540" floodOpacity="0.25" />
            </filter>

            {/* Linear Gradients */}
            <linearGradient id="phoneBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <linearGradient id="phoneBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            <linearGradient id="glassCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            <linearGradient id="laserStreamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#00f0ff" stopOpacity="1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
            </linearGradient>

            <radialGradient id="centralPodBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0e3a64" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#08213d" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#041426" stopOpacity="0.4" />
            </radialGradient>

            <radialGradient id="lungTissueGrad" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#7dd3fc" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.1" />
            </radialGradient>

            <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 1. BACKGROUND GLOW & AMBIENT RAYS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <circle cx="300" cy="190" r="140" fill="#0284c7" opacity="0.16" filter="url(#orbGlow)" />
          <circle cx="300" cy="190" r="95" fill="#38bdf8" opacity="0.12" filter="url(#laserGlow)" />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2. GLOWING ENERGY LASER PIPES / CABLES */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* Glow backdrop paths */}
          <path
            d="M 125 125 C 175 125, 205 165, 240 175"
            stroke="#00f0ff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.3"
            filter="url(#laserGlow)"
          />
          <path
            d="M 125 185 C 165 185, 185 190, 235 190"
            stroke="#00f0ff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.3"
            filter="url(#laserGlow)"
          />
          <path
            d="M 125 245 C 175 245, 205 210, 240 205"
            stroke="#00f0ff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.3"
            filter="url(#laserGlow)"
          />
          <path
            d="M 300 110 L 300 70"
            stroke="#00f0ff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.3"
            filter="url(#laserGlow)"
          />
          <path
            d="M 300 270 L 300 310"
            stroke="#00f0ff"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.3"
            filter="url(#laserGlow)"
          />

          {/* Sharp laser lines */}
          <path
            d="M 125 125 C 175 125, 205 165, 240 175"
            stroke="url(#laserStreamGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 125 185 C 165 185, 185 190, 235 190"
            stroke="url(#laserStreamGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 125 245 C 175 245, 205 210, 240 205"
            stroke="url(#laserStreamGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 300 110 L 300 70"
            stroke="url(#laserStreamGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 300 270 L 300 310"
            stroke="url(#laserStreamGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Laser connection dots on phone */}
          <circle cx="125" cy="125" r="4.5" fill="#ffffff" filter="url(#orbGlow)" />
          <circle cx="125" cy="185" r="4.5" fill="#ffffff" filter="url(#orbGlow)" />
          <circle cx="125" cy="245" r="4.5" fill="#ffffff" filter="url(#orbGlow)" />

          {/* Sparkle star / node on center edge */}
          <circle cx="395" cy="180" r="3.5" fill="#ffffff" filter="url(#orbGlow)" />
          <path d="M 395 174 L 395 186 M 389 180 L 401 180" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3. 3D SMARTPHONE (LEFT SIDE) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <g filter="url(#softDropShadow)">
            {/* Phone outer bevel casing */}
            <rect x="25" y="45" width="112" height="280" rx="24" fill="url(#phoneBezelGrad)" />
            {/* Phone dark metallic inner frame */}
            <rect x="28" y="48" width="106" height="274" rx="21" fill="url(#phoneBodyGrad)" />
            {/* Screen glass */}
            <rect x="33" y="53" width="96" height="264" rx="17" fill="url(#screenGrad)" />

            {/* Top speaker notch */}
            <rect x="66" y="58" width="30" height="4" rx="2" fill="#334155" />

            {/* Screen Tactile Card 1: Airflow / SpO2 */}
            <g filter="url(#cardShadow)">
              <rect x="40" y="85" width="82" height="48" rx="10" fill="url(#glassCardGrad)" />
              {/* Wind / Airflow Icon */}
              <g transform="translate(48, 97)">
                <path d="M 3 5 C 7 5, 10 3, 14 3 C 16 3, 17 5, 16 7 C 15 8.5, 12 8.5, 12 8.5" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M 1 10 C 6 10, 12 10, 16 10 C 18.5 10, 19.5 12, 18.5 14 C 17.5 15.5, 15 15.5, 15 15.5" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M 3 15 C 6 15, 9 16.5, 12 16.5 C 13.5 16.5, 14.5 18, 13.5 19 C 12.5 20, 11 20, 11 20" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" />
              </g>
              {/* Indicator bar */}
              <rect x="75" y="106" width="38" height="5" rx="2.5" fill="#94a3b8" opacity="0.6" />
            </g>

            {/* Screen Tactile Card 2: Cough / Respiratory Symptoms */}
            <g filter="url(#cardShadow)">
              <rect x="40" y="145" width="82" height="48" rx="10" fill="url(#glassCardGrad)" />
              {/* Cough Symptom Icon */}
              <g transform="translate(48, 157)">
                <circle cx="10" cy="8" r="5.5" stroke="#0284c7" strokeWidth="2" fill="none" />
                <path d="M 10 13.5 C 6 13.5, 3 16, 3 19.5 L 17 19.5 C 17 16, 14 13.5, 10 13.5 Z" stroke="#0284c7" strokeWidth="2" fill="none" />
                <circle cx="19" cy="8" r="1.2" fill="#0284c7" />
                <circle cx="21.5" cy="11" r="1.2" fill="#0284c7" />
              </g>
              {/* Indicator bar */}
              <rect x="75" y="166" width="38" height="5" rx="2.5" fill="#94a3b8" opacity="0.6" />
            </g>

            {/* Screen Tactile Card 3: Patient Profile Check-in */}
            <g filter="url(#cardShadow)">
              <rect x="40" y="205" width="82" height="48" rx="10" fill="url(#glassCardGrad)" />
              {/* Profile Icon */}
              <g transform="translate(48, 217)">
                <circle cx="10" cy="7" r="4.5" fill="#0284c7" />
                <path d="M 4 19 C 4 15, 7 13, 10 13 C 13 13, 16 15, 16 19" fill="#0284c7" />
              </g>
              {/* Indicator bar */}
              <rect x="75" y="226" width="38" height="5" rx="2.5" fill="#94a3b8" opacity="0.6" />
            </g>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 4. TOP BADGE POD (AIRFLOW / AQI) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <g filter="url(#softDropShadow)">
            {/* 3D Base ring */}
            <circle cx="300" cy="50" r="32" fill="#0f2b48" opacity="0.5" />
            <circle cx="300" cy="48" r="30" fill="url(#badgeGrad)" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="300" cy="48" r="23" fill="#f8fafc" />
            {/* Airflow Icon */}
            <g transform="translate(286, 36)">
              <path d="M 5 8 C 10 8, 17 5, 22 5 C 25.5 5, 27 8, 25.5 11 C 24 13.5, 19.5 13.5, 19.5 13.5" stroke="#0284c7" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M 2 15 C 9 15, 19 15, 25 15 C 28.5 15, 30 18, 28.5 21 C 27 23.5, 23 23.5, 23 23.5" stroke="#0284c7" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M 5 22 C 9 22, 14 24, 18 24 C 20.5 24, 22 26.5, 20.5 28 C 19 29.5, 17 29.5, 17 29.5" stroke="#0284c7" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 5. BOTTOM BADGE POD (PATIENT CHECK-IN) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <g filter="url(#softDropShadow)">
            {/* 3D Base ring */}
            <circle cx="300" cy="330" r="32" fill="#0f2b48" opacity="0.5" />
            <circle cx="300" cy="328" r="30" fill="url(#badgeGrad)" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="300" cy="328" r="23" fill="#f8fafc" />
            {/* User Icon */}
            <g transform="translate(287, 314)">
              <circle cx="13" cy="10" r="6.5" fill="#0284c7" />
              <path d="M 4 27 C 4 21, 8 18, 13 18 C 18 18, 22 21, 22 27 Z" fill="#0284c7" />
            </g>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 6. CENTRAL HOLOGRAPHIC 3D LUNGS POD */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <g filter="url(#softDropShadow)">
            {/* Outer Cyan Pulse Ring */}
            <circle cx="300" cy="190" r="78" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
            {/* Glass capsule outer border */}
            <circle cx="300" cy="190" r="72" fill="url(#centralPodBg)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="3" />
            {/* Inner neon border */}
            <circle cx="300" cy="190" r="68" stroke="#00f0ff" strokeWidth="1.5" opacity="0.75" />

            {/* Specular glass reflection arc */}
            <path
              d="M 245 155 A 64 64 0 0 1 350 145"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* ─── ANATOMICAL HUMAN LUNGS (TRANSLUCENT & LUMINESCENT) ─── */}
            <g transform="translate(250, 140)">
              {/* Right Lung Lobe (Viewer's Left) */}
              <path
                d="M 40 18 C 30 18, 16 30, 12 48 C 8 64, 10 82, 22 92 C 30 98, 38 92, 44 80 C 48 70, 48 40, 46 25 C 45 20, 43 18, 40 18 Z"
                fill="url(#lungTissueGrad)"
                stroke="#38bdf8"
                strokeWidth="1.8"
                filter="url(#laserGlow)"
              />

              {/* Left Lung Lobe (Viewer's Right) */}
              <path
                d="M 60 18 C 70 18, 84 30, 88 48 C 92 64, 90 82, 78 92 C 70 98, 62 92, 56 80 C 52 70, 52 40, 54 25 C 55 20, 57 18, 60 18 Z"
                fill="url(#lungTissueGrad)"
                stroke="#38bdf8"
                strokeWidth="1.8"
                filter="url(#laserGlow)"
              />

              {/* Trachea (Windpipe) */}
              <path
                d="M 47 0 L 53 0 L 53 28 C 53 32, 50 36, 50 36 C 50 36, 47 32, 47 28 Z"
                fill="#e0f2fe"
                stroke="#38bdf8"
                strokeWidth="1.4"
              />
              {/* Trachea horizontal cartilages */}
              <line x1="47" y1="6" x2="53" y2="6" stroke="#0284c7" strokeWidth="1.2" />
              <line x1="47" y1="12" x2="53" y2="12" stroke="#0284c7" strokeWidth="1.2" />
              <line x1="47" y1="18" x2="53" y2="18" stroke="#0284c7" strokeWidth="1.2" />
              <line x1="47" y1="24" x2="53" y2="24" stroke="#0284c7" strokeWidth="1.2" />

              {/* Main Bronchi Branches (Bifurcation / Carina) */}
              {/* Right main bronchus */}
              <path d="M 48 32 C 42 36, 32 45, 26 58" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <path d="M 36 43 C 32 48, 22 52, 18 64" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 30 52 C 28 62, 24 72, 24 80" stroke="#bae6fd" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M 38 48 C 38 60, 36 70, 34 82" stroke="#bae6fd" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M 22 58 C 17 64, 15 72, 16 78" stroke="#7dd3fc" strokeWidth="1" strokeLinecap="round" />

              {/* Left main bronchus */}
              <path d="M 52 32 C 58 36, 68 45, 74 58" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <path d="M 64 43 C 68 48, 78 52, 82 64" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 70 52 C 72 62, 76 72, 76 80" stroke="#bae6fd" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M 62 48 C 62 60, 64 70, 66 82" stroke="#bae6fd" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M 78 58 C 83 64, 85 72, 84 78" stroke="#7dd3fc" strokeWidth="1" strokeLinecap="round" />

              {/* Alveoli capillary light points */}
              <circle cx="20" cy="55" r="1.5" fill="#ffffff" filter="url(#orbGlow)" />
              <circle cx="28" cy="74" r="1.5" fill="#ffffff" filter="url(#orbGlow)" />
              <circle cx="80" cy="55" r="1.5" fill="#ffffff" filter="url(#orbGlow)" />
              <circle cx="72" cy="74" r="1.5" fill="#ffffff" filter="url(#orbGlow)" />
              <circle cx="50" cy="35" r="2" fill="#00f0ff" filter="url(#orbGlow)" />
            </g>
          </g>
        </svg>
      </div>

      {/* Bottom Clinical Caption */}
      <div
        style={{
          padding: "16px 20px",
          background: "linear-gradient(180deg, rgba(4, 16, 33, 0.7) 0%, rgba(2, 8, 18, 0.95) 100%)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <p
          style={{
            margin: "0 0 3px",
            fontSize: "1rem",
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          Log your daily symptoms.
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            color: "#7dd3fc",
            fontWeight: 500,
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          }}
        >
          Continuous respiratory care &amp; intelligent triage defense.
        </p>
      </div>
    </div>
  );
}
