"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Pause, User, Disc3 } from "lucide-react";
import type { Album, Artist, Track } from "@/types";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MediaCardProps {
  item: Track | Album | Artist;
  kind: "track" | "album" | "artist";
  queue?: Track[];
}

function hrefFor(item: Track | Album | Artist, kind: string): string {
  if (kind === "album") return `/album/${(item as Album).id}`;
  if (kind === "artist") return `/artist/${(item as Artist).id}`;
  const t = item as Track;
  return t.albumId ? `/album/${t.albumId}` : "/search";
}

export function MediaCard({ item, kind, queue }: MediaCardProps) {
  const { currentTrack, isPlaying, playTrack, playQueue, togglePlay } = usePlayer();
  const [imgError, setImgError] = useState(false);

  const title = kind === "track" ? (item as Track).title : kind === "album" ? (item as Album).title : (item as Artist).name;
  const subtitle =
    kind === "track"
      ? (item as Track).artist
      : kind === "album"
        ? (item as Album).artist
        : "Artist";
  const image = (item as Track | Album).artworkUrl ?? (item as Artist).imageUrl ?? "";
  const isCurrentTrack = kind === "track" && currentTrack?.id === item.id && isPlaying;

  const rounded = kind === "artist" ? "rounded-full" : "rounded-lg";

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (kind === "track") {
      const t = item as Track;
      if (currentTrack?.id === t.id) togglePlay();
      else playTrack(t, queue);
    } else if (kind === "album") {
      // fetch album tracks then play — handled by album page; here play card as queue if possible
      // For cards we only have metadata; navigate instead is handled by link. Play button for album
      // triggers a fetch of tracks via API.
      fetch(`/api/album/${(item as Album).id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.tracks?.length) playQueue(data.tracks);
        });
    }
  };

  return (
    <Link href={hrefFor(item, kind)} className="group relative block w-40 shrink-0 sm:w-48">
      <div className={cn("relative aspect-square w-full overflow-hidden bg-card shadow-lg transition duration-300 group-hover:bg-card-hover", rounded)}>
        {image && !imgError ? (
          <Image
            src={image}
            alt={title}
            fill
            className={cn("object-cover", kind === "artist" && "object-cover")}
            unoptimized
            sizes="(max-width: 640px) 160px, 192px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-mute">
            {kind === "artist" ? <User size={40} /> : kind === "album" ? <Disc3 size={40} /> : <Play size={32} />}
          </div>
        )}
        {kind !== "artist" && (
          <button
            onClick={handlePlay}
            className={cn(
              "absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-xl transition-all duration-300 hover:scale-105 hover:bg-accent-bright",
              "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
              isCurrentTrack && "translate-y-0 opacity-100"
            )}
            aria-label={isCurrentTrack ? "Pause" : "Play"}
          >
            {isCurrentTrack ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
        )}
      </div>
      <div className="mt-3">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-text-dim">{subtitle}</p>
      </div>
    </Link>
  );
}
