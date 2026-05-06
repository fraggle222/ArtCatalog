import Link from "next/link";
import { redirect } from "next/navigation";
import { displayMedium, displayTitle } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const artworks = await prisma.artwork.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      artist: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });
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
          <p className="text-sm text-zinc-600">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/artworks/new" className="rounded bg-black px-3 py-2 text-sm text-white">
            New Artwork
          </Link>
          <Link href="/admin/intake" className="rounded border px-3 py-2 text-sm">
            Bulk Intake
          </Link>
          <Link href="/admin/artists" className="rounded border px-3 py-2 text-sm">
            Artists
          </Link>
          <LogoutButton />
        </div>
      </header>

      {artworks.length === 0 ? (
        <div className="rounded-lg border p-6 text-zinc-600">
          No artworks yet. Create your first entry.
        </div>
      ) : (
        <div className="grid gap-3">
          {artworks.map((artwork) => (
            <Link
              key={artwork.id}
              href={`/admin/artworks/${artwork.id}`}
              className="flex items-center gap-4 rounded-lg border p-3"
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
          ))}
        </div>
      )}
    </main>
  );
}
