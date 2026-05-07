import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { getFavoriteListAccess } from "@/lib/favorite-list-access";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]/members/[userId]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id, userId } = await ctx.params;
  const access = await getFavoriteListAccess(id, user);
  if (!access) {
    return apiError("NOT_FOUND", "Favorite list not found.", 404);
  }
  if (!access.canEditListSettings) {
    return apiError("FORBIDDEN", "Not allowed to edit this favorite list.", 403);
  }
  if (access.list.ownerId === userId) {
    return apiError("VALIDATION_ERROR", "Cannot remove the list owner.", 400);
  }

  const existing = await prisma.favoriteListMember.findUnique({
    where: {
      favoriteListId_userId: {
        favoriteListId: id,
        userId,
      },
    },
  });
  if (!existing) {
    return apiError("NOT_FOUND", "List member not found.", 404);
  }

  await prisma.favoriteListMember.delete({
    where: {
      favoriteListId_userId: {
        favoriteListId: id,
        userId,
      },
    },
  });

  return ok({ success: true });
}

