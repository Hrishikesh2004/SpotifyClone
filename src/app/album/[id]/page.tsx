"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Play, Shuffle, Clock3, Pause } from "lucide-react";
import type { Album, Track } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { TrackRowsSkeleton } from "@/components/ui/Skeletons";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { toggleSavedAlbum, getSavedAlbums } from "@/lib/services";
import { formatTotalDuration } from "@/lib/utils";
import { Heart } from "lucide-react";

interface AlbumData {
  album: Album | null;
  tracks: Track[];
}

export default function AlbumPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { playQueue, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const albumId = params.id;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/album/${albumId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [albumId]);

  useEffect(() => {
    if (!user || !data?.album) return;
    getSavedAlbums(user.id).then((albums) => {
      setSaved(albums.some((a) => a.id === data.album!.id));
    });
  }, [user, data?.album]);

  if (loading) {
    return (
      <div className="px-6 pb-10 pt-8">
        <div className="flex items-end gap-6">
          <div className="h-48 w-48 animate-pulse rounded-lg bg-card md:h-56 md:w-56" />
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

  if (!data?.album) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Album not found</h1>
        <p className="text-sm text-text-dim">This album may have been removed or the link is invalid.</p>
        <button onClick={() => router.push("/")} className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-black">
          Back to Home
        </button>
      </div>
    );
  }

  const { album, tracks } = data;
  const playable = tracks.filter((t) => t.previewUrl);
  const isAlbumPlaying = playable.some((t) => t.id === currentTrack?.id) && isPlaying;

  const handlePlayAll = () => {
    if (isAlbumPlaying) togglePlay();
    else playQueue(playable);
  };

  const handleShuffle = () => playQueue(playable, 0, true);

  const handleSave = async () => {
    if (!user) {
      toast("Log in to save albums", "error");
      return;
    }
    const nowSaved = await toggleSavedAlbum(user.id, album);
    setSaved(nowSaved);
    toast(nowSaved ? "Album saved to your library" : "Album removed");
  };

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="relative px-6 pb-6 pt-10">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,0.5), transparent), url(${album.artworkUrl}) center/cover`,
          }}
        />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-end">
          <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-lg shadow-2xl md:h-56 md:w-56">
            {album.artworkUrl ? (
              <Image src={album.artworkUrl} alt={album.title} fill className="object-cover" unoptimized sizes="224px" />
            ) : (
              <div className="h-full w-full bg-card" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wide text-text-dim">Album</p>
            <h1 className="mt-1 truncate text-3xl font-black tracking-tight md:text-5xl lg:text-6xl">{album.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-text-dim">
              {album.artistId ? (
                <button onClick={() => router.push(`/artist/${album.artistId}`)} className="font-semibold text-white hover:underline">
                  {album.artist}
                </button>
              ) : (
                <span className="font-semibold text-white">{album.artist}</span>
              )}
              {album.releaseYear && <span>· {album.releaseYear}</span>}
              <span>· {tracks.length} songs</span>
              {album.genre && <span>· {album.genre}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-ink/80 px-6 py-4 backdrop-blur">
        <button
          onClick={handlePlayAll}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105 hover:bg-accent-bright"
          aria-label={isAlbumPlaying ? "Pause" : "Play album"}
        >
          {isAlbumPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>
        <button
          onClick={handleShuffle}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white hover:scale-105"
          aria-label="Shuffle album"
        >
          <Shuffle size={18} />
        </button>
        <button
          onClick={handleSave}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${saved ? "border-accent text-accent" : "border-white/20 text-text-dim hover:border-white hover:text-white"}`}
          aria-label={saved ? "Remove from library" : "Save album"}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="ml-auto hidden items-center gap-1 text-sm text-text-dim md:flex">
          <Clock3 size={16} /> {formatTotalDuration(tracks.reduce((s, t) => s + t.durationMs, 0))}
        </span>
      </div>

      {/* Tracklist */}
      <div className="mt-2 px-3">
        <div className="hidden grid-cols-[auto_minmax(0,4fr)_minmax(0,3fr)_minmax(0,2fr)_auto] gap-3 border-b border-white/10 px-3 pb-2 text-xs font-medium uppercase tracking-wider text-text-mute md:grid">
          <span className="w-8">#</span>
          <span>Title</span>
          <span>Album</span>
          <span>Plays</span>
          <span className="w-16 text-right">
            <Clock3 size={14} className="inline" />
          </span>
        </div>
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={playable} showAlbum={false} />
        ))}
        {tracks.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-text-dim">No tracks found for this album.</p>
        )}
      </div>
    </div>
  );
}
