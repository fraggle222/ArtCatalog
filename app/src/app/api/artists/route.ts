import { randomUUID } from "node:crypto";
import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  createArtistSchema,
  zodErrorDetails,
} from "@/lib/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artist:read")) {
    return apiError("FORBIDDEN", "Not allowed to view artists.", 403);
  }

  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
  });

  return ok({
    items: artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      birth_year: artist.birthYear,
      death_year: artist.deathYear,
      created_at: artist.createdAt.toISOString(),
      updated_at: artist.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artist:create")) {
    return apiError("FORBIDDEN", "Not allowed to create artists.", 403);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = createArtistSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid artist payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const artist = await prisma.artist.create({
    data: {
      id: randomUUID(),
      name: parsed.data.name,
      birthYear: parsed.data.birth_year ?? null,
      deathYear: parsed.data.death_year ?? null,
    },
  });

  return ok(
    {
      id: artist.id,
      name: artist.name,
      birth_year: artist.birthYear,
      death_year: artist.deathYear,
      created_at: artist.createdAt.toISOString(),
      updated_at: artist.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
