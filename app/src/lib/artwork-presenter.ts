import type { Artwork, Artist } from "@/generated/prisma/client";

type ArtworkWithArtist = Artwork & { artist: Artist | null };

export function displayTitle(artwork: ArtworkWithArtist) {
  if (artwork.titleUnknown || !artwork.title?.trim()) {
    return "Unknown title";
  }
  return artwork.title;
}

export function displayMedium(artwork: ArtworkWithArtist) {
  return artwork.mediumCustom ?? artwork.mediumPreset ?? artwork.medium ?? null;
}

export function displayLocation(artwork: ArtworkWithArtist) {
  return artwork.locationCustom ?? artwork.locationPreset ?? null;
}

export function mapArtworkBase(artwork: ArtworkWithArtist) {
  return {
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
    location_preset: artwork.locationPreset,
    location_custom: artwork.locationCustom,
    display_location: displayLocation(artwork),
    dimensions_text: artwork.dimensionsText,
    dimensions_unknown: artwork.dimensionsUnknown,
    framed: artwork.framed,
    year_created: artwork.yearCreated,
    status: artwork.status,
    display_title: displayTitle(artwork),
    created_at: artwork.createdAt.toISOString(),
    updated_at: artwork.updatedAt.toISOString(),
  };
}
