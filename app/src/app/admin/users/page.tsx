import { redirect } from "next/navigation";
import { UsersManager } from "@/components/admin/users-manager";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canUser(user, "user:manage")) {
    redirect("/artworks");
  }

  const users = await prisma.adminUser.findMany({
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-2xl font-semibold">Users</h1>
      <UsersManager
        initialUsers={users.map((item) => ({
          id: item.id,
          email: item.email,
          role: item.role,
          created_at: item.createdAt.toISOString(),
          updated_at: item.updatedAt.toISOString(),
        }))}
      />
    </main>
  );
}
