"use client";

import React, { useState, useRef } from "react";
import { Zap, RotateCw } from "lucide-react";

export function Hero3DScene() {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateY((x / rect.width) * 16); // max 8 deg
    setRotateX((-y / rect.height) * 12); // max 6 deg
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        width: "100%",
        minHeight: 520,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "1200px",
        userSelect: "none",
      }}
    >
      {/* 3D Rotational Canvas Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 680,
          height: 520,
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* ─── BACKGROUND SVG: PEDESTAL, 3D LUNGS, LASER RIBBONS & PODIUM ─── */}
        <svg
          viewBox="0 0 680 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          <defs>
            {/* Glow Filters */}
            <filter id="heroGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="heroDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#020d1a" floodOpacity="0.75" />
            </filter>

            {/* Pedestal Metallic Gradients */}
            <linearGradient id="pedestalTier1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#0f2642" />
              <stop offset="100%" stopColor="#071526" />
            </linearGradient>

            <linearGradient id="pedestalTier2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#0f2b48" />
              <stop offset="100%" stopColor="#040e1b" />
            </linearGradient>

            <linearGradient id="pedestalTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <linearGradient id="laserCyanStream" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
            </linearGradient>

            <radialGradient id="ambientBackdrop" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0369a1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#020c1b" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="crystalLungFill" cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#7dd3fc" stopOpacity="0.75" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.15" />
            </radialGradient>
          </defs>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 1. AMBIENT BACKDROP LIGHT & NEON FLOOR RINGS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <ellipse cx="280" cy="390" rx="260" ry="80" fill="url(#ambientBackdrop)" />
          
          {/* Outer Floor Radar Rings */}
          <ellipse cx="280" cy="410" rx="240" ry="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="8 6" opacity="0.35" />
          <ellipse cx="280" cy="410" rx="200" ry="50" stroke="#38bdf8" strokeWidth="1.2" opacity="0.45" />
          <ellipse cx="280" cy="410" rx="160" ry="40" stroke="#00f0ff" strokeWidth="1.5" opacity="0.6" filter="url(#heroGlowCyan)" />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2. MULTI-TIERED 3D METALLIC PODIUM / PEDESTAL */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* Bottom Base Tier */}
          <g filter="url(#heroDropShadow)">
            <ellipse cx="280" cy="425" rx="130" ry="32" fill="#040e1b" />
            <path d="M 150 425 C 150 442, 410 442, 410 425 L 410 440 C 410 457, 150 457, 150 440 Z" fill="#06192e" />
            <ellipse cx="280" cy="420" rx="130" ry="30" fill="url(#pedestalTier1)" stroke="#38bdf8" strokeWidth="1.5" />
          </g>

          {/* Middle Tier with Cyan LED Rim */}
          <g filter="url(#heroDropShadow)">
            <path d="M 175 395 C 175 412, 385 412, 385 395 L 385 410 C 385 427, 175 427, 175 410 Z" fill="#0a223f" />
            <ellipse cx="280" cy="395" rx="105" ry="24" fill="url(#pedestalTier2)" />
            {/* Glowing Neon Rim Ring */}
            <ellipse cx="280" cy="395" rx="105" ry="24" stroke="#00f0ff" strokeWidth="3.5" fill="none" filter="url(#heroGlowCyan)" />
          </g>

          {/* Top Platform Disc */}
          <g filter="url(#heroDropShadow)">
            <path d="M 195 375 C 195 388, 365 388, 365 375 L 365 385 C 365 398, 195 398, 195 385 Z" fill="#0f2e50" />
            <ellipse cx="280" cy="375" rx="85" ry="19" fill="url(#pedestalTop)" stroke="#ffffff" strokeWidth="2" />
            {/* Top Surface Glass Sheen */}
            <ellipse cx="280" cy="373" rx="78" ry="16" fill="#f1f5f9" opacity="0.8" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3. FIBER-OPTIC GLOWING ENERGY LASER RIBBONS (CONNECTING TO RIGHT HUD) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <path
            d="M 330 260 C 390 240, 430 280, 485 270"
            stroke="#00f0ff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
            filter="url(#heroGlowCyan)"
          />
          <path
            d="M 330 285 C 395 270, 425 310, 485 295"
            stroke="#00f0ff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
            filter="url(#heroGlowCyan)"
          />
          <path
            d="M 320 220 C 375 190, 435 220, 485 240"
            stroke="#00f0ff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
            filter="url(#heroGlowCyan)"
          />

          <path d="M 330 260 C 390 240, 430 280, 485 270" stroke="url(#laserCyanStream)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 330 285 C 395 270, 425 310, 485 295" stroke="url(#laserCyanStream)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 320 220 C 375 190, 435 220, 485 240" stroke="url(#laserCyanStream)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Sparkle Nodes */}
          <circle cx="395" cy="250" r="3" fill="#ffffff" filter="url(#heroGlowCyan)" />
          <circle cx="440" cy="290" r="3" fill="#ffffff" filter="url(#heroGlowCyan)" />
          <circle cx="420" cy="205" r="3" fill="#ffffff" filter="url(#heroGlowCyan)" />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 4. 3D CRYSTAL ANATOMICAL HUMAN LUNGS (HERO CENTERPIECE) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <g transform="translate(205, 140)" filter="url(#heroDropShadow)">
            {/* Ambient Bioluminescent Back Aura */}
            <circle cx="75" cy="110" r="85" fill="#38bdf8" opacity="0.2" filter="url(#heroGlowCyan)" />

            {/* Right Lung Lobe (Viewer's Left) */}
            <path
              d="M 60 40 C 44 40, 18 60, 10 95 C 2 130, 8 170, 30 190 C 46 202, 60 190, 68 165 C 75 145, 75 85, 70 55 C 68 45, 65 40, 60 40 Z"
              fill="url(#crystalLungFill)"
              stroke="#38bdf8"
              strokeWidth="2.8"
              filter="url(#heroGlowCyan)"
            />

            {/* Left Lung Lobe (Viewer's Right) */}
            <path
              d="M 90 40 C 106 40, 132 60, 140 95 C 148 130, 142 170, 120 190 C 104 202, 90 190, 82 165 C 75 145, 75 85, 80 55 C 82 45, 85 40, 90 40 Z"
              fill="url(#crystalLungFill)"
              stroke="#38bdf8"
              strokeWidth="2.8"
              filter="url(#heroGlowCyan)"
            />

            {/* Trachea (Windpipe with Cartilaginous Rings) */}
            <path
              d="M 70 0 L 80 0 L 80 50 C 80 58, 75 65, 75 65 C 75 65, 70 58, 70 50 Z"
              fill="#e0f2fe"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <line x1="70" y1="10" x2="80" y2="10" stroke="#0284c7" strokeWidth="2" />
            <line x1="70" y1="20" x2="80" y2="20" stroke="#0284c7" strokeWidth="2" />
            <line x1="70" y1="30" x2="80" y2="30" stroke="#0284c7" strokeWidth="2" />
            <line x1="70" y1="40" x2="80" y2="40" stroke="#0284c7" strokeWidth="2" />

            {/* Bronchial Tree Branches (Right Lung) */}
            <path d="M 72 55 C 60 65, 42 80, 32 110" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <path d="M 52 78 C 45 90, 28 100, 22 125" stroke="#bae6fd" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 44 98 C 40 120, 35 145, 34 165" stroke="#bae6fd" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 55 90 C 56 115, 54 140, 50 170" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 28 115 C 20 130, 18 148, 20 162" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />

            {/* Bronchial Tree Branches (Left Lung) */}
            <path d="M 78 55 C 90 65, 108 80, 118 110" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <path d="M 98 78 C 105 90, 122 100, 128 125" stroke="#bae6fd" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 106 98 C 110 120, 115 145, 116 165" stroke="#bae6fd" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 95 90 C 94 115, 96 140, 100 170" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 122 115 C 130 130, 132 148, 130 162" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />

            {/* Glowing Alveoli Light Nodes */}
            <circle cx="28" cy="110" r="2.5" fill="#ffffff" filter="url(#heroGlowCyan)" />
            <circle cx="42" cy="150" r="2.5" fill="#ffffff" filter="url(#heroGlowCyan)" />
            <circle cx="122" cy="110" r="2.5" fill="#ffffff" filter="url(#heroGlowCyan)" />
            <circle cx="108" cy="150" r="2.5" fill="#ffffff" filter="url(#heroGlowCyan)" />
            <circle cx="75" cy="65" r="3.5" fill="#00f0ff" filter="url(#heroGlowCyan)" />
          </g>
        </svg>

        {/* ─── 5. THREE FLOATING 3D GLASS TELEMETRY CARDS ─── */}
        {/* Card 1: SpO2 (Rest) 89% (Top Left) */}
        <div
          style={{
            position: "absolute",
            top: 75,
            left: 120,
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(16px)",
            borderRadius: "1rem",
            padding: "10px 16px",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            boxShadow: "0 12px 28px rgba(15, 43, 72, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            transform: "translateZ(30px)",
            animation: "floatWidget 4s ease-in-out infinite",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>SpO₂ (Rest)</span>
          <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f2b48", lineHeight: 1 }}>89%</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
            <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>Within Range</span>
          </div>
        </div>

        {/* Card 2: mMRC Score 1 (Top Right) */}
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 310,
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(16px)",
            borderRadius: "1rem",
            padding: "10px 16px",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            boxShadow: "0 12px 28px rgba(15, 43, 72, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            transform: "translateZ(45px)",
            animation: "floatWidget 4.5s ease-in-out infinite 0.5s",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>mMRC Score</span>
          <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f2b48", lineHeight: 1 }}>1</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
            <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>Mild</span>
          </div>
        </div>

        {/* Card 3: AQI (Current) 68 (Bottom Left) */}
        <div
          style={{
            position: "absolute",
            top: 290,
            left: 70,
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(16px)",
            borderRadius: "1rem",
            padding: "10px 16px",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            boxShadow: "0 12px 28px rgba(15, 43, 72, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            transform: "translateZ(25px)",
            animation: "floatWidget 5s ease-in-out infinite 1s",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>AQI (Current)</span>
          <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f2b48", lineHeight: 1 }}>68</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 700 }}>Moderate</span>
          </div>
        </div>

        {/* ─── 6. RIGHT MONITOR HUD WIDGET ─── */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 95,
            width: 290,
            background: "#ffffff",
            borderRadius: "1.25rem",
            padding: "16px 18px",
            boxShadow: "0 20px 48px rgba(7, 22, 44, 0.16), 0 4px 12px rgba(7, 22, 44, 0.08)",
            border: "1px solid rgba(19, 45, 54, 0.09)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            transform: "translateZ(35px)",
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#dc2626",
                  boxShadow: "0 0 8px rgba(220, 38, 38, 0.7)",
                  display: "inline-block",
                  animation: "liveBlink 1.4s infinite ease-in-out",
                }}
              />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f2b48" }}>SpO₂ &amp; Rhythm Monitor</span>
            </div>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                color: "#dc2626",
                background: "#fee2e2",
                border: "1px solid rgba(220, 38, 38, 0.25)",
                padding: "2px 7px",
                borderRadius: 999,
                letterSpacing: "0.04em",
              }}
            >
              DESATURATION ALERT
            </span>
          </div>

          {/* Numbers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#dc2626", lineHeight: 1 }}>89%</span>
              <span style={{ display: "block", fontSize: "0.68rem", color: "#64748b", fontWeight: 500, marginTop: 2 }}>
                SpO₂ (Target 88–92%)
              </span>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f2b48", lineHeight: 1 }}>104</span>
              <span style={{ display: "block", fontSize: "0.68rem", color: "#64748b", fontWeight: 500, marginTop: 2 }}>
                BPM Pulse Rate
              </span>
            </div>
          </div>

          {/* Live Rhythm Pulse Wave SVG */}
          <div
            style={{
              background: "#08182b",
              borderRadius: 8,
              padding: "6px 8px",
              height: 48,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <svg viewBox="0 0 300 40" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <path
                d="M 0,20 Q 15,20 25,20 T 40,20 L 48,6 L 56,34 L 64,2 L 72,30 L 80,20 L 120,20 Q 135,20 145,20 T 160,20 L 168,8 L 176,32 L 184,4 L 192,28 L 200,20 L 240,20 Q 255,20 265,20 T 280,20 L 288,6 L 296,34 L 300,20"
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="400"
                style={{ animation: "waveDash 3s linear infinite" }}
              />
            </svg>
          </div>

          {/* Autonomous Triage Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
              border: "1px solid rgba(249, 115, 22, 0.3)",
              borderRadius: 8,
              padding: "7px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "#f97316",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Zap size={13} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ fontSize: "0.72rem", color: "#9a3412" }}>Autonomous Red-Flag Triage Engine</strong>
              <span style={{ fontSize: "0.64rem", color: "#c2410c" }}>High Acuity Detected — Doctor Notified</span>
            </div>
          </div>
        </div>

        {/* ─── 7. INTERACTION CUE (BOTTOM RIGHT) ─── */}
        <div
          style={{
            position: "absolute",
            bottom: 25,
            right: 25,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255, 255, 255, 0.75)",
            fontSize: "0.78rem",
            fontWeight: 600,
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          <RotateCw size={15} style={{ color: "#38bdf8" }} />
          <span>Move mouse to explore 3D lungs</span>
        </div>
      </div>
    </div>
  );
}
