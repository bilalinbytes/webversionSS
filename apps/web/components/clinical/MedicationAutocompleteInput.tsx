"use client";

import React, { useState, useRef, useEffect } from "react";
import { RESPIRATORY_MEDICATION_PRESETS, RespiratoryMedicationPreset } from "@/lib/clinical/respiratory-medications";
import { Pill, ChevronDown } from "lucide-react";

interface MedicationAutocompleteInputProps {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onChange: (val: string) => void;
  onSelectPreset?: (preset: RespiratoryMedicationPreset) => void;
}

export function MedicationAutocompleteInput({
  value,
  disabled = false,
  placeholder = "e.g. Foracort, Budecort, Pirfenidone",
  className,
  style,
  onChange,
  onSelectPreset,
}: MedicationAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter presets based on user input
  const query = value.trim().toLowerCase();
  const suggestions = query.length === 0
    ? RESPIRATORY_MEDICATION_PRESETS.slice(0, 10)
    : RESPIRATORY_MEDICATION_PRESETS.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.genericName.toLowerCase().includes(query)
      ).slice(0, 12);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (preset: RespiratoryMedicationPreset) => {
    onChange(preset.name);
    if (onSelectPreset) {
      onSelectPreset(preset);
    }
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={className}
          style={{
            width: "100%",
            paddingRight: 24,
            ...style,
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen && !disabled) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={(e) => {
            if (!isOpen) {
              if (e.key === "ArrowDown") setIsOpen(true);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex((prev) => (prev + 1) % Math.max(1, suggestions.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % Math.max(1, suggestions.length));
            } else if (e.key === "Enter" && suggestions[highlightedIndex]) {
              e.preventDefault();
              handleSelect(suggestions[highlightedIndex]);
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
        />
        {!disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen((cur) => !cur)}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Toggle medication suggestions"
          >
            <ChevronDown size={13} />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "#ffffff",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
            maxHeight: 240,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          <div
            style={{
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748b",
              background: "#f8fafc",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Pill size={11} /> Respiratory Formulary Suggestions
          </div>
          {suggestions.map((preset, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={preset.name + idx}
                onClick={() => handleSelect(preset)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  background: isHighlighted ? "#f0f9ff" : "transparent",
                  borderLeft: isHighlighted ? "3px solid #0284c7" : "3px solid transparent",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  transition: "background 100ms ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                    {preset.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: "#e0f2fe",
                      color: "#0369a1",
                    }}
                  >
                    {preset.category}
                  </span>
                </div>
                <span style={{ fontSize: 10.5, color: "#64748b" }}>
                  {preset.genericName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
