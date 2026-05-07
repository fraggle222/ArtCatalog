import { UserRole } from "@/generated/prisma/client";
import { SessionUser } from "@/lib/auth";

export type Permission =
  | "artwork:read"
  | "artwork:create"
  | "artwork:update"
  | "artwork:delete"
  | "artist:read"
  | "artist:create"
  | "artist:update"
  | "artist:delete"
  | "user:manage";

const permissionRoles: Record<Permission, UserRole[]> = {
  "artwork:read": [UserRole.admin, UserRole.editor, UserRole.viewer],
  "artwork:create": [UserRole.admin, UserRole.editor],
  "artwork:update": [UserRole.admin, UserRole.editor],
  "artwork:delete": [UserRole.admin],
  "artist:read": [UserRole.admin, UserRole.editor, UserRole.viewer],
  "artist:create": [UserRole.admin, UserRole.editor],
  "artist:update": [UserRole.admin, UserRole.editor],
  "artist:delete": [UserRole.admin],
  "user:manage": [UserRole.admin],
};

export function canUser(user: SessionUser, permission: Permission) {
  return permissionRoles[permission].includes(user.role);
}

export function hasCatalogWriteAccess(user: SessionUser) {
  return canUser(user, "artwork:create");
}

