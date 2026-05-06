import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function hasExpectedDelegates(client: PrismaClient) {
  const probe = client as unknown as Record<string, unknown>;
  return typeof probe.artist === "object" && typeof probe.artwork === "object";
}

const globalClient = globalThis.prisma;
export const prisma =
  globalClient && hasExpectedDelegates(globalClient)
    ? globalClient
    : new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
