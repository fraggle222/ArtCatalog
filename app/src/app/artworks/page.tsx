import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { displayLocation, displayMedium, displayTitle } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { LOCATION_PRESET_OPTIONS } from "@/lib/location-options";
import { MEDIUM_PRESET_OPTIONS } from "@/lib/medium-options";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";
import { AddToFavoriteModal } from "@/components/admin/add-to-favorite-modal";
import { LogoutButton } from "@/components/admin/logout-button";

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
  const canCreateArtwork = canUser(user, "artwork:create");
  const canManageArtists = canUser(user, "artist:create");
  const canManageUsers = canUser(user, "user:manage");
  const selectedArtistId = getSearchValue(query.artistId).trim();
  const selectedMediumPreset = getSearchValue(query.mediumPreset).trim();
  const selectedLocationPreset = getSearchValue(query.locationPreset).trim();
  const locationCustomQuery = getSearchValue(query.locationCustom).trim();
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

  const [artists, artworks] = await Promise.all([
    prisma.artist.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.artwork.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        artist: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    }),
  ]);
  const cardImages = new Map<string, string>();
  await Promise.all(
    artworks.map(async (artwork) => {
      const first = artwork.images[0];
      if (!first) {
        return;
      }
      const resolved = await resolveImageUrl(first.storageKey, first.url);
      cardImages.set(artwork.id, resolved);
    })
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Artworks</h1>
          <p className="text-sm text-zinc-600">
            {user.email} ({user.role})
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/favorites" className="rounded border px-3 py-2 text-sm">
            Favorites
          </Link>
          {canCreateArtwork ? (
            <>
              <Link href="/admin/artworks/new" className="rounded bg-black px-3 py-2 text-sm text-white">
                New Artwork
              </Link>
              <Link href="/admin/intake" className="rounded border px-3 py-2 text-sm">
                Bulk Intake
              </Link>
            </>
          ) : null}
          {canManageArtists ? (
            <Link href="/admin/artists" className="rounded border px-3 py-2 text-sm">
              Artists
            </Link>
          ) : null}
          {canManageUsers ? (
            <Link href="/admin/users" className="rounded border px-3 py-2 text-sm">
              Users
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </header>

      <form method="GET" className="mb-4 rounded-lg border p-3">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Artist
            </span>
            <select
              name="artistId"
              className="w-full rounded border px-3 py-2 text-sm"
              defaultValue={selectedArtistId}
            >
              <option value="">All artists</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Medium & Support
            </span>
            <select
              name="mediumPreset"
              className="w-full rounded border px-3 py-2 text-sm"
              defaultValue={selectedMediumPreset}
            >
              <option value="">All media</option>
              {MEDIUM_PRESET_OPTIONS.map((medium) => (
                <option key={medium} value={medium}>
                  {medium}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Location
            </span>
            <select
              name="locationPreset"
              className="w-full rounded border px-3 py-2 text-sm"
              defaultValue={selectedLocationPreset}
            >
              <option value="">All locations</option>
              {LOCATION_PRESET_OPTIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <input
              name="locationCustom"
              className="mt-2 w-full rounded border px-3 py-2 text-sm"
              defaultValue={locationCustomQuery}
              placeholder="Custom location contains..."
            />
          </label>

          <div className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">
              Framing
            </span>
            <div className="flex items-center gap-3 rounded border px-3 py-2 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="showFramed"
                  value="1"
                  defaultChecked={showFramed}
                />
                Framed
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="showUnframed"
                  value="1"
                  defaultChecked={showUnframed}
                />
                Unframed
              </label>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm text-white"
            >
              Apply Filters
            </button>
            <Link href="/artworks" className="rounded border px-3 py-2 text-sm">
              Clear
            </Link>
          </div>
        </div>
      </form>

      {artworks.length === 0 ? (
        <div className="rounded-lg border p-6 text-zinc-600">
          {hasActiveFilters
            ? "No artworks match current filters."
            : "No artworks yet. Create your first entry."}
        </div>
      ) : (
        <div className="grid gap-3">
          {artworks.map((artwork) => (
            <div key={artwork.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/artworks/${artwork.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  {artwork.images[0] ? (
                    <img
                      src={cardImages.get(artwork.id) ?? artwork.images[0].url}
                      alt={artwork.title ?? "Artwork image"}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded bg-zinc-100" />
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
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {artwork.status}
                  </p>
                </Link>
                <AddToFavoriteModal
                  artworkId={artwork.id}
                  triggerClassName="rounded border px-3 py-2 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
