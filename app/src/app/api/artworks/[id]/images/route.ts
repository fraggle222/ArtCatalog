import { randomUUID } from "node:crypto";
import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl, storeUploadedImage } from "@/lib/uploads";
import { reorderImagesSchema, zodErrorDetails } from "@/lib/validation";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/artworks/[id]/images">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artwork:update")) {
    return apiError("FORBIDDEN", "Not allowed to update artworks.", 403);
  }

  const { id } = await ctx.params;
  const artwork = await prisma.artwork.findUnique({ where: { id } });
  if (!artwork) {
    return apiError("NOT_FOUND", "Artwork not found.", 404);
  }

  const formData = await req.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return apiError("VALIDATION_ERROR", "No image files provided.", 400);
  }

  const existingCount = await prisma.artworkImage.count({
    where: { artworkId: id },
  });

  const createdImages = [];
  for (const [index, file] of files.entries()) {
    if (!file.size) {
      continue;
    }

    let stored: { storageKey: string; url: string };
    try {
      stored = await storeUploadedImage(file);
    } catch {
      return apiError(
        "VALIDATION_ERROR",
        "Only jpg/png/webp images are supported.",
        400
      );
    }

    const image = await prisma.artworkImage.create({
      data: {
        id: randomUUID(),
        artworkId: id,
        storageKey: stored.storageKey,
        url: stored.url,
        sortOrder: existingCount + index,
        isPrimary: existingCount === 0 && index === 0,
      },
    });
    createdImages.push(image);
  }

  return ok(
    {
      images: await Promise.all(
        createdImages.map(async (image) => ({
          id: image.id,
          artwork_id: image.artworkId,
          storage_key: image.storageKey,
          url: await resolveImageUrl(image.storageKey, image.url),
          sort_order: image.sortOrder,
          is_primary: image.isPrimary,
          created_at: image.createdAt.toISOString(),
          updated_at: image.updatedAt.toISOString(),
        }))
      ),
    },
    { status: 201 }
  );
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/artworks/[id]/images">
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

  const parsed = reorderImagesSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid reorder payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const existingImages = await prisma.artworkImage.findMany({
    where: { artworkId: id },
  });
  if (existingImages.length === 0) {
    return apiError("NOT_FOUND", "No artwork images found.", 404);
  }

  const existingIds = new Set(existingImages.map((image) => image.id));
  const requestedIds = parsed.data.imageIds;
  const allIdsMatch =
    requestedIds.length === existingImages.length &&
    requestedIds.every((imageId) => existingIds.has(imageId));
  if (!allIdsMatch) {
    return apiError(
      "VALIDATION_ERROR",
      "imageIds must include all existing image IDs exactly once.",
      400
    );
  }

  const primaryImageId = parsed.data.primaryImageId ?? requestedIds[0];
  if (!existingIds.has(primaryImageId)) {
    return apiError(
      "VALIDATION_ERROR",
      "primaryImageId must belong to this artwork.",
      400
    );
  }

  await prisma.$transaction(
    requestedIds.map((imageId, index) =>
      prisma.artworkImage.update({
        where: { id: imageId },
        data: {
          sortOrder: index,
          isPrimary: imageId === primaryImageId,
        },
      })
    )
  );

  const images = await prisma.artworkImage.findMany({
    where: { artworkId: id },
    orderBy: { sortOrder: "asc" },
  });

  return ok({
    images: await Promise.all(
      images.map(async (image) => ({
        id: image.id,
        artwork_id: image.artworkId,
        storage_key: image.storageKey,
        url: await resolveImageUrl(image.storageKey, image.url),
        sort_order: image.sortOrder,
        is_primary: image.isPrimary,
        created_at: image.createdAt.toISOString(),
        updated_at: image.updatedAt.toISOString(),
      }))
    ),
  });
}
