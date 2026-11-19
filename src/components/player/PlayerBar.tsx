"use client";

import { usePlayer } from "@/context/PlayerContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  X,
  Loader2,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function ProgressBar({
  value,
  max,
  onChange,
  className,
  buffered,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
  buffered?: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const bufPct = max > 0 && buffered ? (buffered / max) * 100 : 0;
  return (
    <div className={cn("group relative h-4 w-full", className)}>
      <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[#4d4d4d]">
        {bufPct > 0 && (
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#7a7a7a]" style={{ width: `${bufPct}%` }} />
        )}
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={max || 1}
        step={0.1}
        value={Math.min(value, max || value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vibe-range absolute inset-0 h-4 w-full opacity-0"
        style={{
          background: `linear-gradient(to right, #1db954 ${pct}%, #4d4d4d ${pct}%)`,
        }}
        aria-label="Seek"
      />
    </div>
  );
}

function VolumeControl() {
  const { volume, muted, setVolume, toggleMute } = usePlayer();
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="hidden items-center gap-2 md:flex">
      <button
        onClick={toggleMute}
        className="text-text-dim transition hover:text-white"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        <Icon size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="vibe-range w-24"
        style={{
          background: `linear-gradient(to right, #fff ${muted ? 0 : volume * 100}%, #4d4d4d ${muted ? 0 : volume * 100}%)`,
        }}
        aria-label="Volume"
      />
    </div>
  );
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleRepeat,
    clearError,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);

  if (!currentTrack) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-center border-t border-white/5 bg-panel/95 backdrop-blur md:left-60">
        <p className="text-xs text-text-mute">
          Play something — click any song or press play on a playlist.
        </p>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-panel/95 backdrop-blur">
      {/* error banner */}
      {error && (
        <div className="flex items-center justify-between bg-error/15 px-4 py-1.5 text-xs text-error">
          <span>{error}</span>
          <button onClick={clearError} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:h-[72px] md:px-6">
        {/* left: track info */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-card">
            {currentTrack.artworkUrl ? (
              <Image
                src={currentTrack.artworkUrl}
                alt={currentTrack.album}
                fill
                className="object-cover"
                unoptimized
                sizes="48px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-mute">
                <ListMusic size={18} />
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={16} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={currentTrack.albumId ? `/album/${currentTrack.albumId}` : "/search"}
              className="block truncate text-sm font-medium text-white hover:underline"
            >
              {currentTrack.title}
            </Link>
            <Link
              href={currentTrack.artistId ? `/artist/${currentTrack.artistId}` : "/search"}
              className="block truncate text-xs text-text-dim hover:text-white hover:underline"
            >
              {currentTrack.artist}
            </Link>
          </div>
        </div>

        {/* center: controls + progress (desktop) */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={cn("hidden transition sm:block", shuffle ? "text-accent" : "text-text-dim hover:text-white")}
              aria-label="Shuffle"
            >
              <Shuffle size={16} />
            </button>
            <button onClick={prev} className="text-text-dim transition hover:text-white" aria-label="Previous">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={next} className="text-text-dim transition hover:text-white" aria-label="Next">
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button
              onClick={cycleRepeat}
              className={cn("hidden transition sm:block", repeat !== "off" ? "text-accent" : "text-text-dim hover:text-white")}
              aria-label="Repeat"
            >
              {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>
          <div className="hidden w-full max-w-md items-center gap-2 md:flex">
            <span className="w-10 text-right text-[11px] text-text-dim">{formatDuration(currentTime * 1000)}</span>
            <ProgressBar
              value={currentTime}
              max={duration || currentTrack.durationMs / 1000 || 1}
              onChange={seek}
              className="flex-1"
            />
            <span className="w-10 text-[11px] text-text-dim">
              {formatDuration((duration || currentTrack.durationMs / 1000) * 1000)}
            </span>
          </div>
        </div>

        {/* right: volume + queue */}
        <div className="flex items-center justify-end gap-3">
          <VolumeControl />
          <button
            onClick={() => setShowQueue((s) => !s)}
            className={cn("transition", showQueue ? "text-accent" : "text-text-dim hover:text-white")}
            aria-label="Queue"
          >
            <ListMusic size={18} />
          </button>
        </div>
      </div>

      {/* mobile progress */}
      <div className="px-4 pb-1 md:hidden">
        <ProgressBar
          value={currentTime}
          max={duration || currentTrack.durationMs / 1000 || 1}
          onChange={seek}
        />
      </div>

      {/* queue popover */}
      {showQueue && <QueuePopover onClose={() => setShowQueue(false)} />}
    </footer>
  );
}

function QueuePopover({ onClose }: { onClose: () => void }) {
  const { queue, queueIndex, currentTrack, jumpToQueueIndex, removeFromQueue } = usePlayer();
  const upcoming = queue.slice(queueIndex + 1);
  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 max-w-[90vw] rounded-xl border border-white/10 bg-elevated p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold">Queue</h3>
        <button onClick={onClose} className="text-text-dim hover:text-white" aria-label="Close queue">
          <X size={16} />
        </button>
      </div>
      {currentTrack && (
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-card/60 p-2">
          <div className="relative h-10 w-10 overflow-hidden rounded">
            {currentTrack.artworkUrl && (
              <Image src={currentTrack.artworkUrl} alt="" fill className="object-cover" unoptimized sizes="40px" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentTrack.title}</p>
            <p className="truncate text-xs text-text-dim">{currentTrack.artist}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Now playing</span>
        </div>
      )}
      <div className="max-h-64 overflow-y-auto">
        {upcoming.length === 0 && <p className="px-1 py-3 text-xs text-text-mute">Nothing up next.</p>}
        {upcoming.map((t, i) => {
          const realIndex = queueIndex + 1 + i;
          return (
            <div key={`${t.id}-${realIndex}`} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-card">
              <button onClick={() => jumpToQueueIndex(realIndex)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                  {t.artworkUrl && (
                    <Image src={t.artworkUrl} alt="" fill className="object-cover" unoptimized sizes="40px" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{t.title}</p>
                  <p className="truncate text-xs text-text-dim">{t.artist}</p>
                </div>
              </button>
              <button
                onClick={() => removeFromQueue(realIndex)}
                className="text-text-mute opacity-0 transition hover:text-white group-hover:opacity-100"
                aria-label="Remove from queue"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
