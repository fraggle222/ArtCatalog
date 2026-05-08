import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { displayLocation, displayMedium, displayTitle } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";
import { AddToFavoriteModal } from "@/components/admin/add-to-favorite-modal";
import { ArtworksFilters } from "@/components/admin/artworks-filters";

function getSearchValue(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function ArtworksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const query = await searchParams;
  const selectedArtistId = getSearchValue(query.artistId).trim();
  const selectedMediumPreset = getSearchValue(query.mediumPreset).trim();
  const selectedLocationPreset = getSearchValue(query.locationPreset).trim();
  const locationCustomQuery = getSearchValue(query.locationCustom).trim();
  const requestedPage = Math.max(1, Number(getSearchValue(query.page)) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(getSearchValue(query.pageSize)) || 24)
  );
  const showFramed = getSearchValue(query.showFramed) === "1";
  const showUnframed = getSearchValue(query.showUnframed) === "1";
  const where: Prisma.ArtworkWhereInput = {};

  if (selectedArtistId) {
    where.artistId = selectedArtistId;
  }
  if (selectedMediumPreset) {
    where.mediumPreset = selectedMediumPreset;
  }
  if (selectedLocationPreset) {
    where.locationPreset = selectedLocationPreset;
  }
  if (locationCustomQuery) {
    const locationRows = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
        FROM artworks
        WHERE LOWER(location_custom) LIKE ${`%${locationCustomQuery.toLowerCase()}%`}
      `
    );
    where.id = { in: locationRows.map((row) => row.id) };
  }
  if (showFramed !== showUnframed) {
    where.framed = showFramed;
  }

  const hasActiveFilters =
    selectedArtistId.length > 0 ||
    selectedMediumPreset.length > 0 ||
    selectedLocationPreset.length > 0 ||
    locationCustomQuery.length > 0 ||
    showFramed !== showUnframed;
  const filtersStateKey = [
    selectedArtistId,
    selectedMediumPreset,
    selectedLocationPreset,
    locationCustomQuery,
    showFramed ? "1" : "0",
    showUnframed ? "1" : "0",
  ].join("|");

  const [artists, total] = await Promise.all([
    prisma.artist.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.artwork.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const artworks = await prisma.artwork.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      artist: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  function buildPageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (selectedArtistId) {
      params.set("artistId", selectedArtistId);
    }
    if (selectedMediumPreset) {
      params.set("mediumPreset", selectedMediumPreset);
    }
    if (selectedLocationPreset) {
      params.set("locationPreset", selectedLocationPreset);
    }
    if (locationCustomQuery) {
      params.set("locationCustom", locationCustomQuery);
    }
    if (showFramed) {
      params.set("showFramed", "1");
    }
    if (showUnframed) {
      params.set("showUnframed", "1");
    }
    if (pageSize !== 24) {
      params.set("pageSize", String(pageSize));
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    const queryString = params.toString();
    return queryString ? `/artworks?${queryString}` : "/artworks";
  }

  const previousPageHref = buildPageHref(page - 1);
  const nextPageHref = buildPageHref(page + 1);

  const cardImages = new Map<string, string>();
  await Promise.all(
    artworks.map(async (artwork) => {
      const first = artwork.images[0];
      if (!first) {
        return;
      }
      const resolved =
        first.thumbnailStorageKey && first.thumbnailUrl
          ? await resolveImageUrl(first.thumbnailStorageKey, first.thumbnailUrl)
          : await resolveImageUrl(first.storageKey, first.url);
      cardImages.set(artwork.id, resolved);
    })
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Artworks</h1>
      </header>

      <ArtworksFilters
        key={filtersStateKey}
        artists={artists}
        selectedArtistId={selectedArtistId}
        selectedMediumPreset={selectedMediumPreset}
        selectedLocationPreset={selectedLocationPreset}
        locationCustomQuery={locationCustomQuery}
        showFramed={showFramed}
        showUnframed={showUnframed}
      />

      {artworks.length === 0 ? (
        <div className="rounded-lg border p-6 text-zinc-600">
          {hasActiveFilters
            ? "No artworks match current filters."
            : "No artworks yet. Create your first entry."}
        </div>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3">
            {artworks.map((artwork) => (
              <div key={artwork.id} className="rounded-lg border p-3">
                <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <Link
                    href={`/admin/artworks/${artwork.id}`}
                    className="flex w-full min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-4"
                  >
                    {artwork.images[0] ? (
                      <img
                        src={cardImages.get(artwork.id) ?? artwork.images[0].url}
                        alt={artwork.title ?? "Artwork image"}
                        className="h-16 w-16 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded bg-zinc-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      {artwork.title ? (
                        <p className="truncate font-medium">{displayTitle(artwork)}</p>
                      ) : (
                        <p className="truncate font-medium text-zinc-500">
                          {displayTitle(artwork)}
                        </p>
                      )}
                      <p className="truncate text-sm text-zinc-600">
                        {artwork.artist?.name ?? artwork.artistName ?? "Unknown artist"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {displayMedium(artwork) ?? "Unknown medium"} •{" "}
                        {displayLocation(artwork) ?? "Unknown location"} •{" "}
                        {artwork.dimensionsUnknown
                          ? "Unknown dimensions"
                          : artwork.dimensionsText ?? "Unknown dimensions"}
                        {" • "}
                        {artwork.framed ? "Framed" : "Unframed"}
                      </p>
                      {!artwork.title && artwork.description ? (
                        <p className="truncate text-sm text-zinc-500">
                          {artwork.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="self-start text-xs uppercase tracking-wide text-zinc-500 md:self-auto">
                      {artwork.status}
                    </p>
                  </Link>
                  <AddToFavoriteModal
                    artworkId={artwork.id}
                    triggerClassName="w-full rounded border px-3 py-2 text-xs md:w-auto"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm md:flex-row md:items-center md:justify-between">
            <span className="text-zinc-600 md:hidden">
              Page {page}/{totalPages} ({total})
            </span>
            <span className="hidden text-zinc-600 md:inline">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-2 self-start md:self-auto">
              {page > 1 ? (
                <Link href={previousPageHref} className="rounded border px-3 py-1">
                  Previous
                </Link>
              ) : (
                <span className="rounded border px-3 py-1 text-zinc-400">Previous</span>
              )}
              {page < totalPages ? (
                <Link href={nextPageHref} className="rounded border px-3 py-1">
                  Next
                </Link>
              ) : (
                <span className="rounded border px-3 py-1 text-zinc-400">Next</span>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
