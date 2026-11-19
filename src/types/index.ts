export type TrackSource = "itunes" | "jamendo";

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  artworkUrl: string;
  previewUrl: string | null;
  durationMs: number;
  source: TrackSource;
  trackNumber?: number;
  releaseYear?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  artworkUrl: string;
  releaseYear?: number;
  trackCount?: number;
  genre?: string;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  genres?: string[];
}

export interface Playlist {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
  isOwner?: boolean;
  isLikedSongs?: boolean;
  trackCount?: number;
  totalDurationMs?: number;
  createdAt?: string;
}

export interface PlaylistWithTracks extends Playlist {
  tracks: Track[];
}

export interface HomeSection {
  id: string;
  title: string;
  subtitle?: string;
  kind: "tracks" | "albums" | "artists" | "playlists";
  items: Track[] | Album[] | Artist[];
}

export interface SearchResults {
  songs: Track[];
  albums: Album[];
  artists: Artist[];
}
