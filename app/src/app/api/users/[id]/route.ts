import bcrypt from "bcryptjs";
import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateUserSchema, zodErrorDetails } from "@/lib/validation";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/users/[id]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "user:manage")) {
    return apiError("FORBIDDEN", "Not allowed to manage users.", 403);
  }

  const { id } = await ctx.params;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid user payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const passwordHash =
    parsed.data.password !== undefined
      ? await bcrypt.hash(parsed.data.password, 12)
      : undefined;

  try {
    const updated = await prisma.adminUser.update({
      where: { id },
      data: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    });
  } catch {
    return apiError("NOT_FOUND", "User not found.", 404);
  }
}
