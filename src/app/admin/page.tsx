import { redirect } from "next/navigation";
import { administrator, currentUser } from "@/lib/account/auth";
import AdminDashboard from "@/components/account/admin-dashboard";
export const metadata = {
  title: "管理中心 · Monetizable",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await administrator())) {
    if (!(await currentUser())) redirect("/auth");
    redirect("/");
  }
  return <AdminDashboard />;
}
