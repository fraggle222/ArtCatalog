import { apiError, ok } from "@/lib/api";
import { mapArtworkBase } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { LOCATION_PRESET_OPTIONS } from "@/lib/location-options";
import { MEDIUM_PRESET_OPTIONS } from "@/lib/medium-options";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteStoredImage, resolveImageUrl } from "@/lib/uploads";
import { updateArtworkSchema, zodErrorDetails } from "@/lib/validation";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/artworks/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artwork:read")) {
    return apiError("FORBIDDEN", "Not allowed to view artworks.", 403);
  }

  const { id } = await ctx.params;
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      artist: true,
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!artwork) {
    return apiError("NOT_FOUND", "Artwork not found.", 404);
  }

  return ok({
    ...mapArtworkBase(artwork),
    images: await Promise.all(
      artwork.images.map(async (image) => ({
        url: await resolveImageUrl(image.storageKey, image.url),
        thumbnail_url:
          image.thumbnailStorageKey && image.thumbnailUrl
            ? await resolveImageUrl(image.thumbnailStorageKey, image.thumbnailUrl)
            : await resolveImageUrl(image.storageKey, image.url),
        id: image.id,
        artwork_id: image.artworkId,
        storage_key: image.storageKey,
        sort_order: image.sortOrder,
        is_primary: image.isPrimary,
        created_at: image.createdAt.toISOString(),
        updated_at: image.updatedAt.toISOString(),
      }))
    ),
  });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/artworks/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artwork:update")) {
    return apiError("FORBIDDEN", "Not allowed to update artworks.", 403);
  }

  const { id } = await ctx.params;
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = updateArtworkSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid artwork payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  if (
    parsed.data.medium_preset &&
    !(MEDIUM_PRESET_OPTIONS as readonly string[]).includes(
      parsed.data.medium_preset
    )
  ) {
    return apiError("VALIDATION_ERROR", "Unsupported medium preset.", 400);
  }
  if (
    parsed.data.location_preset &&
    !(LOCATION_PRESET_OPTIONS as readonly string[]).includes(
      parsed.data.location_preset
    )
  ) {
    return apiError("VALIDATION_ERROR", "Unsupported location preset.", 400);
  }

  if (parsed.data.artist_id) {
    const artist = await prisma.artist.findUnique({
      where: { id: parsed.data.artist_id },
      select: { id: true },
    });
    if (!artist) {
      return apiError("VALIDATION_ERROR", "Selected artist was not found.", 400);
    }
  }

  try {
    const updated = await prisma.artwork.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined
          ? {
              title:
                parsed.data.title_unknown === true ? null : parsed.data.title,
            }
          : {}),
        ...(parsed.data.title_unknown !== undefined
          ? { titleUnknown: parsed.data.title_unknown }
          : {}),
        ...(parsed.data.artist_id !== undefined
          ? { artistId: parsed.data.artist_id }
          : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.medium_preset !== undefined
          ? { mediumPreset: parsed.data.medium_preset }
          : {}),
        ...(parsed.data.medium_custom !== undefined
          ? { mediumCustom: parsed.data.medium_custom }
          : {}),
        ...(parsed.data.location_preset !== undefined
          ? { locationPreset: parsed.data.location_preset }
          : {}),
        ...(parsed.data.location_custom !== undefined
          ? { locationCustom: parsed.data.location_custom }
          : {}),
        ...(parsed.data.dimensions_text !== undefined
          ? { dimensionsText: parsed.data.dimensions_text }
          : {}),
        ...(parsed.data.dimensions_unknown !== undefined
          ? { dimensionsUnknown: parsed.data.dimensions_unknown }
          : {}),
        ...(parsed.data.framed !== undefined
          ? { framed: parsed.data.framed }
          : {}),
        ...(parsed.data.year_created !== undefined
          ? { yearCreated: parsed.data.year_created }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      },
      include: { artist: true },
    });

    return ok(mapArtworkBase(updated));
  } catch {
    return apiError("NOT_FOUND", "Artwork not found.", 404);
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/artworks/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artwork:delete")) {
    return apiError("FORBIDDEN", "Not allowed to delete artworks.", 403);
  }

  const { id } = await ctx.params;

  try {
    const images = await prisma.artworkImage.findMany({
      where: { artworkId: id },
      select: { storageKey: true, thumbnailStorageKey: true },
    });

    await prisma.artwork.delete({ where: { id } });
    await Promise.all(
      images.flatMap((image) => [
        deleteStoredImage(image.storageKey),
        image.thumbnailStorageKey
          ? deleteStoredImage(image.thumbnailStorageKey)
          : Promise.resolve(),
      ])
    );
    return ok({ success: true });
  } catch {
    return apiError("NOT_FOUND", "Artwork not found.", 404);
  }
}
