"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, Pause, Shuffle, UserCheck, UserPlus, Clock3 } from "lucide-react";
import type { Artist, Album, Track } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { MediaCard } from "@/components/music/MediaCard";
import { TrackRowsSkeleton } from "@/components/ui/Skeletons";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { toggleFollowArtist, getFollowedArtists } from "@/lib/services";
import { formatCount } from "@/lib/utils";

interface ArtistData {
  artist: Artist;
  popularTracks: Track[];
  albums: Album[];
  allTracks: Track[];
}

export default function ArtistPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { playQueue, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [monthlyListeners] = useState(() => Math.floor(1_000_000 + Math.random() * 40_000_000));

  const artistId = params.id;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/artist/${artistId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [artistId]);

  useEffect(() => {
    if (!user || !data?.artist) return;
    getFollowedArtists(user.id).then((artists) => {
      setFollowing(artists.some((a) => a.id === data.artist.id));
    });
  }, [user, data?.artist]);

  if (loading) {
    return (
      <div className="px-6 pb-10 pt-8">
        <div className="h-64 animate-pulse rounded-2xl bg-gradient-to-br from-card to-panel" />
        <div className="mt-6 h-12 w-1/2 animate-pulse rounded bg-card" />
        <div className="mt-8">
          <TrackRowsSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Artist not found</h1>
        <p className="text-sm text-text-dim">We couldn&rsquo;t find this artist.</p>
        <button onClick={() => router.push("/")} className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-black">
          Back to Home
        </button>
      </div>
    );
  }

  const { artist, popularTracks, albums } = data;
  const playable = popularTracks.filter((t) => t.previewUrl);
  const isArtistPlaying = playable.some((t) => t.id === currentTrack?.id) && isPlaying;

  const handlePlay = () => {
    if (isArtistPlaying) togglePlay();
    else playQueue(playable);
  };

  const handleFollow = async () => {
    if (!user) {
      toast("Log in to follow artists", "error");
      return;
    }
    const nowFollowing = await toggleFollowArtist(user.id, artist);
    setFollowing(nowFollowing);
    toast(nowFollowing ? `Following ${artist.name}` : `Unfollowed ${artist.name}`);
  };

  return (
    <div className="pb-10">
      {/* Banner */}
      <div className="relative h-56 overflow-hidden md:h-80">
        {artist.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artist.imageUrl} alt="" className="h-full w-full scale-110 object-cover blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-card to-panel" />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-text-dim">Artist</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">{artist.name}</h1>
          <p className="mt-2 text-sm font-medium text-text-dim">
            {formatCount(monthlyListeners)} monthly listeners
          </p>
        </div>
      </div>

      {/* Avatar + actions */}
      <div className="flex items-end gap-6 px-6 pt-6">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-ink shadow-2xl md:h-28 md:w-28">
          {artist.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.imageUrl} alt={artist.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-card">
              <UserCheck size={32} className="text-text-mute" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3 pb-2">
          <button
            onClick={handlePlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105 hover:bg-accent-bright"
            aria-label={isArtistPlaying ? "Pause" : "Play artist"}
          >
            {isArtistPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>
          <button
            onClick={() => playQueue(playable, 0, true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white hover:scale-105"
            aria-label="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={handleFollow}
            className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition ${
              following ? "border-accent/50 bg-accent/10 text-accent" : "border-white/20 text-white hover:border-white"
            }`}
          >
            {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {following ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      {/* Popular tracks */}
      <section className="mt-10 px-6">
        <h2 className="mb-4 text-2xl font-bold">Popular</h2>
        <div className="flex flex-col">
          {popularTracks.slice(0, 10).map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} queue={playable} />
          ))}
          {popularTracks.length === 0 && (
            <p className="py-6 text-sm text-text-dim">No popular tracks found.</p>
          )}
        </div>
      </section>

      {/* Albums */}
      {albums.length > 0 && (
        <section className="mt-10 px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Discography</h2>
            <span className="flex items-center gap-1 text-sm text-text-dim">
              <Clock3 size={14} /> Sorted by popularity
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {albums.map((a) => (
              <MediaCard key={a.id} item={a} kind="album" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
