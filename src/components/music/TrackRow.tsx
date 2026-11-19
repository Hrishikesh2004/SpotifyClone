"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Heart, ListPlus, Check } from "lucide-react";
import type { Track } from "@/types";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { isTrackLiked, toggleLikeTrack, getUserPlaylists, createPlaylist, addTrackToPlaylist } from "@/lib/services";
import { formatDuration, cn } from "@/lib/utils";
import type { Playlist } from "@/types";

interface TrackRowProps {
  track: Track;
  index?: number;
  queue?: Track[];
  showAlbum?: boolean;
  showArt?: boolean;
  onRemove?: () => void;
}

export function TrackRow({ track, index, queue, showAlbum = true, showArt = true, onRemove }: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { user } = useAuth();
  const toast = useToast();
  const [liked, setLiked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCurrent = currentTrack?.id === track.id;

  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    isTrackLiked(user.id, track.id).then(setLiked);
  }, [user, track.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queue);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast("Log in to save liked songs", "error");
      return;
    }
    const nowLiked = await toggleLikeTrack(user.id, track);
    setLiked(nowLiked);
    toast(nowLiked ? "Added to Liked Songs" : "Removed from Liked Songs");
  };

  const openMenu = async () => {
    setMenuOpen(true);
    if (user && playlists.length === 0) {
      setPlaylists(await getUserPlaylists(user.id));
    }
  };

  const addTo = async (playlistId: string) => {
    await addTrackToPlaylist(playlistId, track);
    setMenuOpen(false);
    toast("Added to playlist");
  };

  const createAndAdd = async () => {
    if (!user) {
      toast("Log in to create playlists", "error");
      return;
    }
    const name = prompt("Playlist name");
    if (!name?.trim()) return;
    const p = await createPlaylist(user.id, name.trim());
    if (p) {
      await addTrackToPlaylist(p.id, track);
      setPlaylists((prev) => [p, ...prev]);
      setMenuOpen(false);
      toast(`Added to "${p.name}"`);
    }
  };

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-card/60 md:grid-cols-[auto_minmax(0,4fr)_minmax(0,3fr)_minmax(0,2fr)_auto]",
        isCurrent && "bg-card/60"
      )}
    >
      {/* index / play */}
      <div className="flex w-8 items-center justify-center">
        {isCurrent && isPlaying ? (
          <button onClick={togglePlay} className="text-accent" aria-label="Pause">
            <Pause size={14} fill="currentColor" />
          </button>
        ) : (
          <>
            <span className="text-sm text-text-dim group-hover:hidden">
              {typeof index === "number" ? index + 1 : ""}
            </span>
            <button onClick={handlePlay} className="hidden text-white group-hover:block" aria-label="Play">
              <Play size={14} fill="currentColor" />
            </button>
          </>
        )}
      </div>

      {/* title + artist */}
      <div className="flex min-w-0 items-center gap-3">
        {showArt && (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
            {track.artworkUrl ? (
              <Image src={track.artworkUrl} alt={track.album} fill className="object-cover" unoptimized sizes="40px" />
            ) : (
              <div className="h-full w-full bg-card" />
            )}
          </div>
        )}
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium", isCurrent ? "text-accent" : "text-white")}>
            {track.title}
          </p>
          <Link
            href={track.artistId ? `/artist/${track.artistId}` : "/search"}
            className="block truncate text-xs text-text-dim hover:text-white hover:underline"
          >
            {track.artist}
          </Link>
        </div>
      </div>

      {/* album */}
      {showAlbum && (
        <Link
          href={track.albumId ? `/album/${track.albumId}` : "/search"}
          className="hidden truncate text-sm text-text-dim hover:text-white hover:underline md:block"
        >
          {track.album}
        </Link>
      )}

      {/* duration + actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleLike}
          className={cn("transition", liked ? "text-accent" : "text-text-mute opacity-0 hover:text-white group-hover:opacity-100")}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
        </button>
        <span className="hidden text-sm text-text-dim md:block">{formatDuration(track.durationMs)}</span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={openMenu}
            className="text-text-mute opacity-0 transition hover:text-white group-hover:opacity-100"
            aria-label="Add to playlist"
          >
            <ListPlus size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 w-56 rounded-lg border border-white/10 bg-elevated p-1.5 shadow-2xl">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-mute">Add to playlist</p>
              {!user && (
                <p className="px-3 py-2 text-xs text-text-dim">Log in to save to playlists.</p>
              )}
              {user && playlists.length === 0 && (
                <p className="px-3 py-2 text-xs text-text-dim">No playlists yet.</p>
              )}
              {user &&
                playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addTo(p.id)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-card"
                  >
                    <Check size={14} className="text-accent" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              <button
                onClick={createAndAdd}
                className="mt-1 w-full rounded-md border-t border-white/10 px-3 py-2 text-left text-sm font-medium text-accent hover:bg-card"
              >
                + New playlist
              </button>
            </div>
          )}
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-text-mute hover:text-error" aria-label="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
