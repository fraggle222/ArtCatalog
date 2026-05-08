import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { env } from "@/lib/env";
import {
  deleteObjectFromR2,
  getSignedR2Url,
  r2PlaceholderUrl,
  uploadBufferToR2,
} from "@/lib/r2";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type StoredImage = {
  storageKey: string;
  url: string;
  thumbnailStorageKey: string;
  thumbnailUrl: string;
};

function getUploadDirAbsolute() {
  return path.resolve(process.cwd(), env.uploadDir);
}

function toPublicUrl(fileName: string) {
  const normalized = env.uploadDir.replaceAll("\\", "/").replace(/^\.\//, "");
  const publicPath = normalized.startsWith("public/")
    ? normalized.slice("public/".length)
    : normalized;
  return `/${publicPath}/${fileName}`;
}

export async function storeUploadedImage(file: File): Promise<StoredImage> {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Unsupported image type.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const input = Buffer.from(arrayBuffer);

  const outputBuffer = await sharp(input)
    .rotate()
    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const thumbnailBuffer = await sharp(input)
    .rotate()
    .resize(320, 320, { fit: "cover", withoutEnlargement: false })
    .jpeg({ quality: 72 })
    .toBuffer();

  const fileStem = randomUUID();
  const fileName = `${fileStem}.jpg`;
  const thumbnailFileName = `${fileStem}_thumb.jpg`;

  if (env.storageMode === "r2") {
    await uploadBufferToR2(fileName, outputBuffer, "image/jpeg");
    await uploadBufferToR2(thumbnailFileName, thumbnailBuffer, "image/jpeg");
    return {
      storageKey: fileName,
      url: r2PlaceholderUrl(fileName),
      thumbnailStorageKey: thumbnailFileName,
      thumbnailUrl: r2PlaceholderUrl(thumbnailFileName),
    };
  }

  const targetDir = getUploadDirAbsolute();
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, fileName), outputBuffer);
  await writeFile(path.join(targetDir, thumbnailFileName), thumbnailBuffer);

  return {
    storageKey: fileName,
    url: toPublicUrl(fileName),
    thumbnailStorageKey: thumbnailFileName,
    thumbnailUrl: toPublicUrl(thumbnailFileName),
  };
}

export async function deleteStoredImage(storageKey: string) {
  if (env.storageMode === "r2") {
    await deleteObjectFromR2(storageKey);
    return;
  }

  const absolutePath = path.join(getUploadDirAbsolute(), storageKey);
  try {
    await unlink(absolutePath);
  } catch {
    // File may already be missing.
  }
}

export async function resolveImageUrl(storageKey: string, fallbackUrl: string) {
  if (env.storageMode !== "r2") {
    return fallbackUrl;
  }
  return getSignedR2Url(storageKey);
}
