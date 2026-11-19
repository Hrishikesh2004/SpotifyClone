"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart, Music2, Plus, ListMusic, Disc3, User, Clock, type LucideIcon } from "lucide-react";
import type { Album, Artist, Playlist, Track } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getRecentTracks } from "@/context/PlayerContext";
import {
  getUserPlaylists,
  createPlaylist,
  getSavedAlbums,
  getFollowedArtists,
  getRecentPlays,
} from "@/lib/services";
import { MediaCard } from "@/components/music/MediaCard";
import { TrackRow } from "@/components/music/TrackRow";
import { TrackRowsSkeleton } from "@/components/ui/Skeletons";

type Tab = "playlists" | "albums" | "artists" | "recents";

function LibraryContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("playlists");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [recents, setRecents] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    if (user) {
      const [p, a, ar, r] = await Promise.all([
        getUserPlaylists(user.id),
        getSavedAlbums(user.id),
        getFollowedArtists(user.id),
        getRecentPlays(user.id),
      ]);
      setPlaylists(p);
      setAlbums(a);
      setArtists(ar);
      setRecents(r.length > 0 ? r : getRecentTracks());
    } else {
      setRecents(getRecentTracks());
      setPlaylists([]);
      setAlbums([]);
      setArtists([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [load, authLoading]);

  // handle ?new=1
  useEffect(() => {
    if (params.get("new") === "1") {
      if (user) setCreating(true);
      else toast("Log in to create playlists", "error");
      router.replace("/library", { scroll: false });
    }
  }, [params, user, router, toast]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    const p = await createPlaylist(user.id, newName.trim());
    if (p) {
      setPlaylists((prev) => [p, ...prev]);
      setCreating(false);
      setNewName("");
      toast(`Playlist "${p.name}" created`);
      router.push(`/playlist/${p.id}`);
    } else {
      toast("Failed to create playlist", "error");
    }
  };

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "albums", label: "Albums", icon: Disc3 },
    { id: "artists", label: "Artists", icon: User },
    { id: "recents", label: "Recently played", icon: Clock },
  ];

  return (
    <div className="px-6 pb-10 pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight">Your Library</h1>
        {user && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:scale-105"
          >
            <Plus size={16} /> New playlist
          </button>
        )}
      </div>

      {!user && !authLoading && (
        <div className="mb-8 flex flex-col items-start gap-3 rounded-xl border border-white/10 bg-panel p-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-semibold">You&rsquo;re browsing as a guest</p>
            <p className="text-sm text-text-dim">Log in to save playlists, like songs, and follow artists.</p>
          </div>
          <Link href="/login" className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-black hover:bg-accent-bright">
            Log In
          </Link>
        </div>
      )}

      {creating && (
        <div className="mb-6 flex max-w-md items-center gap-2 rounded-xl border border-accent/40 bg-panel p-4">
          <Music2 size={20} className="shrink-0 text-accent" />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Playlist name"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-mute"
          />
          <button onClick={handleCreate} className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-black">
            Create
          </button>
          <button onClick={() => setCreating(false)} className="text-xs text-text-dim hover:text-white">
            Cancel
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === id ? "bg-white text-black" : "bg-card text-text-dim hover:bg-card-hover hover:text-white"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <TrackRowsSkeleton rows={6} />
      ) : (
        <>
          {tab === "playlists" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {/* Liked songs card */}
              <Link
                href={user ? "/playlist/liked" : "/login"}
                className="group relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 shadow-lg transition hover:scale-[1.02]"
              >
                <Heart size={40} className="text-white" fill="currentColor" />
                <p className="absolute bottom-4 left-4 text-lg font-bold">Liked Songs</p>
              </Link>
              {playlists.map((p) => (
                <Link
                  key={p.id}
                  href={`/playlist/${p.id}`}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-card shadow-lg transition hover:scale-[1.02]"
                >
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ListMusic size={40} className="text-text-mute" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-text-dim">{p.trackCount ?? 0} songs</p>
                  </div>
                </Link>
              ))}
              {user && playlists.length === 0 && (
                <button
                  onClick={() => setCreating(true)}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 text-text-dim transition hover:border-white/40 hover:text-white"
                >
                  <Plus size={28} />
                  <span className="text-sm font-medium">Create playlist</span>
                </button>
              )}
            </div>
          )}

          {tab === "albums" &&
            (albums.length === 0 ? (
              <EmptyState icon={Disc3} title="No saved albums" hint={user ? "Save albums from album pages." : "Log in to save albums."} />
            ) : (
              <div className="flex flex-wrap gap-5">
                {albums.map((a) => (
                  <MediaCard key={a.id} item={a} kind="album" />
                ))}
              </div>
            ))}

          {tab === "artists" &&
            (artists.length === 0 ? (
              <EmptyState icon={User} title="No followed artists" hint={user ? "Follow artists from artist pages." : "Log in to follow artists."} />
            ) : (
              <div className="flex flex-wrap gap-8">
                {artists.map((a) => (
                  <MediaCard key={a.id} item={a} kind="artist" />
                ))}
              </div>
            ))}

          {tab === "recents" &&
            (recents.length === 0 ? (
              <EmptyState icon={Clock} title="Nothing played yet" hint="Play some music and it'll show up here." />
            ) : (
              <div className="flex max-w-3xl flex-col">
                {recents.map((t, i) => (
                  <TrackRow key={`${t.id}-${i}`} track={t} index={i} queue={recents} />
                ))}
              </div>
            ))}
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-panel py-16 text-center">
      <Icon size={40} className="text-text-mute" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-text-dim">{hint}</p>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<TrackRowsSkeleton />}>
      <LibraryContent />
    </Suspense>
  );
}
