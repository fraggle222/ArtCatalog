import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FavoriteListArrange } from "@/components/admin/favorite-list-arrange";
import { displayTitle } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { getFavoriteListAccess } from "@/lib/favorite-list-access";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";

export default async function FavoriteListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const access = await getFavoriteListAccess(id, user);
  if (!access) {
    notFound();
  }
  if (!access.canView) {
    redirect("/admin/favorites");
  }

  const list = await prisma.favoriteList.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      artworks: {
        orderBy: { sortOrder: "asc" },
        include: {
          artwork: {
            include: {
              artist: true,
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!list) {
    notFound();
  }

  const allUsers = access.canEditListSettings
    ? await prisma.adminUser.findMany({
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true },
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div className="mb-4">
        <Link href="/admin/favorites" className="text-sm text-zinc-600 underline">
          Back to favorite lists
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">
        {access.canEditListContent ? "Arrange List" : "View List"}
      </h1>
      <FavoriteListArrange
        initialList={{
          id: list.id,
          name: list.name,
          owner: list.owner,
          can_edit_settings: access.canEditListSettings,
          can_edit_content: access.canEditListContent,
          members: list.members.map((member) => ({
            user_id: member.user.id,
            email: member.user.email,
            role: member.user.role,
            access: member.access,
            created_at: member.createdAt.toISOString(),
          })),
          artworks: await Promise.all(
            list.artworks.map(async (item) => ({
              artwork_id: item.artworkId,
              sort_order: item.sortOrder,
              artwork: {
                id: item.artwork.id,
                display_title: displayTitle(item.artwork),
                artist: item.artwork.artist
                  ? { id: item.artwork.artist.id, name: item.artwork.artist.name }
                  : null,
                primary_image_url: item.artwork.images[0]
                  ? await resolveImageUrl(
                      item.artwork.images[0].storageKey,
                      item.artwork.images[0].url
                    )
                  : null,
              },
            }))
          ),
        }}
        allUsers={allUsers}
      />
    </main>
  );
}

