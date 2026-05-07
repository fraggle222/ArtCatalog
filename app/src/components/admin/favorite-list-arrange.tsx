"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  FavoriteListDetail,
  FavoriteListArtwork,
  FavoriteListMember,
} from "@/types/contracts";

type UserOption = {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
};

type FavoriteListArrangeProps = {
  initialList: FavoriteListDetail;
  allUsers: UserOption[];
};

type SortableArtworkRowProps = {
  item: FavoriteListArtwork;
  canEdit: boolean;
  onRemove: (artworkId: string) => void;
};

function SortableArtworkRow({ item, canEdit, onRemove }: SortableArtworkRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.artwork_id, disabled: !canEdit });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-center gap-3 rounded border p-2"
    >
      {item.artwork.primary_image_url ? (
        <img
          src={item.artwork.primary_image_url}
          alt={item.artwork.display_title}
          className="h-12 w-12 rounded object-cover"
        />
      ) : (
        <div className="h-12 w-12 rounded bg-zinc-100" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.artwork.display_title}</p>
        <p className="truncate text-xs text-zinc-600">
          {item.artwork.artist?.name ?? "Unknown artist"}
        </p>
      </div>
      {canEdit ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            Drag
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs text-red-700"
            onClick={() => onRemove(item.artwork_id)}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FavoriteListArrange({
  initialList,
  allUsers,
}: FavoriteListArrangeProps) {
  const [list, setList] = useState(initialList);
  const [name, setName] = useState(initialList.name);
  const [memberUserId, setMemberUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const memberIds = useMemo(
    () => new Set(list.members.map((member) => member.user_id)),
    [list.members]
  );

  const availableUsers = useMemo(
    () => allUsers.filter((user) => !memberIds.has(user.id)),
    [allUsers, memberIds]
  );

  async function renameList() {
    if (!list.can_edit_settings) {
      return;
    }
    setError(null);
    const response = await fetch(`/api/favorite-lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to rename list.");
      return;
    }
    setList((current) => ({ ...current, name }));
  }

  async function addMember() {
    if (!list.can_edit_settings || !memberUserId) {
      return;
    }
    setError(null);
    const response = await fetch(`/api/favorite-lists/${list.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: memberUserId }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to add member.");
      return;
    }
    const created = (await response.json()) as FavoriteListMember;
    setList((current) => ({
      ...current,
      members: [...current.members, created],
    }));
    setMemberUserId("");
  }

  async function removeMember(userId: string) {
    if (!list.can_edit_settings) {
      return;
    }
    setError(null);
    const response = await fetch(
      `/api/favorite-lists/${list.id}/members/${userId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to remove member.");
      return;
    }
    setList((current) => ({
      ...current,
      members: current.members.filter((item) => item.user_id !== userId),
    }));
  }

  async function removeArtwork(targetArtworkId: string) {
    if (!list.can_edit_content) {
      return;
    }
    setError(null);
    const response = await fetch(
      `/api/favorite-lists/${list.id}/artworks/${targetArtworkId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to remove artwork.");
      return;
    }
    setList((current) => ({
      ...current,
      artworks: current.artworks
        .filter((item) => item.artwork_id !== targetArtworkId)
        .map((item, index) => ({ ...item, sort_order: index })),
    }));
  }

  async function reorder(artworkIds: string[]) {
    const response = await fetch(`/api/favorite-lists/${list.id}/artworks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artworkIds }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to reorder artworks.");
      return;
    }
    const data = (await response.json()) as { items: FavoriteListArtwork[] };
    setList((current) => ({ ...current, artworks: data.items }));
  }

  const sortedArtworks = [...list.artworks].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!list.can_edit_content || !over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedArtworks.findIndex((item) => item.artwork_id === active.id);
    const newIndex = sortedArtworks.findIndex((item) => item.artwork_id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const next = arrayMove(sortedArtworks, oldIndex, newIndex);
    setList((current) => ({
      ...current,
      artworks: next.map((item, index) => ({ ...item, sort_order: index })),
    }));
    await reorder(next.map((item) => item.artwork_id));
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">List Details</h2>
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded border px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!list.can_edit_settings}
          />
          <button
            type="button"
            className="rounded border px-3 py-2"
            disabled={!list.can_edit_settings}
            onClick={renameList}
          >
            Rename
          </button>
        </div>
        <p className="text-sm text-zinc-600">Owner: {list.owner.email}</p>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Members</h2>
        {list.can_edit_settings ? (
          <div className="flex flex-col gap-2 md:flex-row">
            <select
              className="w-full rounded border px-3 py-2"
              value={memberUserId}
              onChange={(event) => setMemberUserId(event.target.value)}
            >
              <option value="">Select user</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.role})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded border px-3 py-2"
              onClick={addMember}
              disabled={!memberUserId}
            >
              Add Member
            </button>
          </div>
        ) : null}

        <div className="space-y-2">
          {list.members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between rounded border p-2 text-sm"
            >
              <p>
                {member.email} ({member.role})
              </p>
              {list.can_edit_settings && member.user_id !== list.owner.id ? (
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs text-red-700"
                  onClick={() => removeMember(member.user_id)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Artworks</h2>
        <p className="text-sm text-zinc-600">
          Add artworks from the main artworks view or artwork detail page.
        </p>
        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sortedArtworks.map((item) => item.artwork_id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedArtworks.map((item) => (
                <SortableArtworkRow
                  key={item.artwork_id}
                  item={item}
                  canEdit={list.can_edit_content}
                  onRemove={removeArtwork}
                />
              ))}
            </SortableContext>
          </DndContext>
          {sortedArtworks.length === 0 ? (
            <p className="text-sm text-zinc-600">No artworks in this list yet.</p>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

