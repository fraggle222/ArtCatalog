import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { UserRole } from "@/generated/prisma/client";
import { requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "art_catalog_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  userId: string;
  exp: number;
};

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
};

function toBase64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  const sessionSecret = requireEnv("SESSION_SECRET");
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(payload)
    .digest("base64url");
}

function encodeSession(session: SessionPayload) {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  if (sign(payload) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!parsed.userId || typeof parsed.exp !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encodeSession({ userId, exp });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const decoded = decodeSession(token);
  if (!decoded || decoded.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return prisma.adminUser.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true },
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return null;
  }

  return { id: user.id, email: user.email, role: user.role };
}
