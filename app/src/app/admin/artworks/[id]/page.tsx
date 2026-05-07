import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddToFavoriteModal } from "@/components/admin/add-to-favorite-modal";
import { ArtworkForm } from "@/components/admin/artwork-form";
import { displayMedium } from "@/lib/artwork-presenter";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { resolveImageUrl } from "@/lib/uploads";

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const canEditArtwork = canUser(user, "artwork:update");
  const canDeleteArtwork = canUser(user, "artwork:delete");
  const canManageArtistsLink = canUser(user, "artist:create");

  const { id } = await params;
  const [artwork, artists] = await Promise.all([
    prisma.artwork.findUnique({
      where: { id },
      include: {
        artist: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.artist.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  if (!artwork) {
    notFound();
  }

  const resolvedImages = await Promise.all(
    artwork.images.map(async (image) => ({
      id: image.id,
      artwork_id: image.artworkId,
      storage_key: image.storageKey,
      url: await resolveImageUrl(image.storageKey, image.url),
      sort_order: image.sortOrder,
      is_primary: image.isPrimary,
      created_at: image.createdAt.toISOString(),
      updated_at: image.updatedAt.toISOString(),
    }))
  );

  const payload = {
    id: artwork.id,
    title: artwork.title,
    title_unknown: artwork.titleUnknown,
    artist_id: artwork.artistId,
    artist: artwork.artist
      ? { id: artwork.artist.id, name: artwork.artist.name }
      : null,
    description: artwork.description,
    medium_preset: artwork.mediumPreset,
    medium_custom: artwork.mediumCustom,
    medium: artwork.medium,
    display_medium: displayMedium(artwork),
    dimensions_text: artwork.dimensionsText,
    dimensions_unknown: artwork.dimensionsUnknown,
    framed: artwork.framed,
    year_created: artwork.yearCreated,
    status: artwork.status,
    display_title: artwork.titleUnknown || !artwork.title ? "Unknown title" : artwork.title,
    created_at: artwork.createdAt.toISOString(),
    updated_at: artwork.updatedAt.toISOString(),
    images: resolvedImages,
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-4">
        <Link href="/artworks" className="text-sm text-zinc-600 underline">
          Back to artworks
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">
        {canEditArtwork ? "Edit Artwork" : "View Artwork"}
      </h1>
      <div className="mb-4">
        <AddToFavoriteModal artworkId={artwork.id} />
      </div>
      <ArtworkForm
        artwork={payload}
        capabilities={{
          canEditArtwork,
          canDeleteArtwork,
          canManageImages: canEditArtwork,
          canDeleteImages: canDeleteArtwork,
          canManageArtistsLink,
        }}
        artists={artists.map((artist) => ({
          id: artist.id,
          name: artist.name,
          birth_year: artist.birthYear,
          death_year: artist.deathYear,
          created_at: artist.createdAt.toISOString(),
          updated_at: artist.updatedAt.toISOString(),
        }))}
      />
    </main>
  );
}
