import { apiError, ok } from "@/lib/api";
import { mapArtworkBase } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { getFavoriteListAccess } from "@/lib/favorite-list-access";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";
import { updateFavoriteListSchema, zodErrorDetails } from "@/lib/validation";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await ctx.params;
  const access = await getFavoriteListAccess(id, user);
  if (!access) {
    return apiError("NOT_FOUND", "Favorite list not found.", 404);
  }
  if (!access.canView) {
    return apiError("FORBIDDEN", "Not allowed to view this favorite list.", 403);
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
    return apiError("NOT_FOUND", "Favorite list not found.", 404);
  }

  return ok({
    id: list.id,
    name: list.name,
    owner: list.owner,
    can_edit_settings: access.canEditListSettings,
    can_edit_content: access.canEditListContent,
    created_at: list.createdAt.toISOString(),
    updated_at: list.updatedAt.toISOString(),
    members: list.members.map((member) => ({
      user_id: member.user.id,
      email: member.user.email,
      role: member.user.role,
      access: member.access,
      created_at: member.createdAt.toISOString(),
    })),
    artworks: await Promise.all(
      list.artworks.map(async (item) => {
        const firstImage = item.artwork.images[0];
        return {
          artwork_id: item.artworkId,
          sort_order: item.sortOrder,
          artwork: {
            ...mapArtworkBase(item.artwork),
            primary_image_url: firstImage
              ? await resolveImageUrl(firstImage.storageKey, firstImage.url)
              : null,
          },
        };
      })
    ),
  });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await ctx.params;
  const access = await getFavoriteListAccess(id, user);
  if (!access) {
    return apiError("NOT_FOUND", "Favorite list not found.", 404);
  }
  if (!access.canEditListSettings) {
    return apiError("FORBIDDEN", "Not allowed to edit this favorite list.", 403);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = updateFavoriteListSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid favorite list payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const updated = await prisma.favoriteList.update({
    where: { id },
    data: {
      name: parsed.data.name,
    },
  });

  return ok({
    id: updated.id,
    name: updated.name,
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await ctx.params;
  const access = await getFavoriteListAccess(id, user);
  if (!access) {
    return apiError("NOT_FOUND", "Favorite list not found.", 404);
  }
  if (!access.canEditListSettings) {
    return apiError("FORBIDDEN", "Not allowed to delete this favorite list.", 403);
  }

  await prisma.favoriteList.delete({ where: { id } });
  return ok({ success: true });
}

