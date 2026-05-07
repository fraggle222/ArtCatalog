import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { getFavoriteListAccess } from "@/lib/favorite-list-access";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]/artworks/[artworkId]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id, artworkId } = await ctx.params;
  const access = await getFavoriteListAccess(id, user);
  if (!access) {
    return apiError("NOT_FOUND", "Favorite list not found.", 404);
  }
  if (!access.canEditListContent) {
    return apiError("FORBIDDEN", "Not allowed to edit this favorite list.", 403);
  }

  const existing = await prisma.favoriteListArtwork.findUnique({
    where: {
      favoriteListId_artworkId: {
        favoriteListId: id,
        artworkId,
      },
    },
  });
  if (!existing) {
    return apiError("NOT_FOUND", "Artwork is not in this favorite list.", 404);
  }

  await prisma.favoriteListArtwork.delete({
    where: {
      favoriteListId_artworkId: {
        favoriteListId: id,
        artworkId,
      },
    },
  });

  const remaining = await prisma.favoriteListArtwork.findMany({
    where: { favoriteListId: id },
    orderBy: { sortOrder: "asc" },
    select: { artworkId: true },
  });

  await prisma.$transaction(
    remaining.map((item, index) =>
      prisma.favoriteListArtwork.update({
        where: {
          favoriteListId_artworkId: {
            favoriteListId: id,
            artworkId: item.artworkId,
          },
        },
        data: { sortOrder: index },
      })
    )
  );

  return ok({ success: true });
}

