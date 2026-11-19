"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { getRecentTracks } from "@/context/PlayerContext";
import type { HomeSection, Track, Album, Artist } from "@/types";
import { MediaCard } from "@/components/music/MediaCard";
import { SectionRow } from "@/components/music/SectionRow";
import { HomeSkeleton } from "@/components/ui/Skeletons";
import { getRecentPlays } from "@/lib/services";

const GENRES = [
  { name: "Pop", query: "pop hits", color: "from-pink-600 to-rose-400" },
  { name: "Hip-Hop", query: "hip hop", color: "from-orange-600 to-amber-400" },
  { name: "Rock", query: "rock", color: "from-red-700 to-red-400" },
  { name: "Electronic", query: "electronic dance", color: "from-purple-700 to-fuchsia-400" },
  { name: "Jazz", query: "jazz", color: "from-blue-700 to-sky-400" },
  { name: "Lo-Fi", query: "lofi", color: "from-emerald-700 to-teal-400" },
  { name: "Classical", query: "classical", color: "from-amber-700 to-yellow-400" },
  { name: "R&B", query: "rnb soul", color: "from-indigo-700 to-violet-400" },
  { name: "Country", query: "country", color: "from-lime-700 to-green-400" },
  { name: "Metal", query: "heavy metal", color: "from-zinc-700 to-neutral-400" },
  { name: "Indie", query: "indie", color: "from-cyan-700 to-blue-400" },
  { name: "Folk", query: "folk", color: "from-stone-600 to-amber-300" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const { playQueue } = usePlayer();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [recents, setRecents] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => (r.ok ? r.json() : { sections: [] }))
      .then((d) => setSections(d.sections ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    // recents: prefer server if logged in, else localStorage
    if (user) {
      getRecentPlays(user.id).then((t) => {
        if (t.length > 0) setRecents(t);
        else setRecents(getRecentTracks());
      });
    } else {
      setRecents(getRecentTracks());
    }
  }, [user]);

  if (loading) return <HomeSkeleton />;

  const allPlayable = sections
    .filter((s) => s.kind === "tracks")
    .flatMap((s) => s.items as Track[])
    .filter((t) => t.previewUrl);

  return (
    <div className="px-6 pb-10 pt-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{greeting()}</h1>
          <p className="mt-1 text-sm text-text-dim">Your daily dose of good vibes.</p>
        </div>
        {allPlayable.length > 0 && (
          <button
            onClick={() => playQueue(allPlayable.slice(0, 30))}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-xl transition hover:scale-105 hover:bg-accent-bright"
            aria-label="Play all"
          >
            <Play size={20} fill="currentColor" className="ml-0.5" />
          </button>
        )}
      </div>

      {/* Recently played quick grid */}
      {recents.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Recently played</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {recents.slice(0, 12).map((t) => (
              <RecentCard key={t.id} track={t} />
            ))}
          </div>
        </section>
      )}

      {/* Genre cards */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Browse all</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {GENRES.map((g) => (
            <Link
              key={g.name}
              href={`/search?q=${encodeURIComponent(g.query)}`}
              className={cn2("group relative h-28 overflow-hidden rounded-xl bg-gradient-to-br p-4 transition hover:scale-[1.02]", g.color)}
            >
              <span className="text-lg font-bold">{g.name}</span>
              <div className="absolute -bottom-4 -right-4 h-20 w-20 rotate-[25deg] rounded-lg bg-black/25 shadow-2xl transition group-hover:rotate-0 group-hover:scale-110" />
            </Link>
          ))}
        </div>
      </section>

      {sections.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-panel p-10 text-center">
          <p className="text-text-dim">Couldn&rsquo;t load music right now. Check your connection and refresh.</p>
        </div>
      )}

      {sections.map((section) => (
        <SectionRow key={section.id} title={section.title} subtitle={section.subtitle}>
          {section.kind === "tracks" &&
            (section.items as Track[]).slice(0, 12).map((t, i) => (
              <TrackCardInRow key={`${t.id}-${i}`} track={t} queue={section.items as Track[]} />
            ))}
          {section.kind === "albums" &&
            (section.items as Album[]).map((a) => <MediaCard key={a.id} item={a} kind="album" />)}
          {section.kind === "artists" &&
            (section.items as Artist[]).map((a) => <MediaCard key={a.id} item={a} kind="artist" />)}
        </SectionRow>
      ))}
    </div>
  );
}

function cn2(...c: string[]) {
  return c.filter(Boolean).join(" ");
}

function RecentCard({ track }: { track: Track }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  return (
    <button
      onClick={() => (isCurrent ? togglePlay() : playTrack(track, [track]))}
      className="group flex items-center gap-3 overflow-hidden rounded-lg bg-card/70 p-2 text-left transition hover:bg-card"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs text-text-dim">{track.artist}</p>
      </div>
      <Play
        size={16}
        className={isCurrent && isPlaying ? "text-accent" : "text-text-mute opacity-0 group-hover:opacity-100"}
        fill="currentColor"
      />
    </button>
  );
}

function TrackCardInRow({ track, queue }: { track: Track; queue: Track[] }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  return (
    <button
      onClick={() => (isCurrent ? togglePlay() : playTrack(track, queue))}
      className="group flex w-52 shrink-0 items-center gap-3 rounded-lg bg-card/70 p-2 text-left transition hover:bg-card"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          {isCurrent && isPlaying ? (
            <span className="flex gap-0.5">
              <span className="h-3 w-0.5 animate-pulse bg-accent" />
              <span className="h-3 w-0.5 animate-pulse bg-accent" style={{ animationDelay: "0.2s" }} />
            </span>
          ) : (
            <Play size={16} className="text-white" fill="currentColor" />
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs text-text-dim">{track.artist}</p>
      </div>
    </button>
  );
}
