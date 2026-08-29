"use client";

import React from "react";

export function Pathway3DVisual() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 480,
        borderRadius: "1.25rem",
        overflow: "hidden",
        background: "linear-gradient(145deg, #07162c 0%, #0b2341 50%, #0f3057 100%)",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        boxShadow: "0 20px 50px rgba(7, 22, 44, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Telemetry Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "rgba(7, 22, 44, 0.6)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#38bdf8",
              boxShadow: "0 0 8px #38bdf8",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#e0f2fe",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            Care Pathway Engine
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#38bdf8",
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            padding: "2px 9px",
            borderRadius: 999,
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          }}
        >
          Continuous Telemetry
        </span>
      </div>

      {/* Main 3D Vector SVG Graphic */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
        }}
      >
        <svg
          viewBox="0 0 440 480"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: "100%",
            height: "100%",
            maxHeight: 460,
            overflow: "visible",
            filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.3))",
          }}
        >
          <defs>
            {/* Ambient & Node Glow Filters */}
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowEmerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowIndigo" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#020d1a" floodOpacity="0.65" />
            </filter>

            {/* Gradient Road & Connectors */}
            <linearGradient id="pathGradient" x1="90" y1="390" x2="350" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            <linearGradient id="roadBase" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0c233c" />
              <stop offset="100%" stopColor="#061524" />
            </linearGradient>

            {/* Node 1 Platform Gradients */}
            <linearGradient id="cyanPillarTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="cyanPillarSide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#073b61" />
            </linearGradient>

            {/* Node 2 Platform Gradients */}
            <linearGradient id="emeraldPillarTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="emeraldPillarSide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            {/* Node 3 Platform Gradients */}
            <linearGradient id="indigoPillarTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="indigoPillarSide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#2e1065" />
            </linearGradient>

            {/* Orb Radial Gradients */}
            <radialGradient id="sphereCyan" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="85%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#075985" />
            </radialGradient>

            <radialGradient id="sphereEmerald" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="40%" stopColor="#34d399" />
              <stop offset="85%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>

            <radialGradient id="sphereIndigo" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#e0e7ff" />
              <stop offset="40%" stopColor="#818cf8" />
              <stop offset="85%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#312e81" />
            </radialGradient>
          </defs>

          {/* Perspective Grid Background */}
          <g opacity="0.18">
            <line x1="40" y1="440" x2="400" y2="440" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="60" y1="360" x2="380" y2="360" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="90" y1="280" x2="350" y2="280" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="120" y1="200" x2="320" y2="200" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="150" y1="120" x2="290" y2="120" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />

            <line x1="70" y1="460" x2="190" y2="60" stroke="#38bdf8" strokeWidth="1" />
            <line x1="220" y1="460" x2="220" y2="60" stroke="#38bdf8" strokeWidth="1" />
            <line x1="370" y1="460" x2="250" y2="60" stroke="#38bdf8" strokeWidth="1" />
          </g>

          {/* 3D S-Curve Highway Base (Depth Extrusion) */}
          <path
            d="M 90 405 C 130 405 130 265 220 255 C 310 245 310 105 340 105 L 340 115 C 310 115 310 255 220 265 C 130 275 130 415 90 415 Z"
            fill="#030d17"
            opacity="0.8"
          />

          {/* 3D Highway Road Surface */}
          <path
            d="M 90 395 C 150 395 150 250 220 240 C 290 230 290 95 340 95"
            stroke="url(#roadBase)"
            strokeWidth="32"
            strokeLinecap="round"
            filter="url(#shadow3d)"
          />

          {/* Neon Energy Core Path (Glowing Center Stream) */}
          <path
            d="M 90 395 C 150 395 150 250 220 240 C 290 230 290 95 340 95"
            stroke="url(#pathGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#glowCyan)"
            opacity="0.9"
          />

          {/* Animated Glowing Pulses */}
          <path
            d="M 90 395 C 150 395 150 250 220 240 C 290 230 290 95 340 95"
            stroke="#ffffff"
            strokeWidth="3"
            strokeDasharray="16 32"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STAGE 1: EARLY DETECTION (Bottom-Left 3D Platform)     */}
          {/* ═══════════════════════════════════════════════════════ */}
          <g transform="translate(85, 385)">
            {/* 3D Platform Base Shadow */}
            <ellipse cx="0" cy="18" rx="46" ry="14" fill="#020810" opacity="0.6" />

            {/* Platform Side Extrusion */}
            <path
              d="M -44 0 C -44 10, 44 10, 44 0 L 44 12 C 44 22, -44 22, -44 12 Z"
              fill="url(#cyanPillarSide)"
            />

            {/* Platform Top Surface */}
            <ellipse cx="0" cy="0" rx="44" ry="12" fill="url(#cyanPillarTop)" />
            <ellipse cx="0" cy="0" rx="38" ry="9" fill="#0c2e4e" />

            {/* Glowing Center Ring */}
            <ellipse cx="0" cy="0" rx="28" ry="6" stroke="#38bdf8" strokeWidth="2" filter="url(#glowCyan)" />

            {/* Floating 3D Orb */}
            <g transform="translate(0, -32)">
              <circle cx="0" cy="0" r="22" fill="url(#sphereCyan)" filter="url(#shadow3d)" />
              <circle cx="-6" cy="-6" r="6" fill="#ffffff" opacity="0.6" />

              {/* Heart Pulse Icon in Orb */}
              <path
                d="M -10 2 L -5 2 L -2 -7 L 2 8 L 5 -3 L 7 2 L 10 2"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>

            {/* Floating Telemetry Capsule */}
            <g transform="translate(48, -48)">
              <rect x="-8" y="-12" width="94" height="24" rx="12" fill="rgba(8, 28, 50, 0.9)" stroke="#0ea5e9" strokeWidth="1.5" />
              <circle cx="2" cy="0" r="4" fill="#38bdf8" />
              <text x="12" y="4" fill="#ffffff" fontSize="10.5" fontWeight="700" fontFamily="system-ui, sans-serif">
                SpO₂ 98%
              </text>
            </g>

            {/* Step Label */}
            <text x="0" y="36" textAnchor="middle" fill="#bae6fd" fontSize="12" fontWeight="700" fontFamily="system-ui, sans-serif">
              1. Early Detection
            </text>
            <text x="0" y="50" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontWeight="500" fontFamily="system-ui, sans-serif">
              Daily Vitals & Check-in
            </text>
          </g>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STAGE 2: ACTIVE PROTECTION (Center 3D Platform)        */}
          {/* ═══════════════════════════════════════════════════════ */}
          <g transform="translate(220, 235)">
            {/* 3D Platform Base Shadow */}
            <ellipse cx="0" cy="18" rx="46" ry="14" fill="#020810" opacity="0.6" />

            {/* Platform Side Extrusion */}
            <path
              d="M -44 0 C -44 10, 44 10, 44 0 L 44 12 C 44 22, -44 22, -44 12 Z"
              fill="url(#emeraldPillarSide)"
            />

            {/* Platform Top Surface */}
            <ellipse cx="0" cy="0" rx="44" ry="12" fill="url(#emeraldPillarTop)" />
            <ellipse cx="0" cy="0" rx="38" ry="9" fill="#06382a" />

            {/* Glowing Center Ring */}
            <ellipse cx="0" cy="0" rx="28" ry="6" stroke="#34d399" strokeWidth="2" filter="url(#glowEmerald)" />

            {/* Floating 3D Orb */}
            <g transform="translate(0, -32)">
              <circle cx="0" cy="0" r="22" fill="url(#sphereEmerald)" filter="url(#shadow3d)" />
              <circle cx="-6" cy="-6" r="6" fill="#ffffff" opacity="0.6" />

              {/* Shield Icon in Orb */}
              <path
                d="M 0 -8 L 8 -4 L 8 2 C 8 7, 0 11, 0 11 C 0 11, -8 7, -8 2 L -8 -4 Z"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path d="M -3 1 L -1 3 L 4 -2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Floating Telemetry Capsule */}
            <g transform="translate(-130, -48)">
              <rect x="0" y="-12" width="105" height="24" rx="12" fill="rgba(6, 40, 30, 0.9)" stroke="#10b981" strokeWidth="1.5" />
              <circle cx="10" cy="0" r="4" fill="#34d399" />
              <text x="20" y="4" fill="#ffffff" fontSize="10.5" fontWeight="700" fontFamily="system-ui, sans-serif">
                AQI & Rx Defense
              </text>
            </g>

            {/* Step Label */}
            <text x="0" y="36" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="700" fontFamily="system-ui, sans-serif">
              2. Active Protection
            </text>
            <text x="0" y="50" textAnchor="middle" fill="#6ee7b7" fontSize="9.5" fontWeight="500" fontFamily="system-ui, sans-serif">
              Rx Adherence & Defense
            </text>
          </g>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STAGE 3: STABILITY & RECOVERY (Top-Right 3D Platform)  */}
          {/* ═══════════════════════════════════════════════════════ */}
          <g transform="translate(340, 95)">
            {/* 3D Platform Base Shadow */}
            <ellipse cx="0" cy="18" rx="48" ry="15" fill="#020810" opacity="0.6" />

            {/* Platform Side Extrusion */}
            <path
              d="M -46 0 C -46 11, 46 11, 46 0 L 46 13 C 46 24, -46 24, -46 13 Z"
              fill="url(#indigoPillarSide)"
            />

            {/* Platform Top Surface */}
            <ellipse cx="0" cy="0" rx="46" ry="13" fill="url(#indigoPillarTop)" />
            <ellipse cx="0" cy="0" rx="40" ry="10" fill="#1e1b4b" />

            {/* Glowing Center Ring */}
            <ellipse cx="0" cy="0" rx="30" ry="7" stroke="#a5b4fc" strokeWidth="2" filter="url(#glowIndigo)" />

            {/* Floating 3D Apex Orb (Lungs & Sun radiance) */}
            <g transform="translate(0, -34)">
              <circle cx="0" cy="0" r="24" fill="url(#sphereIndigo)" filter="url(#shadow3d)" />
              <circle cx="-7" cy="-7" r="7" fill="#ffffff" opacity="0.6" />

              {/* Lungs Vector Icon */}
              <path
                d="M -4 -8 C -4 -4, -10 2, -10 7 C -10 11, -6 12, -3 10 C -1 8, -1 3, -1 -3 M 4 -8 C 4 -4, 10 2, 10 7 C 10 11, 6 12, 3 10 C 1 8, 1 3, 1 -3"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <line x1="0" y1="-10" x2="0" y2="-3" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            </g>

            {/* Floating Telemetry Capsule */}
            <g transform="translate(-130, -50)">
              <rect x="0" y="-12" width="112" height="24" rx="12" fill="rgba(24, 20, 60, 0.9)" stroke="#818cf8" strokeWidth="1.5" />
              <circle cx="10" cy="0" r="4" fill="#a5b4fc" />
              <text x="20" y="4" fill="#ffffff" fontSize="10" fontWeight="700" fontFamily="system-ui, sans-serif">
                Zero Exacerbations
              </text>
            </g>

            {/* Step Label */}
            <text x="0" y="36" textAnchor="middle" fill="#e0e7ff" fontSize="12" fontWeight="700" fontFamily="system-ui, sans-serif">
              3. Stability & Recovery
            </text>
            <text x="0" y="50" textAnchor="middle" fill="#c7d2fe" fontSize="9.5" fontWeight="500" fontFamily="system-ui, sans-serif">
              Pulmonologist Supervision
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Reassurance Footer Banner */}
      <div
        style={{
          padding: "12px 20px",
          background: "rgba(6, 18, 36, 0.8)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          Regular monitoring helps you stay ahead.
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 11,
            color: "#93c5fd",
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          }}
        >
          Autonomous 24/7 Red-Flag Triage & Pulmonary Care
        </p>
      </div>
    </div>
  );
}
