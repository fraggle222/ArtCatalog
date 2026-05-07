export type ArtworkStatus = "draft" | "published";
export type UserRole = "admin" | "editor" | "viewer";

export interface Artist {
  id: string;
  name: string;
  birth_year: number | null;
  death_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArtworkImage {
  id: string;
  artwork_id: string;
  storage_key: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Artwork {
  id: string;
  title: string | null;
  title_unknown: boolean;
  artist_id: string | null;
  artist: { id: string; name: string } | null;
  description: string | null;
  medium_preset: string | null;
  medium_custom: string | null;
  medium: string | null;
  display_medium: string | null;
  location_preset: string | null;
  location_custom: string | null;
  display_location: string | null;
  dimensions_text: string | null;
  dimensions_unknown: boolean;
  framed: boolean;
  year_created: number | null;
  status: ArtworkStatus;
  display_title: string;
  created_at: string;
  updated_at: string;
}

export interface ArtworkSummary extends Artwork {
  primary_image_url: string | null;
  image_count: number;
}

export interface ArtworkDetail extends Artwork {
  images: ArtworkImage[];
}

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface FavoriteListSummary {
  id: string;
  name: string;
  owner: { id: string; email: string };
  can_edit_settings: boolean;
  can_edit_content: boolean;
  artwork_count: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface FavoriteListMember {
  user_id: string;
  email: string;
  role: UserRole;
  access: "viewer";
  created_at: string;
}

export interface FavoriteListArtwork {
  artwork_id: string;
  sort_order: number;
  artwork: Pick<Artwork, "id" | "display_title" | "artist"> & {
    primary_image_url: string | null;
  };
}

export interface FavoriteListDetail {
  id: string;
  name: string;
  owner: { id: string; email: string };
  can_edit_settings: boolean;
  can_edit_content: boolean;
  members: FavoriteListMember[];
  artworks: FavoriteListArtwork[];
}
