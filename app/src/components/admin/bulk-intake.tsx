"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { Artist } from "@/types/contracts";

type BulkIntakeProps = {
  artists: Artist[];
};

type IntakeItem = {
  artwork_id: string;
  image_url: string;
  created_at: string;
};

export function BulkIntake({ artists }: BulkIntakeProps) {
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<IntakeItem[]>([]);
  const selectedFiles = files ? Array.from(files) : [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!artistId) {
      setError("Select an artist before uploading.");
      return;
    }

    if (!files || files.length === 0) {
      setError("Select one or more image files using the picker below.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("artist_id", artistId);
    Array.from(files).forEach((file) => formData.append("files", file));

    const response = await fetch("/api/artworks/intake", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Bulk upload failed.");
      setUploading(false);
      return;
    }

    const data = (await response.json()) as { items: IntakeItem[] };
    setItems(data.items);
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Artist</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={artistId}
            onChange={(event) => setArtistId(event.target.value)}
            required
          >
            <option value="">Select artist</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Artwork Photos (multiple)
          </label>
          <div className="rounded-lg border border-dashed p-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(event.target.files)}
              className="block w-full text-sm"
            />
            {selectedFiles.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-600">No files selected yet.</p>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-zinc-600">
                  {selectedFiles.length} file
                  {selectedFiles.length === 1 ? "" : "s"} selected
                </p>
                <div className="max-h-28 overflow-auto">
                  {selectedFiles.slice(0, 8).map((file) => (
                    <p key={file.name + file.size} className="truncate text-xs">
                      {file.name}
                    </p>
                  ))}
                  {selectedFiles.length > 8 ? (
                    <p className="text-xs text-zinc-600">
                      + {selectedFiles.length - 8} more
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={uploading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload and Create Drafts"}
        </button>
      </form>

      {items.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Created Drafts ({items.length})</h2>
          <div className="grid gap-3">
            {items.map((item) => (
              <div
                key={item.artwork_id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <img
                  src={item.image_url}
                  alt="Uploaded artwork"
                  className="h-14 w-14 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-600">Draft created</p>
                  <p className="truncate text-xs text-zinc-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/admin/artworks/${item.artwork_id}`}
                  className="rounded border px-3 py-2 text-sm"
                >
                  Edit metadata
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
