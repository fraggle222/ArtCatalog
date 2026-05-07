import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { getFavoriteListAccess } from "@/lib/favorite-list-access";
import { prisma } from "@/lib/prisma";
import { addFavoriteListMemberSchema, zodErrorDetails } from "@/lib/validation";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]/members">
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

  const members = await prisma.favoriteListMember.findMany({
    where: { favoriteListId: id },
    include: {
      user: {
        select: { id: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok({
    items: members.map((member) => ({
      user_id: member.user.id,
      email: member.user.email,
      role: member.user.role,
      access: member.access,
      created_at: member.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/favorite-lists/[id]/members">
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

  const parsed = addFavoriteListMemberSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid list member payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const memberUser = await prisma.adminUser.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, role: true },
  });
  if (!memberUser) {
    return apiError("VALIDATION_ERROR", "User not found.", 400);
  }

  const existing = await prisma.favoriteListMember.findUnique({
    where: {
      favoriteListId_userId: {
        favoriteListId: id,
        userId: parsed.data.userId,
      },
    },
  });
  if (existing) {
    return apiError("VALIDATION_ERROR", "User is already a list member.", 400);
  }

  const created = await prisma.favoriteListMember.create({
    data: {
      favoriteListId: id,
      userId: parsed.data.userId,
    },
    include: {
      user: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  return ok(
    {
      user_id: created.user.id,
      email: created.user.email,
      role: created.user.role,
      access: created.access,
      created_at: created.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

