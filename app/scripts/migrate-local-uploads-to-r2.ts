import "dotenv/config";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "../src/generated/prisma/client";
import { r2PlaceholderUrl, uploadBufferToR2 } from "../src/lib/r2";

const prisma = new PrismaClient();

function isLocalUploadUrl(url: string) {
  return url.startsWith("/uploads/") || url.startsWith("/public/uploads/");
}

function resolveLocalPath(url: string, storageKey: string) {
  if (url.startsWith("/uploads/")) {
    return path.join(process.cwd(), "public", url.slice(1));
  }
  if (url.startsWith("/public/uploads/")) {
    return path.join(process.cwd(), url.slice(1));
  }
  return path.join(process.cwd(), "public", "uploads", storageKey);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const images = await prisma.artworkImage.findMany({
    select: { id: true, storageKey: true, url: true },
  });
  const localImages = images.filter((image) => isLocalUploadUrl(image.url));

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const image of localImages) {
    const localPath = resolveLocalPath(image.url, image.storageKey);
    try {
      const file = await readFile(localPath);
      if (!dryRun) {
        await uploadBufferToR2(image.storageKey, file, "image/jpeg");
        await prisma.artworkImage.update({
          where: { id: image.id },
          data: { url: r2PlaceholderUrl(image.storageKey) },
        });
      }
      migrated += 1;
      console.log(`${dryRun ? "[dry-run] " : ""}migrated ${image.id}`);
    } catch (error) {
      failed += 1;
      console.error(`failed ${image.id}:`, error);
    }
  }

  skipped = images.length - localImages.length;
  console.log(
    `summary: migrated=${migrated}, failed=${failed}, skipped=${skipped}, dryRun=${dryRun}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
