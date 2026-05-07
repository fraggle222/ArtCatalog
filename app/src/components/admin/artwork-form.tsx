"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MEDIUM_PRESET_OPTIONS } from "@/lib/medium-options";
import type { Artist, ArtworkDetail, ArtworkImage } from "@/types/contracts";

type ArtworkFormProps = {
  artwork?: ArtworkDetail;
  artists: Artist[];
  capabilities?: ArtworkCapabilities;
};

type ArtworkCapabilities = {
  canEditArtwork: boolean;
  canDeleteArtwork: boolean;
  canManageImages: boolean;
  canDeleteImages: boolean;
  canManageArtistsLink: boolean;
};

type FormState = {
  title: string;
  title_unknown: boolean;
  artist_id: string;
  description: string;
  medium_mode: "preset" | "custom";
  medium_preset: string;
  medium_custom: string;
  dimensions_text: string;
  dimensions_unknown: boolean;
  framed: boolean;
  year_created: string;
  status: "draft" | "published";
};

type SaveMode = "save-only" | "save-and-close";

function toFormState(artwork?: ArtworkDetail): FormState {
  const hasCustomMedium = Boolean(artwork?.medium_custom || artwork?.medium);
  return {
    title: artwork?.title ?? "",
    title_unknown: artwork?.title_unknown ?? false,
    artist_id: artwork?.artist?.id ?? artwork?.artist_id ?? "",
    description: artwork?.description ?? "",
    medium_mode: hasCustomMedium ? "custom" : "preset",
    medium_preset: artwork?.medium_preset ?? "",
    medium_custom: artwork?.medium_custom ?? artwork?.medium ?? "",
    dimensions_text: artwork?.dimensions_text ?? "",
    dimensions_unknown: artwork?.dimensions_unknown ?? false,
    framed: artwork?.framed ?? false,
    year_created: artwork?.year_created ? String(artwork.year_created) : "",
    status: artwork?.status ?? "draft",
  };
}

function toPayload(form: FormState) {
  return {
    title: form.title || null,
    title_unknown: form.title_unknown,
    artist_id: form.artist_id,
    description: form.description || null,
    medium_preset: form.medium_mode === "preset" ? form.medium_preset || null : null,
    medium_custom: form.medium_mode === "custom" ? form.medium_custom || null : null,
    dimensions_text: form.dimensions_text || null,
    dimensions_unknown: form.dimensions_unknown,
    framed: form.framed,
    year_created: form.year_created ? Number(form.year_created) : null,
    status: form.status,
  };
}

export function ArtworkForm({ artwork, artists, capabilities }: ArtworkFormProps) {
  const router = useRouter();
  const {
    canEditArtwork,
    canDeleteArtwork,
    canManageImages,
    canDeleteImages,
    canManageArtistsLink,
  } = capabilities ?? {
    canEditArtwork: true,
    canDeleteArtwork: true,
    canManageImages: true,
    canDeleteImages: true,
    canManageArtistsLink: true,
  };
  const [form, setForm] = useState<FormState>(toFormState(artwork));
  const [images, setImages] = useState<ArtworkImage[]>(artwork?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingArtwork, setDeletingArtwork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(toPayload(toFormState(artwork)))
  );

  const artworkId = artwork?.id;
  const isEdit = Boolean(artworkId);
  const canUpload = Boolean(artworkId);
  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.sort_order - b.sort_order),
    [images]
  );
  const currentSnapshot = JSON.stringify(toPayload(form));
  const isDirty = !isEdit || currentSnapshot !== savedSnapshot;
  const hasTitle = form.title_unknown || form.title.trim().length > 0;
  const hasMedium =
    (form.medium_mode === "preset" && form.medium_preset.length > 0) ||
    (form.medium_mode === "custom" && form.medium_custom.trim().length > 0);
  const canSubmit =
    canEditArtwork &&
    !saving &&
    isDirty &&
    hasTitle &&
    hasMedium &&
    form.artist_id.length > 0;

  useEffect(() => {
    if (!previewImageUrl && !deleteModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (deleteModalOpen) {
          setDeleteModalOpen(false);
          return;
        }
        setPreviewImageUrl(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [previewImageUrl, deleteModalOpen]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditArtwork) {
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const saveMode: SaveMode =
      submitter?.dataset.saveMode === "close" ? "save-and-close" : "save-only";

    setSaving(true);
    setError(null);

    const payload = toPayload(form);

    const endpoint = isEdit ? `/api/artworks/${artworkId}` : "/api/artworks";
    const method = isEdit ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to save artwork.");
      setSaving(false);
      return;
    }

    const data = (await response.json()) as { id: string };
    setSaving(false);
    if (!isEdit) {
      router.push(`/admin/artworks/${data.id}`);
      return;
    }

    setSavedSnapshot(JSON.stringify(payload));
    if (saveMode === "save-and-close") {
      if (typeof window !== "undefined" && window.history.length > 1) {
        const currentPath = window.location.pathname;
        router.back();
        window.setTimeout(() => {
          if (window.location.pathname === currentPath) {
            router.push("/artworks");
          }
        }, 250);
        return;
      }
      router.push("/artworks");
      return;
    }
    router.refresh();
  }

  async function onUpload(files: FileList | null) {
    if (!canManageImages || !artworkId || !files || files.length === 0) {
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    const response = await fetch(`/api/artworks/${artworkId}/images`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to upload images.");
      setUploading(false);
      return;
    }

    const data = (await response.json()) as { images: ArtworkImage[] };
    setImages((current) => [...current, ...data.images]);
    setUploading(false);
  }

  async function applyReorder(nextOrder: ArtworkImage[]) {
    if (!canManageImages || !artworkId || nextOrder.length === 0) {
      return;
    }
    const primary = nextOrder.find((item) => item.is_primary) ?? nextOrder[0];
    const response = await fetch(`/api/artworks/${artworkId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageIds: nextOrder.map((item) => item.id),
        primaryImageId: primary.id,
      }),
    });
    if (!response.ok) {
      setError("Unable to reorder images.");
      return;
    }
    const data = (await response.json()) as { images: ArtworkImage[] };
    setImages(data.images);
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const index = sortedImages.findIndex((image) => image.id === imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sortedImages.length) {
      return;
    }
    const nextOrder = [...sortedImages];
    const [item] = nextOrder.splice(index, 1);
    nextOrder.splice(target, 0, item);
    await applyReorder(nextOrder);
  }

  async function makePrimary(imageId: string) {
    if (!canManageImages || !artworkId) {
      return;
    }
    const response = await fetch(`/api/artworks/${artworkId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageIds: sortedImages.map((item) => item.id),
        primaryImageId: imageId,
      }),
    });
    if (!response.ok) {
      setError("Unable to set primary image.");
      return;
    }
    const data = (await response.json()) as { images: ArtworkImage[] };
    setImages(data.images);
  }

  async function deleteImage(imageId: string) {
    if (!canDeleteImages || !artworkId) {
      return;
    }
    const response = await fetch(`/api/artworks/${artworkId}/images/${imageId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Unable to delete image.");
      return;
    }
    setImages((current) => current.filter((image) => image.id !== imageId));
  }

  async function confirmDeleteArtwork() {
    if (!canDeleteArtwork || !artworkId) {
      return;
    }

    setDeletingArtwork(true);
    setError(null);

    const response = await fetch(`/api/artworks/${artworkId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Unable to delete artwork.");
      setDeletingArtwork(false);
      return;
    }

    setDeleteModalOpen(false);
    router.push("/artworks");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Title</span>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              disabled={!canEditArtwork || form.title_unknown}
              required={!form.title_unknown}
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.title_unknown}
                disabled={!canEditArtwork}
                onChange={(event) =>
                  updateField("title_unknown", event.target.checked)
                }
              />
              Title unknown
            </label>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Artist</span>
            <select
              className="w-full rounded border px-3 py-2"
              value={form.artist_id}
              onChange={(event) => updateField("artist_id", event.target.value)}
              disabled={!canEditArtwork}
              required
            >
              <option value="">Select artist</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
            {canManageArtistsLink ? (
              <a
                className="mt-2 inline-block text-sm text-zinc-600 underline"
                href="/admin/artists"
              >
                Manage artists
              </a>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Medium & Support</span>
            <select
              className="w-full rounded border px-3 py-2"
              value={
                form.medium_mode === "custom" ? "__custom__" : form.medium_preset
              }
              onChange={(event) => {
                const value = event.target.value;
                if (value === "__custom__") {
                  setForm((current) => ({
                    ...current,
                    medium_mode: "custom",
                    medium_preset: "",
                  }));
                  return;
                }
                setForm((current) => ({
                  ...current,
                  medium_mode: "preset",
                  medium_preset: value,
                }));
              }}
              disabled={!canEditArtwork}
            >
              <option value="">Select medium</option>
              {MEDIUM_PRESET_OPTIONS.map((medium) => (
                <option key={medium} value={medium}>
                  {medium}
                </option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {form.medium_mode === "custom" ? (
              <input
                className="mt-2 w-full rounded border px-3 py-2"
                placeholder="Enter custom medium/support"
                value={form.medium_custom}
                disabled={!canEditArtwork}
                onChange={(event) =>
                  updateField("medium_custom", event.target.value)
                }
              />
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Dimensions</span>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.dimensions_text}
              onChange={(event) =>
                updateField("dimensions_text", event.target.value)
              }
              disabled={!canEditArtwork || form.dimensions_unknown}
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.dimensions_unknown}
                disabled={!canEditArtwork}
                onChange={(event) =>
                  updateField("dimensions_unknown", event.target.checked)
                }
              />
              Dimensions unknown
            </label>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Year Created</span>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.year_created}
              disabled={!canEditArtwork}
              onChange={(event) => updateField("year_created", event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Status</span>
            <select
              className="w-full rounded border px-3 py-2"
              value={form.status}
              disabled={!canEditArtwork}
              onChange={(event) =>
                updateField("status", event.target.value as "draft" | "published")
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <div className="block">
            <span className="mb-1 block text-sm font-medium">Framing</span>
            <div className="inline-flex overflow-hidden rounded border">
              <button
                type="button"
                className={`px-3 py-2 text-sm ${
                  form.framed ? "bg-black text-white" : "bg-white"
                }`}
                disabled={!canEditArtwork}
                onClick={() => updateField("framed", true)}
              >
                Framed
              </button>
              <button
                type="button"
                className={`border-l px-3 py-2 text-sm ${
                  !form.framed ? "bg-black text-white" : "bg-white"
                }`}
                disabled={!canEditArtwork}
                onClick={() => updateField("framed", false)}
              >
                Unframed
              </button>
            </div>
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Description</span>
          <textarea
            className="min-h-32 w-full rounded border px-3 py-2"
            value={form.description}
            disabled={!canEditArtwork}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          {isEdit ? (
            <>
              <button
                type="submit"
                data-save-mode="close"
                disabled={!canSubmit}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save & Close"}
              </button>
              <button
                type="submit"
                data-save-mode="stay"
                disabled={!canSubmit}
                className="rounded border px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Artwork"}
            </button>
          )}
          {isEdit && canDeleteArtwork ? (
            <button
              type="button"
              className="rounded border border-red-300 px-4 py-2 text-red-700"
              onClick={() => setDeleteModalOpen(true)}
              disabled={deletingArtwork}
            >
              Delete Artwork
            </button>
          ) : null}
        </div>
      </form>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Images</h2>
        {!canUpload ? (
          <p className="text-sm text-zinc-600">
            Create the artwork first, then upload images.
          </p>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={(event) => onUpload(event.target.files)}
              disabled={uploading || !canManageImages}
            />
            {uploading ? <p className="text-sm">Uploading...</p> : null}
            {!canManageImages ? (
              <p className="text-sm text-zinc-600">
                You have read-only image access.
              </p>
            ) : null}
            {sortedImages.length === 0 ? (
              <p className="text-sm text-zinc-600">No images uploaded yet.</p>
            ) : (
              <div className="grid gap-3">
                {sortedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="flex flex-col gap-2 rounded border p-3 md:flex-row md:items-center"
                  >
                    <button
                      type="button"
                      className="rounded focus:outline-none focus:ring-2 focus:ring-black"
                      onClick={() => setPreviewImageUrl(image.url)}
                      aria-label="Open larger image preview"
                    >
                      <img
                        src={image.url}
                        alt="Artwork"
                        className="h-24 w-24 rounded object-cover"
                      />
                    </button>
                    <div className="flex-1">
                      <p className="text-sm">
                        {image.is_primary ? "Primary image" : "Secondary image"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-sm"
                        onClick={() => moveImage(image.id, -1)}
                        disabled={!canManageImages || index === 0}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-sm"
                        onClick={() => moveImage(image.id, 1)}
                        disabled={
                          !canManageImages || index === sortedImages.length - 1
                        }
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-sm"
                        onClick={() => makePrimary(image.id)}
                        disabled={!canManageImages || image.is_primary}
                      >
                        Set Primary
                      </button>
                      {canDeleteImages ? (
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-sm text-red-600"
                          onClick={() => deleteImage(image.id)}
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
        )}
      </section>
      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-1 text-xs"
              onClick={() => setPreviewImageUrl(null)}
            >
              Close
            </button>
            <img
              src={previewImageUrl}
              alt="Artwork preview"
              className="max-h-[90vh] max-w-[90vw] rounded object-contain"
            />
          </div>
        </div>
      ) : null}
      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-4 text-black"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Delete artwork?</h3>
            <p className="mt-2 text-sm text-zinc-700">
              This permanently deletes metadata and images. This action cannot be
              undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deletingArtwork}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-red-700 px-3 py-2 text-white disabled:opacity-60"
                onClick={confirmDeleteArtwork}
                disabled={deletingArtwork}
              >
                {deletingArtwork ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
