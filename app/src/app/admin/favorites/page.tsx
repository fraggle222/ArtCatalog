import { redirect } from "next/navigation";
import { FavoriteListsManager } from "@/components/admin/favorite-lists-manager";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FavoritesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const lists = await prisma.favoriteList.findMany({
    where:
      user.role === "admin"
        ? undefined
        : {
            OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
          },
    orderBy: { updatedAt: "desc" },
    include: {
      members: {
        where: { userId: user.id },
        select: { userId: true },
      },
      owner: {
        select: { id: true, email: true },
      },
      _count: {
        select: { members: true, artworks: true },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-2xl font-semibold">Favorite Lists</h1>
      <FavoriteListsManager
        initialLists={lists.map((list) => ({
          id: list.id,
          name: list.name,
          owner: list.owner,
          can_edit_settings: user.role === "admin" || list.ownerId === user.id,
          can_edit_content:
            user.role === "admin" ||
            list.ownerId === user.id ||
            (user.role === "editor" && list.members.length > 0),
          artwork_count: list._count.artworks,
          member_count: list._count.members,
          created_at: list.createdAt.toISOString(),
          updated_at: list.updatedAt.toISOString(),
        }))}
      />
    </main>
  );
}

