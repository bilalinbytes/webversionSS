"use client";

import { useState } from "react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverviewView } from "@/components/admin/AdminOverviewView";
import { AdminDoctorsView } from "@/components/admin/AdminDoctorsView";
import { AdminPatientsView } from "@/components/admin/AdminPatientsView";
import { AdminExportView } from "@/components/admin/AdminExportView";
import styles from "./page.module.css";

export type AdminView = "overview" | "doctors" | "patients" | "export";

interface AdminDashboardClientProps {
  adminName: string;
  adminEmail: string;
}

export function AdminDashboardClient({
  adminName,
  adminEmail,
}: AdminDashboardClientProps) {
  const [view, setView] = useState<AdminView>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <AdminTopNav
        adminName={adminName}
        adminEmail={adminEmail}
        activeView={view}
        onViewChange={setView}
        onMenuOpen={() => setDrawerOpen(true)}
      />
      <div className={styles.body}>
        <AdminSidebar
          activeView={view}
          onViewChange={setView}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
        />
        <main className={styles.main}>
          {view === "overview" && <AdminOverviewView onViewChange={setView} />}
          {view === "doctors"  && <AdminDoctorsView />}
          {view === "patients" && <AdminPatientsView />}
          {view === "export"   && <AdminExportView />}
        </main>
      </div>
    </div>
  );
}
