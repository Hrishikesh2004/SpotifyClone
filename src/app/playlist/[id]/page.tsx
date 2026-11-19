"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Play, Pause, Shuffle, Pencil, Trash2, Heart, Music2, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import type { Playlist, Track } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { TrackRowsSkeleton } from "@/components/ui/Skeletons";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  getPlaylistWithTracks,
  getLikedTracks,
  updatePlaylist,
  deletePlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
} from "@/lib/services";
import { formatTotalDuration } from "@/lib/utils";

export default function PlaylistPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { playQueue, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const playlistId = params.id;
  const isLiked = playlistId === "liked";

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (isLiked) {
      if (user) {
        const liked = await getLikedTracks(user.id);
        setTracks(liked);
        setPlaylist({
          id: "liked",
          name: "Liked Songs",
          description: "Your favorite tracks",
          coverUrl: null,
          isLikedSongs: true,
          isOwner: true,
          trackCount: liked.length,
          totalDurationMs: liked.reduce((s, t) => s + (t.durationMs ?? 0), 0),
        });
      } else {
        setPlaylist(null);
        setTracks([]);
      }
    } else {
      const data = await getPlaylistWithTracks(playlistId);
      if (data) {
        // verify ownership via RLS — playlist only returns for owner or shared
        setPlaylist({ ...data.playlist, isOwner: data.playlist.userId === user?.id });
        setTracks(data.tracks);
      } else {
        setPlaylist(null);
        setTracks([]);
      }
    }
    setLoading(false);
  }, [isLiked, playlistId, user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [load, authLoading]);

  const playable = tracks.filter((t) => t.previewUrl);
  const isPlayingList = playable.some((t) => t.id === currentTrack?.id) && isPlaying;

  const handlePlayAll = () => {
    if (isPlayingList) togglePlay();
    else playQueue(playable);
  };

  const handleShuffle = () => playQueue(playable, 0, true);

  const startEdit = () => {
    setEditName(playlist?.name ?? "");
    setEditDesc(playlist?.description ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!playlist || playlist.isLikedSongs) return;
    await updatePlaylist(playlist.id, { name: editName.trim() || playlist.name, description: editDesc });
    setPlaylist({ ...playlist, name: editName.trim() || playlist.name, description: editDesc });
    setEditing(false);
    toast("Playlist updated");
  };

  const handleDelete = async () => {
    if (!playlist || playlist.isLikedSongs) return;
    await deletePlaylist(playlist.id);
    toast("Playlist deleted");
    router.push("/library");
  };

  const moveTrack = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    const next = [...tracks];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setTracks(next);
    await reorderPlaylistTracks(playlist!.id, next.map((t) => t.id));
  };

  const removeTrack = async (track: Track) => {
    if (isLiked) {
      if (!user) return;
      const { toggleLikeTrack } = await import("@/lib/services");
      await toggleLikeTrack(user.id, track);
      setTracks((t) => t.filter((x) => x.id !== track.id));
    } else {
      await removeTrackFromPlaylist(playlist!.id, track.id);
      setTracks((t) => t.filter((x) => x.id !== track.id));
    }
    toast("Removed from playlist");
  };

  if (authLoading || loading) {
    return (
      <div className="px-6 pb-10 pt-8">
        <div className="flex items-end gap-6">
          <div className="h-44 w-44 animate-pulse rounded-lg bg-card md:h-56 md:w-56" />
          <div className="flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-card" />
            <div className="mt-3 h-12 w-2/3 animate-pulse rounded bg-card" />
          </div>
        </div>
        <div className="mt-8">
          <TrackRowsSkeleton rows={8} />
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Music2 size={48} className="text-text-mute" />
        <h1 className="text-2xl font-bold">
          {isLiked ? "Log in to see your Liked Songs" : "Playlist not found"}
        </h1>
        <p className="max-w-sm text-sm text-text-dim">
          {isLiked
            ? "Your liked songs are saved to your account. Log in to view them."
            : "This playlist doesn't exist or you don't have access to it."}
        </p>
        <button
          onClick={() => router.push(isLiked ? "/login" : "/library")}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-black"
        >
          {isLiked ? "Log In" : "Go to Library"}
        </button>
      </div>
    );
  }

  const owner = playlist.isOwner;

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex flex-col items-start gap-6 px-6 pb-6 pt-10 md:flex-row md:items-end">
        <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-2xl md:h-56 md:w-56">
          {playlist.isLikedSongs ? (
            <div className="flex h-full w-full items-center justify-center">
              <Heart size={64} className="text-white" fill="currentColor" />
            </div>
          ) : playlist.coverUrl ? (
            <Image src={playlist.coverUrl} alt={playlist.name} fill className="object-cover" unoptimized sizes="224px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 size={56} className="text-white/80" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-wide text-text-dim">
            {playlist.isLikedSongs ? "Playlist" : owner ? "Your playlist" : "Playlist"}
          </p>
          {editing ? (
            <div className="mt-2 flex max-w-lg flex-col gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-md bg-white/10 px-3 py-2 text-2xl font-black outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Add a description"
                className="rounded-md bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-black">
                  <Check size={14} /> Save
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold">
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mt-1 truncate text-3xl font-black tracking-tight md:text-5xl">{playlist.name}</h1>
              {playlist.description && <p className="mt-2 text-sm text-text-dim">{playlist.description}</p>}
              <p className="mt-2 text-sm text-text-dim">
                {playlist.trackCount ?? tracks.length} songs · {formatTotalDuration(tracks.reduce((s, t) => s + (t.durationMs ?? 0), 0))}
                {user && !playlist.isLikedSongs && playlist.userId && ` · ${playlist.userId === user.id ? "You" : "Shared"}`}
              </p>
            </>
          )}
        </div>
        {!editing && owner && !playlist.isLikedSongs && (
          <div className="flex gap-2">
            <button onClick={startEdit} className="rounded-full border border-white/20 p-2.5 text-text-dim transition hover:border-white hover:text-white" aria-label="Edit playlist">
              <Pencil size={16} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-full border border-white/20 p-2.5 text-text-dim transition hover:border-error hover:text-error"
              aria-label="Delete playlist"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-ink/80 px-6 py-4 backdrop-blur">
        <button
          onClick={handlePlayAll}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105 hover:bg-accent-bright"
          aria-label={isPlayingList ? "Pause" : "Play"}
        >
          {isPlayingList ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>
        <button
          onClick={handleShuffle}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white hover:scale-105"
          aria-label="Shuffle"
        >
          <Shuffle size={18} />
        </button>
      </div>

      {/* Tracks */}
      <div className="mt-2 px-3">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Music2 size={40} className="text-text-mute" />
            <p className="text-text-dim">
              {isLiked ? "Songs you like will appear here." : "This playlist is empty. Add songs from any track's menu."}
            </p>
          </div>
        ) : (
          tracks.map((t, i) => (
            <div key={t.id} className="group/row relative">
              <TrackRow track={t} index={i} queue={playable} />
              {owner && !playlist.isLikedSongs && (
                <div className="absolute right-16 top-1/2 hidden -translate-y-1/2 flex-col gap-1 group-hover/row:flex">
                  <button onClick={() => moveTrack(i, -1)} className="rounded p-1 text-text-mute hover:text-white" aria-label="Move up">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveTrack(i, 1)} className="rounded p-1 text-text-mute hover:text-white" aria-label="Move down">
                    <ArrowDown size={14} />
                  </button>
                </div>
              )}
              {(owner || isLiked) && (
                <button
                  onClick={() => removeTrack(t)}
                  className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded p-1 text-text-mute opacity-0 transition hover:text-error group-hover/row:opacity-100"
                  aria-label="Remove"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm rounded-xl bg-elevated p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Delete playlist?</h3>
            <p className="mt-2 text-sm text-text-dim">&ldquo;{playlist.name}&rdquo; will be permanently deleted.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold hover:border-white">
                Cancel
              </button>
              <button onClick={handleDelete} className="rounded-full bg-error px-4 py-2 text-sm font-bold text-white hover:opacity-90">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
