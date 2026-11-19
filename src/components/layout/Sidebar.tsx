"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Library, Plus, Heart, LogOut, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { getUserPlaylists } from "@/lib/services";
import type { Playlist } from "@/types";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Your Library", icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (!user) {
      setPlaylists([]);
      return;
    }
    getUserPlaylists(user.id).then(setPlaylists);
  }, [user, pathname]);

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-60 flex-col gap-2 bg-black p-2 md:flex">
      {/* Logo + main nav */}
      <div className="rounded-lg bg-panel p-4">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
            <Music2 size={18} className="text-black" fill="currentColor" />
          </span>
          <span className="text-xl font-black tracking-tight">Vibeify</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-4 rounded-md px-3 py-2.5 text-sm font-medium transition",
                  active ? "text-white" : "text-text-dim hover:text-white"
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Library */}
      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-panel">
        <div className="flex items-center justify-between p-4 pb-2">
          <Link href="/library" className="flex items-center gap-3 text-sm font-medium text-text-dim transition hover:text-white">
            <Library size={20} />
            Your Library
          </Link>
          {user && (
            <button
              onClick={() => router.push("/library?new=1")}
              className="rounded-full p-1.5 text-text-dim transition hover:bg-card hover:text-white"
              aria-label="Create playlist"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <Link
            href="/playlist/liked"
            className={cn(
              "flex items-center gap-3 rounded-md p-2 transition hover:bg-card",
              pathname === "/playlist/liked" && "bg-card"
            )}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              <Heart size={18} className="text-white" fill="currentColor" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">Liked Songs</span>
              <span className="block text-xs text-text-dim">Playlist</span>
            </span>
          </Link>
          {playlists.map((p) => (
            <Link
              key={p.id}
              href={`/playlist/${p.id}`}
              className={cn(
                "flex items-center gap-3 rounded-md p-2 transition hover:bg-card",
                pathname === `/playlist/${p.id}` && "bg-card"
              )}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-card text-text-dim">
                {p.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Music2 size={16} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-text-dim">Playlist · {p.trackCount ?? 0} songs</span>
              </span>
            </Link>
          ))}
          {!user && (
            <p className="px-3 py-4 text-xs text-text-mute">
              <Link href="/login" className="text-accent hover:underline">
                Log in
              </Link>{" "}
              to create and save playlists.
            </p>
          )}
        </div>
      </div>

      {/* User footer */}
      <div className="rounded-lg bg-panel p-4">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-black">
                {(profile?.username ?? user.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-sm font-medium">{profile?.username ?? user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="rounded-full p-2 text-text-dim transition hover:bg-card hover:text-white"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-text-dim">Preview mode — log in to save music.</p>
            <div className="flex gap-2">
              <Link href="/login" className="flex-1 rounded-full bg-white px-3 py-1.5 text-center text-xs font-bold text-black hover:scale-105">
                Log In
              </Link>
              <Link href="/signup" className="flex-1 rounded-full border border-white/20 px-3 py-1.5 text-center text-xs font-bold hover:border-white">
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
