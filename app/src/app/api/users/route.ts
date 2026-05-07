import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createUserSchema, zodErrorDetails } from "@/lib/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "user:manage")) {
    return apiError("FORBIDDEN", "Not allowed to manage users.", 403);
  }

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ok({
    items: users.map((item) => ({
      id: item.id,
      email: item.email,
      role: item.role,
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "user:manage")) {
    return apiError("FORBIDDEN", "Not allowed to manage users.", 403);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid user payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const created = await prisma.adminUser.create({
      data: {
        id: randomUUID(),
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok(
      {
        id: created.id,
        email: created.email,
        role: created.role,
        created_at: created.createdAt.toISOString(),
        updated_at: created.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("VALIDATION_ERROR", "Email is already in use.", 400);
    }
    throw error;
  }
}
