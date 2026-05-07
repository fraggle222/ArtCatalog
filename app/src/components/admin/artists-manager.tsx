"use client";

import { FormEvent, useState } from "react";
import type { Artist } from "@/types/contracts";

type ArtistsManagerProps = {
  initialArtists: Artist[];
  canDeleteArtists: boolean;
};

type ArtistForm = {
  name: string;
  birth_year: string;
  death_year: string;
};

const emptyForm: ArtistForm = {
  name: "",
  birth_year: "",
  death_year: "",
};

export function ArtistsManager({
  initialArtists,
  canDeleteArtists,
}: ArtistsManagerProps) {
  const [artists, setArtists] = useState(initialArtists);
  const [createForm, setCreateForm] = useState<ArtistForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ArtistForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function toPayload(form: ArtistForm) {
    return {
      name: form.name,
      birth_year: form.birth_year ? Number(form.birth_year) : null,
      death_year: form.death_year ? Number(form.death_year) : null,
    };
  }

  async function createArtist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(createForm)),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to create artist.");
      return;
    }

    const artist = (await response.json()) as Artist;
    setArtists((current) => [...current, artist].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateForm(emptyForm);
  }

  async function saveArtist(id: string) {
    setError(null);
    const response = await fetch(`/api/artists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(editingForm)),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to update artist.");
      return;
    }

    const updated = (await response.json()) as Artist;
    setArtists((current) =>
      current
        .map((artist) => (artist.id === id ? updated : artist))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingId(null);
  }

  async function deleteArtist(id: string) {
    setError(null);
    const response = await fetch(`/api/artists/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to delete artist.");
      return;
    }
    setArtists((current) => current.filter((artist) => artist.id !== id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createArtist} className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Add Artist</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2"
            placeholder="Name"
            value={createForm.name}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Birth year"
            value={createForm.birth_year}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                birth_year: event.target.value,
              }))
            }
            inputMode="numeric"
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Death year"
            value={createForm.death_year}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                death_year: event.target.value,
              }))
            }
            inputMode="numeric"
          />
        </div>
        <button type="submit" className="mt-3 rounded bg-black px-4 py-2 text-white">
          Add Artist
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {artists.map((artist) => {
          const isEditing = editingId === artist.id;
          return (
            <div
              key={artist.id}
              className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center"
            >
              {isEditing ? (
                <>
                  <input
                    className="rounded border px-3 py-2"
                    value={editingForm.name}
                    onChange={(event) =>
                      setEditingForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded border px-3 py-2"
                    value={editingForm.birth_year}
                    onChange={(event) =>
                      setEditingForm((current) => ({
                        ...current,
                        birth_year: event.target.value,
                      }))
                    }
                    inputMode="numeric"
                  />
                  <input
                    className="rounded border px-3 py-2"
                    value={editingForm.death_year}
                    onChange={(event) =>
                      setEditingForm((current) => ({
                        ...current,
                        death_year: event.target.value,
                      }))
                    }
                    inputMode="numeric"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-black px-3 py-2 text-white"
                      onClick={() => saveArtist(artist.id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-2"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{artist.name}</p>
                    <p className="text-sm text-zinc-600">
                      {artist.birth_year ?? "?"} - {artist.death_year ?? "?"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => {
                        setEditingId(artist.id);
                        setEditingForm({
                          name: artist.name,
                          birth_year: artist.birth_year
                            ? String(artist.birth_year)
                            : "",
                          death_year: artist.death_year
                            ? String(artist.death_year)
                            : "",
                        });
                      }}
                    >
                      Edit
                    </button>
                    {canDeleteArtists ? (
                      <button
                        type="button"
                        className="rounded border px-3 py-2 text-sm text-red-600"
                        onClick={() => deleteArtist(artist.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
