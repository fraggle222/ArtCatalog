import { apiError, ok } from "@/lib/api";
import { mapArtworkBase } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { getFavoriteListAccess } from "@/lib/favorite-list-access";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";
import {
  addFavoriteListArtworkSchema,
  reorderFavoriteListArtworksSchema,
  zodErrorDetails,
} from "@/lib/validation";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]/artworks">
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
  if (!access.canEditListContent) {
    return apiError("FORBIDDEN", "Not allowed to edit this favorite list.", 403);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = addFavoriteListArtworkSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid list artwork payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const artwork = await prisma.artwork.findUnique({
    where: { id: parsed.data.artworkId },
    include: {
      artist: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });
  if (!artwork) {
    return apiError("VALIDATION_ERROR", "Artwork not found.", 400);
  }

  const existing = await prisma.favoriteListArtwork.findUnique({
    where: {
      favoriteListId_artworkId: {
        favoriteListId: id,
        artworkId: parsed.data.artworkId,
      },
    },
  });
  if (existing) {
    return apiError("VALIDATION_ERROR", "Artwork already exists in this list.", 400);
  }

  const count = await prisma.favoriteListArtwork.count({
    where: { favoriteListId: id },
  });

  const created = await prisma.favoriteListArtwork.create({
    data: {
      favoriteListId: id,
      artworkId: parsed.data.artworkId,
      sortOrder: count,
    },
  });

  const firstImage = artwork.images[0];

  return ok(
    {
      artwork_id: created.artworkId,
      sort_order: created.sortOrder,
      artwork: {
        ...mapArtworkBase(artwork),
        primary_image_url: firstImage
          ? await resolveImageUrl(firstImage.storageKey, firstImage.url)
          : null,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]/artworks">
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
  if (!access.canEditListContent) {
    return apiError("FORBIDDEN", "Not allowed to edit this favorite list.", 403);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = reorderFavoriteListArtworksSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid reorder payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const existing = await prisma.favoriteListArtwork.findMany({
    where: { favoriteListId: id },
    orderBy: { sortOrder: "asc" },
    select: { artworkId: true },
  });
  if (existing.length === 0) {
    return apiError("NOT_FOUND", "No artworks found in this favorite list.", 404);
  }

  const requestedIds = parsed.data.artworkIds;
  const existingIds = new Set(existing.map((item) => item.artworkId));
  const allIdsMatch =
    requestedIds.length === existing.length &&
    requestedIds.every((artworkId) => existingIds.has(artworkId));
  if (!allIdsMatch) {
    return apiError(
      "VALIDATION_ERROR",
      "artworkIds must include all list artworks exactly once.",
      400
    );
  }

  await prisma.$transaction(
    requestedIds.map((artworkId, index) =>
      prisma.favoriteListArtwork.update({
        where: {
          favoriteListId_artworkId: {
            favoriteListId: id,
            artworkId,
          },
        },
        data: { sortOrder: index },
      })
    )
  );

  const updated = await prisma.favoriteListArtwork.findMany({
    where: { favoriteListId: id },
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
  });

  return ok({
    items: await Promise.all(
      updated.map(async (item) => {
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

