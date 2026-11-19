"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Track } from "@/types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type RepeatMode = "off" | "all" | "one";

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  playTrack: (track: Track, queue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex?: number, shuffleStart?: boolean) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (timeSec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  clearError: () => void;
  removeFromQueue: (index: number) => void;
  jumpToQueueIndex: (index: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const RECENTS_KEY = "vibeify:recents";
const VOLUME_KEY = "vibeify:volume";
const SHUFFLE_KEY = "vibeify:shuffle";
const REPEAT_KEY = "vibeify:repeat";

function loadRecents(): Track[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getRecentTracks(): Track[] {
  if (typeof window === "undefined") return [];
  return loadRecents().slice(0, 20);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  // keep latest values in refs for event handlers
  const stateRef = useRef({ queue, queueIndex, shuffle, repeat, currentTrack });
  useEffect(() => {
    stateRef.current = { queue, queueIndex, shuffle, repeat, currentTrack };
  });

  // init audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const savedVol = Number(localStorage.getItem(VOLUME_KEY));
    if (!isNaN(savedVol)) {
      audio.volume = Math.min(1, Math.max(0, savedVol));
      setVolumeState(audio.volume);
    }
    setShuffle(localStorage.getItem(SHUFFLE_KEY) === "1");
    const r = localStorage.getItem(REPEAT_KEY) as RepeatMode | null;
    if (r) setRepeat(r);

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => {
      const { repeat: rep } = stateRef.current;
      if (rep === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      handleNextRef.current(true);
    };
    const onError = () => {
      setIsLoading(false);
      setError("This track couldn't be played. Try another one.");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const recordRecent = useCallback((track: Track) => {
    try {
      const recents = loadRecents().filter((t) => t.id !== track.id);
      recents.unshift(track);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, 50)));
    } catch {
      /* ignore */
    }
    if (user && isSupabaseConfigured()) {
      const supabase = getSupabase();
      supabase
        .from("recently_played")
        .insert({ user_id: user.id, track: track, played_at: new Date().toISOString() })
        .then(() => {
          // duplicates are prevented by unique constraints in the schema
        });
    }
  }, [user]);

  const loadTrack = useCallback(
    (track: Track, autoplay: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;
      setError(null);
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);
      setCurrentTrack(track);
      if (!track.previewUrl) {
        setIsLoading(false);
        setError("No playable preview available for this track.");
        setIsPlaying(false);
        return;
      }
      audio.src = track.previewUrl;
      if (autoplay) {
        audio.play().catch(() => {
          setIsPlaying(false);
          setError("Playback was blocked. Press play to start.");
        });
      }
      recordRecent(track);
    },
    [recordRecent]
  );

  const pickNextIndex = useCallback((fromIndex: number, q: Track[], shuf: boolean): number => {
    if (q.length === 0) return -1;
    if (shuf && q.length > 1) {
      let next = fromIndex;
      while (next === fromIndex) next = Math.floor(Math.random() * q.length);
      return next;
    }
    const next = fromIndex + 1;
    return next < q.length ? next : -1;
  }, []);

  const handleNextRef = useRef<(auto?: boolean) => void>(() => {});

  const next = useCallback(() => {
    const { queue: q, queueIndex: qi, shuffle: shuf, repeat: rep } = stateRef.current;
    if (q.length === 0) return;
    const ni = pickNextIndex(qi, q, shuf);
    if (ni === -1) {
      if (rep === "all") {
        const t = q[0];
        setQueueIndex(0);
        loadTrack(t, true);
      } else {
        setIsPlaying(false);
        audioRef.current?.pause();
      }
      return;
    }
    setQueueIndex(ni);
    loadTrack(q[ni], true);
  }, [pickNextIndex, loadTrack]);
  useEffect(() => {
    handleNextRef.current = next;
  }, [next]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const { queue: q, queueIndex: qi } = stateRef.current;
    if (q.length === 0) return;
    const pi = qi > 0 ? qi - 1 : q.length - 1;
    setQueueIndex(pi);
    loadTrack(q[pi], true);
  }, [loadTrack]);

  const playTrack = useCallback(
    (track: Track, q?: Track[]) => {
      if (q && q.length > 0) {
        const idx = q.findIndex((t) => t.id === track.id);
        setQueue(q);
        setQueueIndex(idx >= 0 ? idx : 0);
        loadTrack(track, true);
      } else {
        setQueue([track]);
        setQueueIndex(0);
        loadTrack(track, true);
      }
    },
    [loadTrack]
  );

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0, shuffleStart = false) => {
      const playable = tracks.filter((t) => t.previewUrl);
      if (playable.length === 0) return;
      const idx = Math.min(startIndex, playable.length - 1);
      setQueue(playable);
      if (shuffleStart && playable.length > 1) {
        const shuffled = [...playable];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setQueue(shuffled);
        setQueueIndex(0);
        setShuffle(true);
        localStorage.setItem(SHUFFLE_KEY, "1");
        loadTrack(shuffled[0], true);
      } else {
        setQueueIndex(idx);
        loadTrack(playable[idx], true);
      }
    },
    [loadTrack]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      audio.play().catch(() => setError("Playback was blocked by the browser."));
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const seek = useCallback((timeSec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(timeSec, audio.duration || timeSec));
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    const clamped = Math.min(1, Math.max(0, v));
    if (audio) {
      audio.volume = clamped;
      audio.muted = false;
    }
    setMuted(false);
    setVolumeState(clamped);
    localStorage.setItem(VOLUME_KEY, String(clamped));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => {
      localStorage.setItem(SHUFFLE_KEY, s ? "0" : "1");
      return !s;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      const nextMode: RepeatMode = r === "off" ? "all" : r === "all" ? "one" : "off";
      localStorage.setItem(REPEAT_KEY, nextMode);
      return nextMode;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((q) => {
        const nq = q.filter((_, i) => i !== index);
        setQueueIndex((qi) => {
          if (index < qi) return qi - 1;
          if (index === qi) {
            // current removed; play next available
            const ni = Math.min(qi, nq.length - 1);
            if (nq.length > 0 && ni >= 0) {
              setTimeout(() => {
                setQueueIndex(ni);
                loadTrack(nq[ni], true);
              }, 0);
            } else {
              audioRef.current?.pause();
              setCurrentTrack(null);
            }
            return ni;
          }
          return qi;
        });
        return nq;
      });
    },
    [loadTrack]
  );

  const jumpToQueueIndex = useCallback(
    (index: number) => {
      const t = stateRef.current.queue[index];
      if (!t) return;
      setQueueIndex(index);
      loadTrack(t, true);
    },
    [loadTrack]
  );

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const audio = audioRef.current;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (audio && currentTrack) togglePlay();
          break;
        case "ArrowRight":
          if (audio) seek(audio.currentTime + 5);
          break;
        case "ArrowLeft":
          if (audio) seek(audio.currentTime - 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(volume - 0.05);
          break;
        case "n":
        case "N":
          next();
          break;
        case "p":
        case "P":
          prev();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTrack, togglePlay, seek, setVolume, volume, next, prev]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      queueIndex,
      isPlaying,
      isLoading,
      error,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      playTrack,
      playQueue,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      clearError,
      removeFromQueue,
      jumpToQueueIndex,
    }),
    [
      currentTrack, queue, queueIndex, isPlaying, isLoading, error, currentTime, duration,
      volume, muted, shuffle, repeat, playTrack, playQueue, togglePlay, next, prev, seek,
      setVolume, toggleMute, toggleShuffle, cycleRepeat, clearError, removeFromQueue, jumpToQueueIndex,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
