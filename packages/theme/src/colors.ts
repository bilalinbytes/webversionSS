/**
 * O2Plus Color Tokens
 *
 * Single source of truth for semantic colors across web and mobile.
 * Blue Healthcare visual foundation preserving all clinical scoring engine mappings.
 */

export const colors = {
  // Brand & Medical Blue Palette
  brand: {
    navyDark: "#07192b",      // Deepest navy for high-security headers & page footers
    navy: "#0a2238",          // Primary doctor workstation navigation & clinical headers
    navyLight: "#0f2b48",     // Secondary clinical accents
    primary: "#1e6091",       // Primary medical brand blue
    primaryHover: "#164e77",  // Button hover state
    primaryLight: "#e8f1f8",  // Active tab background / Subtle badge fill
    primarySurface: "#f0f7fc",// Soft blue tinted canvas
    accentCyan: "#38bdf8",    // Active navigation indicator & focus highlights
    primaryDark: "#07192b",   // Legacy alias
  },

  // Risk levels (Scoring engine indicator colors — Ground Truth Preserved)
  risk: {
    green: {
      bg: "#dcfce7", // Green 100
      text: "#166534", // Green 800
      border: "#bbf7d0", // Green 200
      solid: "#22c55e", // Green 500
    },
    yellow: {
      bg: "#fef9c3", // Yellow 100
      text: "#854d0e", // Yellow 800
      border: "#fef08a", // Yellow 200
      solid: "#eab308", // Yellow 500
    },
    orange: {
      bg: "#ffedd5", // Orange 100
      text: "#9a3412", // Orange 800
      border: "#fed7aa", // Orange 200
      solid: "#f97316", // Orange 500
    },
    red: {
      bg: "#fee2e2", // Red 100
      text: "#991b1b", // Red 800
      border: "#fecaca", // Red 200
      solid: "#ef4444", // Red 500
    },
  },

  // Disease specific colors (Telemetry visual grouping)
  diagnosis: {
    asthma: "#2563eb",         // Blue 600
    copd: "#d97706",           // Amber 600
    ild: "#7c3aed",            // Violet 600
    bronchiectasis: "#059669", // Emerald 600
    post_icu: "#4f46e5",       // Indigo 600
  },

  // UI Surfaces & Accessible Typography
  ui: {
    background: "#f8fafc",     // Neutral slate canvas
    surface: "#ffffff",        // Pure white card & panel surface
    surfaceHighlight: "#f1f5f9",// Sub-section headers / table header fill
    border: "#e2e8f0",         // Subtle dividers
    borderStrong: "#cbd5e1",   // Form input outlines & active card borders
    textPrimary: "#0f172a",    // Slate 900 (High contrast clinical reading)
    textSecondary: "#475569",  // Slate 600 (Supporting body copy)
    textMuted: "#64748b",      // Slate 500 (Captions, units, timestamps)
    focusRing: "#2a75d3",      // Accessible 2px focus outline
    error: "#dc2626",          // Accessible clinical error red
    errorLight: "#fef2f2",     // Error banner fill
    warning: "#d97706",        // Amber warning
    warningLight: "#fffbeb",   // Warning banner fill
    success: "#16a34a",        // Reassuring green
    successLight: "#f0fdf4",   // Success toast fill
  },
} as const;

export type ColorTokens = typeof colors;
