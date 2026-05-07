import { randomUUID } from "node:crypto";
import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { createFavoriteListSchema, zodErrorDetails } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const lists = await prisma.favoriteList.findMany({
    where:
      user.role === "admin"
        ? undefined
        : {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } },
            ],
          },
    orderBy: { updatedAt: "desc" },
    include: {
      members: {
        where: { userId: user.id },
        select: { userId: true },
      },
      owner: {
        select: { id: true, email: true },
      },
      _count: {
        select: { members: true, artworks: true },
      },
    },
  });

  return ok({
    items: lists.map((list) => ({
      id: list.id,
      name: list.name,
      owner: list.owner,
      can_edit_settings: user.role === "admin" || list.ownerId === user.id,
      can_edit_content:
        user.role === "admin" ||
        list.ownerId === user.id ||
        (user.role === "editor" && list.members.length > 0),
      artwork_count: list._count.artworks,
      member_count: list._count.members,
      created_at: list.createdAt.toISOString(),
      updated_at: list.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = createFavoriteListSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid favorite list payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const created = await prisma.favoriteList.create({
    data: {
      id: randomUUID(),
      name: parsed.data.name,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
        },
      },
    },
    include: {
      owner: {
        select: { id: true, email: true },
      },
      _count: {
        select: { members: true, artworks: true },
      },
    },
  });

  return ok(
    {
      id: created.id,
      name: created.name,
      owner: created.owner,
      can_edit_settings: true,
      can_edit_content: true,
      artwork_count: created._count.artworks,
      member_count: created._count.members,
      created_at: created.createdAt.toISOString(),
      updated_at: created.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}

