import { randomUUID } from "node:crypto";
import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  deleteStoredImage,
  resolveImageUrl,
  storeUploadedImage,
} from "@/lib/uploads";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artwork:create")) {
    return apiError("FORBIDDEN", "Not allowed to create artworks.", 403);
  }

  const formData = await req.formData();
  const artistIdRaw = formData.get("artist_id");
  const artistId = typeof artistIdRaw === "string" ? artistIdRaw.trim() : "";
  if (!artistId) {
    return apiError("VALIDATION_ERROR", "artist_id is required.", 400);
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true },
  });
  if (!artist) {
    return apiError("VALIDATION_ERROR", "Selected artist was not found.", 400);
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return apiError("VALIDATION_ERROR", "At least one image is required.", 400);
  }

  const items: Array<{
    artwork_id: string;
    image_url: string;
    created_at: string;
  }> = [];

  for (const file of files) {
    let storedKeyForCleanup: string | null = null;
    try {
      const stored = await storeUploadedImage(file);
      storedKeyForCleanup = stored.storageKey;
      const created = await prisma.$transaction(async (tx) => {
        const artwork = await tx.artwork.create({
          data: {
            id: randomUUID(),
            title: null,
            titleUnknown: true,
            artistId,
            artistName: null,
            description: null,
            medium: null,
            mediumPreset: null,
            mediumCustom: null,
            dimensionsText: null,
            dimensionsUnknown: true,
            framed: false,
            yearCreated: null,
            status: "draft",
          },
        });

        await tx.artworkImage.create({
          data: {
            id: randomUUID(),
            artworkId: artwork.id,
            storageKey: stored.storageKey,
            url: stored.url,
            sortOrder: 0,
            isPrimary: true,
          },
        });

        return artwork;
      });

      items.push({
        artwork_id: created.id,
        image_url: await resolveImageUrl(stored.storageKey, stored.url),
        created_at: created.createdAt.toISOString(),
      });
    } catch {
      if (storedKeyForCleanup) {
        await deleteStoredImage(storedKeyForCleanup);
      }
      return apiError(
        "VALIDATION_ERROR",
        "Upload failed. Ensure files are valid JPG/PNG/WEBP images.",
        400
      );
    }
  }

  return ok({ items }, { status: 201 });
}
