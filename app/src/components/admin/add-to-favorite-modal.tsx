"use client";

import { useMemo, useState } from "react";
import type { FavoriteListSummary } from "@/types/contracts";

type AddToFavoriteModalProps = {
  artworkId: string;
  triggerLabel?: string;
  triggerClassName?: string;
};

export function AddToFavoriteModal({
  artworkId,
  triggerLabel = "Add to Favorite",
  triggerClassName = "rounded border px-3 py-2 text-sm",
}: AddToFavoriteModalProps) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<FavoriteListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const editableLists = useMemo(
    () => lists.filter((list) => list.can_edit_content),
    [lists]
  );

  async function openModal() {
    setOpen(true);
    setLoadingLists(true);
    setError(null);
    setSuccess(null);
    setSelectedListId("");

    const response = await fetch("/api/favorite-lists");
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to load favorite lists.");
      setLoadingLists(false);
      return;
    }

    const data = (await response.json()) as { items: FavoriteListSummary[] };
    setLists(data.items);
    setLoadingLists(false);
  }

  async function addToList() {
    if (!selectedListId) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/favorite-lists/${selectedListId}/artworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artworkId }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to add artwork to favorite list.");
      setSaving(false);
      return;
    }

    const chosen = editableLists.find((list) => list.id === selectedListId);
    setSuccess(
      chosen
        ? `Added to "${chosen.name}".`
        : "Artwork added to favorite list."
    );
    setSaving(false);
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={openModal}>
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-4 text-black"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Add to Favorite List</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Select an existing list you can edit.
            </p>

            {loadingLists ? (
              <p className="mt-3 text-sm">Loading lists...</p>
            ) : editableLists.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">
                No editable lists yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <select
                  className="w-full rounded border px-3 py-2"
                  value={selectedListId}
                  onChange={(event) => setSelectedListId(event.target.value)}
                >
                  <option value="">Select favorite list</option>
                  {editableLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
                  disabled={!selectedListId || saving}
                  onClick={addToList}
                >
                  {saving ? "Adding..." : "Add to List"}
                </button>
              </div>
            )}

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {success ? <p className="mt-3 text-sm text-green-700">{success}</p> : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

