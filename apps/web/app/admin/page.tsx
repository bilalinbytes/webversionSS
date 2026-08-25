import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  if (verifyAdminToken(token)) {
    redirect("/admindashboard");
  } else {
    redirect("/admin/login");
  }
}
