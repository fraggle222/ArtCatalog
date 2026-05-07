import { apiError, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteStoredImage } from "@/lib/uploads";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/artworks/[id]/images/[imageId]">
) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!canUser(user, "artwork:delete")) {
    return apiError("FORBIDDEN", "Not allowed to delete artwork images.", 403);
  }

  const { id, imageId } = await ctx.params;
  const image = await prisma.artworkImage.findFirst({
    where: { id: imageId, artworkId: id },
  });
  if (!image) {
    return apiError("NOT_FOUND", "Artwork image not found.", 404);
  }

  await prisma.artworkImage.delete({ where: { id: imageId } });
  await deleteStoredImage(image.storageKey);

  const remaining = await prisma.artworkImage.findMany({
    where: { artworkId: id },
    orderBy: { sortOrder: "asc" },
  });

  if (remaining.length > 0 && !remaining.some((item) => item.isPrimary)) {
    await prisma.artworkImage.update({
      where: { id: remaining[0].id },
      data: { isPrimary: true },
    });
  }

  return ok({ success: true });
}
