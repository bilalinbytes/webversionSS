import React from "react";

/**
 * O2Plus brand icon — a stylised O₂ molecule inside a teal-to-blue gradient circle,
 * with a bold "+" accent to convey health and enhancement.
 */
export function SaansBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="O2Plus logo"
      role="img"
    >
      <defs>
        <linearGradient id="o2bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0d5c5c" />
          <stop offset="100%" stopColor="#126969" />
        </linearGradient>
        <linearGradient id="o2ring" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5ee8cc" />
          <stop offset="100%" stopColor="#a8f5e5" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="18" cy="18" r="18" fill="url(#o2bg)" />

      {/* Outer O — large ring representing oxygen molecule */}
      <circle cx="14" cy="17" r="6.5" stroke="url(#o2ring)" strokeWidth="2.2" fill="none" />

      {/* Subscript 2 — bold, lower-right of O */}
      <text
        x="21.5"
        y="25"
        fontFamily="'DM Sans', system-ui, sans-serif"
        fontWeight="800"
        fontSize="7.5"
        fill="#5ee8cc"
        letterSpacing="-0.5"
      >
        2
      </text>

      {/* Plus symbol — top-right, white, bold */}
      <line x1="28" y1="8" x2="28" y2="14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="25" y1="11" x2="31" y2="11" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
