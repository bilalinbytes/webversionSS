/**
 * O2Plus Color Tokens
 *
 * Single source of truth for semantic colors across web and mobile.
 */

export const colors = {
  // Brand colors
  brand: {
    primary: "#0284c7", // Sky 600
    primaryLight: "#e0f2fe", // Sky 100
    primaryDark: "#0369a1", // Sky 700
  },

  // Risk levels (Scoring engine indicator colors)
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

  // Disease specific colors (Optional, for visual grouping)
  diagnosis: {
    asthma: "#3b82f6", // Blue 500
    copd: "#f59e0b", // Amber 500
    ild: "#8b5cf6", // Violet 500
    bronchiectasis: "#10b981", // Emerald 500
    post_icu: "#6366f1", // Indigo 500
  },

  // UI Basics
  ui: {
    background: "#ffffff",
    surface: "#f8fafc",
    surfaceHighlight: "#f1f5f9",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#64748b",
    error: "#ef4444",
    success: "#22c55e",
  },
} as const;
