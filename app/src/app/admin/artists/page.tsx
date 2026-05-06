import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtistsManager } from "@/components/admin/artists-manager";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ArtistsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-zinc-600 underline">
          Back to artworks
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">Artists</h1>
      <ArtistsManager
        initialArtists={artists.map((artist) => ({
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
