import { redirect } from "next/navigation";
import { BulkIntake } from "@/components/admin/bulk-intake";
import { getSessionUser } from "@/lib/auth";
import { canUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function BulkIntakePage() {
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
      <h1 className="mb-2 text-2xl font-semibold">Bulk Photo Intake</h1>
      <p className="mb-4 text-sm text-zinc-600">
        Select an artist, upload many photos, then open each created draft to add
        metadata.
      </p>
      <BulkIntake
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
