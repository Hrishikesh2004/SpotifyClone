"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Album, Artist, Playlist, Track } from "@/types";

type PlaylistRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
};

function db() {
  if (!isSupabaseConfigured()) return null;
  return getSupabase();
}

export function isAuthReady() {
  return isSupabaseConfigured();
}

// ---------- Playlists ----------

export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, description, cover_url, created_at, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  // attach track counts
  const { data: tracks } = await supabase
    .from("playlist_tracks")
    .select("playlist_id")
    .in("playlist_id", (data as PlaylistRow[]).map((p) => p.id));
  const counts = new Map<string, number>();
  for (const t of tracks ?? []) counts.set(t.playlist_id, (counts.get(t.playlist_id) ?? 0) + 1);
  return (data as PlaylistRow[]).map((p) => ({
    id: p.id,
    userId: p.user_id,
    name: p.name,
    description: p.description ?? undefined,
    coverUrl: p.cover_url,
    isOwner: true,
    trackCount: counts.get(p.id) ?? 0,
    createdAt: p.created_at,
  }));
}

export async function createPlaylist(userId: string, name: string, description = ""): Promise<Playlist | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("playlists")
    .insert({ user_id: userId, name, description })
    .select("id, name, description, cover_url, created_at")
    .single();
  if (error || !data) return null;
  return { id: data.id, userId, name: data.name, description: data.description, coverUrl: data.cover_url, isOwner: true, trackCount: 0, createdAt: data.created_at };
}

export async function updatePlaylist(playlistId: string, updates: { name?: string; description?: string; cover_url?: string | null }) {
  const supabase = db();
  if (!supabase) return;
  await supabase.from("playlists").update(updates).eq("id", playlistId);
}

export async function deletePlaylist(playlistId: string) {
  const supabase = db();
  if (!supabase) return;
  await supabase.from("playlists").delete().eq("id", playlistId);
}

export async function getPlaylistWithTracks(playlistId: string) {
  const supabase = db();
  if (!supabase) return null;
  const { data: playlist, error } = await supabase
    .from("playlists")
    .select("id, name, description, cover_url, created_at, user_id")
    .eq("id", playlistId)
    .single();
  if (error || !playlist) return null;
  const { data: rows } = await supabase
    .from("playlist_tracks")
    .select("track, position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  const tracks = ((rows ?? []) as { track: Track }[]).map((r) => r.track);
  return {
    playlist: {
      id: playlist.id,
      userId: playlist.user_id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.cover_url,
      isOwner: true,
      trackCount: tracks.length,
      totalDurationMs: tracks.reduce((s: number, t: Track) => s + (t.durationMs ?? 0), 0),
      createdAt: playlist.created_at,
    } as Playlist,
    tracks,
  };
}

export async function addTrackToPlaylist(playlistId: string, track: Track) {
  const supabase = db();
  if (!supabase) return;
  const { data: maxRow } = await supabase
    .from("playlist_tracks")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (maxRow?.position ?? -1) + 1;
  await supabase.from("playlist_tracks").insert({ playlist_id: playlistId, track, position });
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  const supabase = db();
  if (!supabase) return;
  await supabase.from("playlist_tracks").delete().eq("playlist_id", playlistId).eq("track->>id", trackId);
}

export async function reorderPlaylistTracks(playlistId: string, orderedTrackIds: string[]) {
  const supabase = db();
  if (!supabase) return;
  // fetch rows then update positions
  const { data: rows } = await supabase
    .from("playlist_tracks")
    .select("id, track")
    .eq("playlist_id", playlistId);
  const updates = ((rows ?? []) as { id: string; track: Track }[])
    .map((r) => ({ id: r.id, trackId: r.track.id }))
    .filter((r) => orderedTrackIds.includes(r.trackId));
  for (let i = 0; i < updates.length; i++) {
    await supabase.from("playlist_tracks").update({ position: i }).eq("id", updates[i].id);
  }
}

// ---------- Liked songs ----------

export async function getLikedTracks(userId: string): Promise<Track[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("liked_songs")
    .select("track")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as { track: Track }[]).map((r) => r.track);
}

export async function isTrackLiked(userId: string, trackId: string): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { data } = await supabase
    .from("liked_songs")
    .select("id")
    .eq("user_id", userId)
    .eq("track->>id", trackId)
    .maybeSingle();
  return !!data;
}

export async function toggleLikeTrack(userId: string, track: Track): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const liked = await isTrackLiked(userId, track.id);
  if (liked) {
    await supabase.from("liked_songs").delete().eq("user_id", userId).eq("track->>id", track.id);
    return false;
  }
  await supabase.from("liked_songs").insert({ user_id: userId, track });
  return true;
}

// ---------- Saved albums ----------

export async function getSavedAlbums(userId: string): Promise<Album[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("saved_albums")
    .select("album")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as { album: Album }[]).map((r) => r.album);
}

export async function toggleSavedAlbum(userId: string, album: Album): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { data } = await supabase
    .from("saved_albums")
    .select("id")
    .eq("user_id", userId)
    .eq("album->>id", album.id)
    .maybeSingle();
  if (data) {
    await supabase.from("saved_albums").delete().eq("id", data.id);
    return false;
  }
  await supabase.from("saved_albums").insert({ user_id: userId, album });
  return true;
}

// ---------- Followed artists ----------

export async function getFollowedArtists(userId: string): Promise<Artist[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("followed_artists")
    .select("artist")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as { artist: Artist }[]).map((r) => r.artist);
}

export async function toggleFollowArtist(userId: string, artist: Artist): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { data } = await supabase
    .from("followed_artists")
    .select("id")
    .eq("user_id", userId)
    .eq("artist->>id", artist.id)
    .maybeSingle();
  if (data) {
    await supabase.from("followed_artists").delete().eq("id", data.id);
    return false;
  }
  await supabase.from("followed_artists").insert({ user_id: userId, artist });
  return true;
}

// ---------- Recently played ----------

export async function getRecentPlays(userId: string): Promise<Track[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("recently_played")
    .select("track, played_at")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(30);
  // dedupe by track id keeping most recent
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const r of data ?? []) {
    const t = r.track as Track;
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}
