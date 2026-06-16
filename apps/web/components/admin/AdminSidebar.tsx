"use client";

import { useEffect, useCallback } from "react";
import { LayoutDashboard, Stethoscope, Users, Download } from "lucide-react";
import type { AdminView } from "@/app/admindashboard/AdminDashboardClient";
import styles from "./AdminSidebar.module.css";

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  /** mobile drawer open state — managed by parent */
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

const NAV_ITEMS: {
  id: AdminView;
  icon: React.ElementType;
  label: string;
}[] = [
  { id: "overview", icon: LayoutDashboard, label: "Overview" },
  { id: "doctors",  icon: Stethoscope,    label: "Doctors"  },
  { id: "patients", icon: Users,          label: "Patients" },
  { id: "export",   icon: Download,       label: "Export"   },
];

export function AdminSidebar({
  activeView,
  onViewChange,
  drawerOpen = false,
  onDrawerClose,
}: AdminSidebarProps) {
  /* Close drawer on Escape */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) onDrawerClose?.();
    },
    [drawerOpen, onDrawerClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (id: AdminView) => {
    onViewChange(id);
    onDrawerClose?.();
  };

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${activeView === item.id ? styles.navItemActive : ""}`}
                title={item.label}
                onClick={() => onViewChange(item.id)}
              >
                <div className={styles.iconWrap}>
                  <Icon size={18} strokeWidth={1.6} />
                </div>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className={styles.overlay}
            onClick={onDrawerClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Menu</span>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={onDrawerClose}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className={styles.drawerNav}>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.drawerNavItem} ${activeView === item.id ? styles.drawerNavItemActive : ""}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <div className={styles.drawerIconWrap}>
                      <Icon size={18} strokeWidth={1.6} />
                    </div>
                    <span className={styles.drawerNavLabel}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
