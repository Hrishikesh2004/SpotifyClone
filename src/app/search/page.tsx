"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search as SearchIcon, Clock, Play, X } from "lucide-react";
import type { SearchResults } from "@/types";
import { TrackRow } from "@/components/music/TrackRow";
import { MediaCard } from "@/components/music/MediaCard";
import { TrackRowsSkeleton } from "@/components/ui/Skeletons";
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const RECENT_KEY = "vibeify:recent-searches";

function loadRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

const GENRES = ["Pop", "Hip-Hop", "Rock", "Electronic", "Jazz", "Lo-Fi", "Classical", "R&B", "Country", "Metal", "Indie", "Folk"];
const GENRE_COLORS = [
  "bg-pink-600", "bg-orange-600", "bg-red-700", "bg-purple-700", "bg-blue-700",
  "bg-emerald-700", "bg-amber-700", "bg-indigo-700", "bg-lime-700", "bg-zinc-700",
  "bg-cyan-700", "bg-stone-600",
];

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { playQueue } = usePlayer();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecents(loadRecents());
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        const r = loadRecents().filter((x) => x.toLowerCase() !== q.toLowerCase());
        r.unshift(q);
        localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 8)));
        setRecents(r.slice(0, 8));
      }
    } catch {
      toast("Search failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const q = params.get("q") ?? "";
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), q ? 300 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params, doSearch]);

  const onChange = (v: string) => {
    setQuery(v);
    router.replace(`/search?q=${encodeURIComponent(v)}`, { scroll: false });
  };

  const clearRecents = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecents([]);
  };

  const showEmpty = !query.trim();

  return (
    <div className="px-6 pb-10 pt-8">
      {/* Search input */}
      <div className="sticky top-0 z-20 -mx-6 mb-8 bg-ink/90 px-6 py-4 backdrop-blur">
        <div className="relative max-w-xl">
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder="What do you want to listen to?"
            className="h-12 w-full rounded-full border border-transparent bg-card pl-12 pr-10 text-sm font-medium text-white placeholder:text-text-mute focus:border-white/20 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => onChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-mute hover:text-white"
              aria-label="Clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {showEmpty ? (
        <>
          {recents.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Recent searches</h2>
                <button onClick={clearRecents} className="text-xs font-medium text-text-dim hover:text-white">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recents.map((r) => (
                  <button
                    key={r}
                    onClick={() => onChange(r)}
                    className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium transition hover:bg-card-hover"
                  >
                    <Clock size={14} className="text-text-dim" />
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xl font-bold">Browse all</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {GENRES.map((g, i) => (
                <button
                  key={g}
                  onClick={() => onChange(g)}
                  className={cn(GENRE_COLORS[i % GENRE_COLORS.length], "group relative h-28 overflow-hidden rounded-xl p-4 text-left transition hover:scale-[1.02]")}
                >
                  <span className="text-lg font-bold">{g}</span>
                  <div className="absolute -bottom-4 -right-4 h-20 w-20 rotate-[25deg] rounded-lg bg-black/25 shadow-2xl transition group-hover:rotate-0 group-hover:scale-110" />
                </button>
              ))}
            </div>
          </section>
        </>
      ) : loading ? (
        <TrackRowsSkeleton rows={8} />
      ) : results ? (
        <div className="flex flex-col gap-10">
          {/* Top result / songs */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Songs</h2>
              {results.songs.length > 0 && (
                <button
                  onClick={() => playQueue(results.songs.filter((t) => t.previewUrl))}
                  className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-black transition hover:bg-accent-bright"
                >
                  <Play size={16} fill="currentColor" /> Play all
                </button>
              )}
            </div>
            {results.songs.length === 0 ? (
              <p className="text-sm text-text-dim">No songs found for &ldquo;{query}&rdquo;.</p>
            ) : (
              <div className="flex flex-col">
                {results.songs.slice(0, 8).map((t, i) => (
                  <TrackRow key={t.id} track={t} index={i} queue={results.songs} />
                ))}
              </div>
            )}
          </section>

          {results.albums.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Albums</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {results.albums.map((a) => (
                  <MediaCard key={a.id} item={a} kind="album" />
                ))}
              </div>
            </section>
          )}

          {results.artists.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Artists</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {results.artists.map((a) => (
                  <MediaCard key={a.id} item={a} kind="artist" />
                ))}
              </div>
            </section>
          )}

          {results.songs.length === 0 && results.albums.length === 0 && results.artists.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-panel p-10 text-center">
              <p className="text-text-dim">No results for &ldquo;{query}&rdquo;. Try a different search.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<TrackRowsSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}
