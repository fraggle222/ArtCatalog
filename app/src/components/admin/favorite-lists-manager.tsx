"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { FavoriteListSummary } from "@/types/contracts";

type FavoriteListsManagerProps = {
  initialLists: FavoriteListSummary[];
};

export function FavoriteListsManager({ initialLists }: FavoriteListsManagerProps) {
  const [lists, setLists] = useState(initialLists);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/favorite-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to create list.");
      setLoading(false);
      return;
    }

    const created = (await response.json()) as FavoriteListSummary;
    setLists((current) => [created, ...current]);
    setName("");
    setLoading(false);
  }

  async function deleteList(list: FavoriteListSummary) {
    if (list.artwork_count > 0) {
      const confirmed = window.confirm(
        `This list contains ${list.artwork_count} artwork${
          list.artwork_count === 1 ? "" : "s"
        }. Delete anyway?`
      );
      if (!confirmed) {
        return;
      }
    }

    setError(null);
    const response = await fetch(`/api/favorite-lists/${list.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to delete list.");
      return;
    }
    setLists((current) => current.filter((item) => item.id !== list.id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createList} className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Create Shared List</h2>
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="List name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {lists.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-zinc-600">
          No favorite lists yet.
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{list.name}</p>
                <p className="text-sm text-zinc-600">
                  {list.artwork_count} artworks • {list.member_count} members
                </p>
                <p className="truncate text-xs text-zinc-500">
                  Owner: {list.owner.email}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/favorites/${list.id}`}
                  className="rounded border px-3 py-2 text-sm"
                >
                  Open
                </Link>
                {list.can_edit_settings ? (
                  <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm text-red-700"
                    onClick={() => deleteList(list)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

