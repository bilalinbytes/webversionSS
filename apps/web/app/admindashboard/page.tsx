import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminToken, ADMIN_COOKIE, ADMIN_NAME, ADMIN_EMAIL } from "@/lib/admin-auth";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  if (!verifyAdminToken(token)) {
    redirect("/admin/login");
  }

  return (
    <AdminDashboardClient
      adminName={ADMIN_NAME}
      adminEmail={ADMIN_EMAIL}
    />
  );
}
