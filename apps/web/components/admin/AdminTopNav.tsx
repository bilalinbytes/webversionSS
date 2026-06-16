"use client";

import { ShieldCheck, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AdminView } from "@/app/admindashboard/AdminDashboardClient";
import styles from "./AdminTopNav.module.css";

interface AdminTopNavProps {
  adminName: string;
  adminEmail: string;
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  /** Called when hamburger button is tapped on mobile */
  onMenuOpen?: () => void;
}

export function AdminTopNav({
  adminName,
  adminEmail,
  activeView,
  onViewChange,
  onMenuOpen,
}: AdminTopNavProps) {
  void activeView;
  void onViewChange;
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <header className={styles.nav}>
      {/* Hamburger — visible only on mobile via CSS */}
      <button
        type="button"
        className={styles.hamburgerBtn}
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
      >
        <Menu size={22} strokeWidth={1.8} />
      </button>

      <div className={styles.left}>
        <div className={styles.badge}>
          <ShieldCheck size={14} strokeWidth={1.8} />
          <span>Super Admin</span>
        </div>
        <div className={styles.divider} aria-hidden="true" />
        <p className={styles.title}>Command Center</p>
      </div>

      <div className={styles.right}>
        <div className={styles.adminInfo}>
          <p className={styles.adminName}>{adminName}</p>
          <p className={styles.adminEmail}>{adminEmail}</p>
        </div>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut size={15} strokeWidth={1.7} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
