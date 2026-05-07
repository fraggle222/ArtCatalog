import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtworkForm } from "@/components/admin/artwork-form";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function NewArtworkPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canUser(user, "artwork:create")) {
    redirect("/artworks");
  }

  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-4">
        <Link href="/artworks" className="text-sm text-zinc-600 underline">
          Back to artworks
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">Create Artwork</h1>
      <ArtworkForm
        capabilities={{
          canEditArtwork: true,
          canDeleteArtwork: false,
          canManageImages: true,
          canDeleteImages: false,
          canManageArtistsLink: canUser(user, "artist:create"),
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
