import { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getFavoriteListAccess(listId: string, user: SessionUser) {
  const list = await prisma.favoriteList.findUnique({
    where: { id: listId },
    include: {
      members: {
        where: { userId: user.id },
        select: { userId: true },
      },
    },
  });

  if (!list) {
    return null;
  }

  const isOwner = list.ownerId === user.id;
  const isAdmin = user.role === "admin";
  const isMember = list.members.length > 0;
  const isEditorMember = isMember && user.role === "editor";
  const canEditListSettings = isAdmin || isOwner;
  const canEditListContent = canEditListSettings || isEditorMember;

  return {
    list,
    isOwner,
    isAdmin,
    isMember,
    isEditorMember,
    canView: isAdmin || isOwner || isMember,
    canEditListSettings,
    canEditListContent,
  };
}

