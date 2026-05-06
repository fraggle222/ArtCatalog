import { randomUUID } from "node:crypto";
import { ArtworkStatus, Prisma } from "@/generated/prisma/client";
import { apiError, ok } from "@/lib/api";
import { mapArtworkBase } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { MEDIUM_PRESET_OPTIONS } from "@/lib/medium-options";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";
import {
  createArtworkSchema,
  zodErrorDetails,
} from "@/lib/validation";

function parseListParams(url: URL) {
  const q = (url.searchParams.get("q") ?? "").trim();
  const medium = (url.searchParams.get("medium") ?? "").trim();
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw === "draft"
      ? ArtworkStatus.draft
      : statusRaw === "published"
        ? ArtworkStatus.published
        : undefined;

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize")) || 20)
  );

  return { q, medium, status, page, pageSize };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { q, medium, status, page, pageSize } = parseListParams(new URL(req.url));
  const where: Prisma.ArtworkWhereInput = {};
  const andFilters: Prisma.ArtworkWhereInput[] = [];

  if (q) {
    andFilters.push({
      OR: [
        { title: { contains: q } },
        { artist: { is: { name: { contains: q } } } },
        { description: { contains: q } },
      ],
    });
  }

  if (medium) {
    andFilters.push({
      OR: [
        { mediumPreset: { contains: medium } },
        { mediumCustom: { contains: medium } },
        { medium: { contains: medium } },
      ],
    });
  }

  if (status) {
    where.status = status;
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const [total, records] = await Promise.all([
    prisma.artwork.count({ where }),
    prisma.artwork.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        artist: true,
        images: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, storageKey: true, url: true, isPrimary: true },
        },
      },
    }),
  ]);

  const items = await Promise.all(records.map(async (record) => {
    const primaryImage =
      record.images.find((img) => img.isPrimary) ?? record.images[0] ?? null;
    return {
      ...mapArtworkBase(record),
      primary_image_url: primaryImage
        ? await resolveImageUrl(primaryImage.storageKey, primaryImage.url)
        : null,
      image_count: record.images.length,
    };
  }));

  return ok({
    items,
    pagination: {
      page,
      pageSize,
      total,
    },
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON payload.", 400);
  }

  const parsed = createArtworkSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid artwork payload.",
      400,
      zodErrorDetails(parsed.error)
    );
  }

  if (
    parsed.data.medium_preset &&
    !(MEDIUM_PRESET_OPTIONS as readonly string[]).includes(
      parsed.data.medium_preset
    )
  ) {
    return apiError("VALIDATION_ERROR", "Unsupported medium preset.", 400);
  }

  const artist = await prisma.artist.findUnique({
    where: { id: parsed.data.artist_id },
    select: { id: true },
  });
  if (!artist) {
    return apiError("VALIDATION_ERROR", "Selected artist was not found.", 400);
  }

  const created = await prisma.artwork.create({
    data: {
      id: randomUUID(),
      title: parsed.data.title_unknown ? null : parsed.data.title,
      titleUnknown: parsed.data.title_unknown,
      artistId: parsed.data.artist_id,
      artistName: null,
      description: parsed.data.description,
      medium: null,
      mediumPreset: parsed.data.medium_preset,
      mediumCustom: parsed.data.medium_custom,
      dimensionsText: parsed.data.dimensions_text,
      dimensionsUnknown: parsed.data.dimensions_unknown,
      framed: parsed.data.framed,
      yearCreated: parsed.data.year_created ?? null,
      status: parsed.data.status,
    },
    include: { artist: true },
  });

  return ok(
    mapArtworkBase(created),
    { status: 201 }
  );
}
