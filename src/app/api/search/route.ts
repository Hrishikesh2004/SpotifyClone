import { NextRequest, NextResponse } from "next/server";
import { searchSongs, searchAlbums, searchArtists, searchJamendo } from "@/lib/music";

// Simple in-memory rate limiter (per serverless instance)
const hits = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ songs: [], albums: [], artists: [] });
  }

  try {
    const [songs, albums, artists, jamendo] = await Promise.all([
      searchSongs(q, 20).catch(() => []),
      searchAlbums(q, 12).catch(() => []),
      searchArtists(q, 12).catch(() => []),
      searchJamendo(q, 12).catch(() => []),
    ]);

    const allSongs = [...songs, ...jamendo].slice(0, 30);
    return NextResponse.json({ songs: allSongs, albums, artists });
  } catch {
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
