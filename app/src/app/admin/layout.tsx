import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/admin/app-navbar";
import { getSessionUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <AppNavbar user={user} />
      {children}
    </>
  );
}
