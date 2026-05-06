import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updateArtistSchema,
  zodErrorDetails,
} from "@/lib/validation";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/artists/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await ctx.params;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = updateArtistSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid artist payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  try {
    const artist = await prisma.artist.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.birth_year !== undefined
          ? { birthYear: parsed.data.birth_year }
          : {}),
        ...(parsed.data.death_year !== undefined
          ? { deathYear: parsed.data.death_year }
          : {}),
      },
    });

    return ok({
      id: artist.id,
      name: artist.name,
      birth_year: artist.birthYear,
      death_year: artist.deathYear,
      created_at: artist.createdAt.toISOString(),
      updated_at: artist.updatedAt.toISOString(),
    });
  } catch {
    return apiError("NOT_FOUND", "Artist not found.", 404);
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/artists/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await ctx.params;
  const referenceCount = await prisma.artwork.count({
    where: { artistId: id },
  });

  if (referenceCount > 0) {
    return apiError(
      "VALIDATION_ERROR",
      "Artist cannot be deleted while referenced by artworks.",
      400
    );
  }

  try {
    await prisma.artist.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return apiError("NOT_FOUND", "Artist not found.", 404);
  }
}
