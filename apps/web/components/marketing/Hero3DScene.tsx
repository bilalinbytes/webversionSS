"use client";

import React, { useState, useRef } from "react";
import { Zap } from "lucide-react";

export function Hero3DScene() {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateY((x / rect.width) * 14); // max 7 deg
    setRotateX((-y / rect.height) * 10); // max 5 deg
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
      className="hero3DWrapper"
      style={{
        position: "relative",
        width: "100%",
        minHeight: 520,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        perspective: "1200px",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes ecgContinuousScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ecgScanSweep {
          0% { left: -15%; opacity: 0; }
          15% { opacity: 0.85; }
          85% { opacity: 0.85; }
          100% { left: 105%; opacity: 0; }
        }
        @keyframes floatCard1 {
          0%, 100% { transform: translateY(0) translateZ(30px); }
          50% { transform: translateY(-7px) translateZ(30px); }
        }
        @keyframes floatCard2 {
          0%, 100% { transform: translateY(0) translateZ(45px); }
          50% { transform: translateY(-9px) translateZ(45px); }
        }
        @keyframes floatCard3 {
          0%, 100% { transform: translateY(0) translateZ(25px); }
          50% { transform: translateY(-6px) translateZ(25px); }
        }
        @keyframes liveDotBlink {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          50% { opacity: 0.4; box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
        }

        @media (max-width: 900px) {
          .hero3DWrapper {
            min-height: 480px !important;
            justify-content: center !important;
            overflow: hidden !important;
          }
          .hero3DCanvas {
            transform: scale(0.9) !important;
            transform-origin: top center !important;
            height: 480px !important;
            margin-bottom: -40px !important;
          }
        }

        @media (max-width: 680px) {
          .hero3DWrapper {
            min-height: 420px !important;
          }
          .hero3DCanvas {
            transform: scale(0.78) !important;
            transform-origin: top center !important;
            height: 420px !important;
            margin-bottom: -80px !important;
          }
        }

        @media (max-width: 520px) {
          .hero3DWrapper {
            min-height: 350px !important;
          }
          .hero3DCanvas {
            transform: scale(0.64) !important;
            transform-origin: top center !important;
            height: 350px !important;
            margin-bottom: -140px !important;
          }
        }

        @media (max-width: 400px) {
          .hero3DWrapper {
            min-height: 300px !important;
          }
          .hero3DCanvas {
            transform: scale(0.52) !important;
            transform-origin: top center !important;
            height: 300px !important;
            margin-bottom: -190px !important;
          }
        }
      `}</style>

      {/* 3D Rotational Canvas Container */}
      <div
        className="hero3DCanvas"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 720,
          height: 520,
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* ─── BACKGROUND SVG: PEDESTAL, 3D LUNGS, LASER RIBBONS & PODIUM ─── */}
        <svg
          viewBox="0 0 720 520"
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
          <ellipse cx="230" cy="390" rx="230" ry="80" fill="url(#ambientBackdrop)" />
          
          {/* Outer Floor Radar Rings */}
          <ellipse cx="230" cy="410" rx="220" ry="55" stroke="#0284c7" strokeWidth="1" strokeDasharray="8 6" opacity="0.35" />
          <ellipse cx="230" cy="410" rx="180" ry="46" stroke="#38bdf8" strokeWidth="1.2" opacity="0.45" />
          <ellipse cx="230" cy="410" rx="140" ry="36" stroke="#00f0ff" strokeWidth="1.5" opacity="0.6" filter="url(#heroGlowCyan)" />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2. MULTI-TIERED 3D METALLIC PODIUM / PEDESTAL */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* Bottom Base Tier */}
          <g filter="url(#heroDropShadow)">
            <ellipse cx="230" cy="425" rx="120" ry="30" fill="#040e1b" />
            <path d="M 110 425 C 110 442, 350 442, 350 425 L 350 440 C 350 457, 110 457, 110 440 Z" fill="#06192e" />
            <ellipse cx="230" cy="420" rx="120" ry="28" fill="url(#pedestalTier1)" stroke="#38bdf8" strokeWidth="1.5" />
          </g>

          {/* Middle Tier with Cyan LED Rim */}
          <g filter="url(#heroDropShadow)">
            <path d="M 135 395 C 135 412, 325 412, 325 395 L 325 410 C 325 427, 135 427, 135 410 Z" fill="#0a223f" />
            <ellipse cx="230" cy="395" rx="95" ry="22" fill="url(#pedestalTier2)" />
            {/* Glowing Neon Rim Ring */}
            <ellipse cx="230" cy="395" rx="95" ry="22" stroke="#00f0ff" strokeWidth="3.5" fill="none" filter="url(#heroGlowCyan)" />
          </g>

          {/* Top Platform Disc */}
          <g filter="url(#heroDropShadow)">
            <path d="M 155 375 C 155 388, 305 388, 305 375 L 305 385 C 305 398, 155 398, 155 385 Z" fill="#0f2e50" />
            <ellipse cx="230" cy="375" rx="75" ry="17" fill="url(#pedestalTop)" stroke="#ffffff" strokeWidth="2" />
            {/* Top Surface Glass Sheen */}
            <ellipse cx="230" cy="373" rx="68" ry="14" fill="#f1f5f9" opacity="0.8" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3. FIBER-OPTIC GLOWING ENERGY LASER RIBBONS (CONNECTING TO RIGHT HUD) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <path
            d="M 285 260 C 345 240, 385 280, 440 270"
            stroke="#00f0ff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
            filter="url(#heroGlowCyan)"
          />
          <path
            d="M 285 285 C 350 270, 380 310, 440 295"
            stroke="#00f0ff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
            filter="url(#heroGlowCyan)"
          />
          <path
            d="M 275 220 C 330 190, 390 220, 440 240"
            stroke="#00f0ff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
            filter="url(#heroGlowCyan)"
          />

          <path d="M 285 260 C 345 240, 385 280, 440 270" stroke="url(#laserCyanStream)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 285 285 C 350 270, 380 310, 440 295" stroke="url(#laserCyanStream)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 275 220 C 330 190, 390 220, 440 240" stroke="url(#laserCyanStream)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Sparkle Nodes */}
          <circle cx="345" cy="250" r="3" fill="#ffffff" filter="url(#heroGlowCyan)" />
          <circle cx="390" cy="290" r="3" fill="#ffffff" filter="url(#heroGlowCyan)" />
          <circle cx="370" cy="205" r="3" fill="#ffffff" filter="url(#heroGlowCyan)" />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 4. 3D CRYSTAL ANATOMICAL HUMAN LUNGS (HERO CENTERPIECE) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <g transform="translate(155, 140)" filter="url(#heroDropShadow)">
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

        {/* ─── 5. THREE FLOATING 3D GLASS TELEMETRY CARDS (CLEAR & NON-OVERLAPPING) ─── */}
        {/* Card 1: SpO2 (Rest) 89% (Top Left) */}
        <div
          style={{
            position: "absolute",
            top: 75,
            left: 20,
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(16px)",
            borderRadius: "1rem",
            padding: "9px 15px",
            border: "1px solid rgba(255, 255, 255, 0.95)",
            boxShadow: "0 12px 28px rgba(15, 43, 72, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            transform: "translateZ(30px)",
            animation: "floatCard1 4s ease-in-out infinite",
            zIndex: 6,
          }}
        >
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>SpO₂ (Rest)</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f2b48", lineHeight: 1 }}>89%</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700 }}>Within Range</span>
          </div>
        </div>

        {/* Card 2: mMRC Score 1 (Top Center Above Lungs — Fully Clear of HUD) */}
        <div
          style={{
            position: "absolute",
            top: 25,
            left: 175,
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(16px)",
            borderRadius: "1rem",
            padding: "9px 15px",
            border: "1px solid rgba(255, 255, 255, 0.95)",
            boxShadow: "0 12px 28px rgba(15, 43, 72, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            transform: "translateZ(45px)",
            animation: "floatCard2 4.5s ease-in-out infinite 0.5s",
            zIndex: 6,
          }}
        >
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>mMRC Score</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f2b48", lineHeight: 1 }}>1</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700 }}>Mild</span>
          </div>
        </div>

        {/* Card 3: AQI (Current) 68 (Bottom Left) */}
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 15,
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(16px)",
            borderRadius: "1rem",
            padding: "9px 15px",
            border: "1px solid rgba(255, 255, 255, 0.95)",
            boxShadow: "0 12px 28px rgba(15, 43, 72, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            transform: "translateZ(25px)",
            animation: "floatCard3 5s ease-in-out infinite 1s",
            zIndex: 6,
          }}
        >
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>AQI (Current)</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f2b48", lineHeight: 1 }}>68</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700 }}>Moderate</span>
          </div>
        </div>

        {/* ─── 6. RIGHT MONITOR HUD WIDGET (POSITIONED SAFELY ON RIGHT EDGE) ─── */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 75,
            width: 295,
            background: "#ffffff",
            borderRadius: "1.25rem",
            padding: "16px 18px",
            boxShadow: "0 24px 50px rgba(7, 22, 44, 0.2), 0 6px 16px rgba(7, 22, 44, 0.08)",
            border: "1px solid rgba(19, 45, 54, 0.1)",
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
                  display: "inline-block",
                  animation: "liveDotBlink 1.4s infinite ease-in-out",
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

          {/* Live Rhythm Pulse Wave Container with Seamless Moving ECG */}
          <div
            style={{
              position: "relative",
              background: "#061325",
              borderRadius: 8,
              padding: "4px 0",
              height: 48,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              border: "1px solid rgba(0, 240, 255, 0.2)",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)",
            }}
          >
            {/* Grid Background Lines */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(0, 240, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.07) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
                pointerEvents: "none",
              }}
            />

            {/* Seamless Infinite Moving Waveform Track */}
            <div
              style={{
                display: "flex",
                width: "200%",
                height: "100%",
                animation: "ecgContinuousScroll 2.2s linear infinite",
              }}
            >
              <svg viewBox="0 0 300 40" preserveAspectRatio="none" style={{ width: "50%", height: "100%", flexShrink: 0 }}>
                <path
                  d="M 0,20 L 35,20 L 42,6 L 50,34 L 58,2 L 66,30 L 74,20 L 150,20 L 158,6 L 166,34 L 174,2 L 182,30 L 190,20 L 300,20"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 0 6px #00f0ff)" }}
                />
              </svg>
              <svg viewBox="0 0 300 40" preserveAspectRatio="none" style={{ width: "50%", height: "100%", flexShrink: 0 }}>
                <path
                  d="M 0,20 L 35,20 L 42,6 L 50,34 L 58,2 L 66,30 L 74,20 L 150,20 L 158,6 L 166,34 L 174,2 L 182,30 L 190,20 L 300,20"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 0 6px #00f0ff)" }}
                />
              </svg>
            </div>

            {/* Luminous Sweep Beam Flare */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "40px",
                background: "linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.4) 50%, #ffffff 90%, transparent 100%)",
                filter: "blur(2px)",
                animation: "ecgScanSweep 2.2s linear infinite",
                pointerEvents: "none",
              }}
            />
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
      </div>
    </div>
  );
}
