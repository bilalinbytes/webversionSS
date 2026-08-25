"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "info" | "error" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, "info"), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, "error"), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, info, error }}>
      {children}
      {/* Floating Toast Container */}
      <aside
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
          maxWidth: "90vw",
          width: 360,
        }}
      >
        {toasts.map((t) => {
          const isBlue = t.type === "success" || t.type === "info";
          const bg = isBlue ? "linear-gradient(135deg, #1a56b0 0%, #2563eb 100%)" : t.type === "error" ? "#dc2626" : "#d97706";

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                background: bg,
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: 10,
                boxShadow: "0 10px 25px -5px rgba(26, 86, 176, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-dm-sans), system-ui, -apple-system, sans-serif",
                animation: "toastSlideIn 0.25s ease-out forwards",
              }}
            >
              {t.type === "success" && <CheckCircle2 size={18} style={{ color: "#93c5fd", flexShrink: 0 }} />}
              {t.type === "info" && <Info size={18} style={{ color: "#93c5fd", flexShrink: 0 }} />}
              {t.type === "error" && <AlertTriangle size={18} style={{ color: "#fca5a5", flexShrink: 0 }} />}
              <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: () => {},
      success: () => {},
      info: () => {},
      error: () => {},
    };
  }
  return context;
}
