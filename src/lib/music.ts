import type { Album, Artist, HomeSection, Track } from "@/types";
import { artwork } from "@/lib/utils";

const ITUNES = "https://itunes.apple.com";

interface ItunesSong {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artistId?: number;
  collectionName?: string;
  collectionId?: number;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackNumber?: number;
  releaseDate?: string;
}

interface ItunesAlbum {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artistId?: number;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
  primaryGenreName?: string;
}

interface ItunesArtist {
  artistId?: number;
  artistName?: string;
  primaryGenreName?: string;
}

interface ItunesResult extends ItunesSong, ItunesAlbum, ItunesArtist {}

async function itunesFetch(params: Record<string, string>): Promise<ItunesResult[]> {
  const url = new URL(`${ITUNES}/search`);
  url.searchParams.set("country", "US");
  url.searchParams.set("lang", "en_us");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "Vibeify/1.0" },
  });
  if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

async function itunesLookup(params: Record<string, string>): Promise<ItunesResult[]> {
  const url = new URL(`${ITUNES}/lookup`);
  url.searchParams.set("country", "US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "Vibeify/1.0" },
  });
  if (!res.ok) throw new Error(`iTunes lookup error: ${res.status}`);
  const data = await res.json();
  return (data.results ?? []) as ItunesResult[];
}

export function mapSong(r: ItunesSong): Track | null {
  if (!r.trackId || !r.trackName || !r.previewUrl) return null;
  return {
    id: `itunes_${r.trackId}`,
    title: r.trackName,
    artist: r.artistName ?? "Unknown Artist",
    artistId: r.artistId ? `itunes_artist_${r.artistId}` : undefined,
    album: r.collectionName ?? "Single",
    albumId: r.collectionId ? `itunes_album_${r.collectionId}` : undefined,
    artworkUrl: artwork(r.artworkUrl100, 600),
    previewUrl: r.previewUrl,
    durationMs: r.trackTimeMillis ?? 0,
    source: "itunes",
    trackNumber: r.trackNumber,
    releaseYear: r.releaseDate ? new Date(r.releaseDate).getFullYear() : undefined,
  };
}

export function mapAlbum(r: ItunesAlbum): Album | null {
  if (!r.collectionId || !r.collectionName) return null;
  return {
    id: `itunes_album_${r.collectionId}`,
    title: r.collectionName,
    artist: r.artistName ?? "Various Artists",
    artistId: r.artistId ? `itunes_artist_${r.artistId}` : undefined,
    artworkUrl: artwork(r.artworkUrl100, 600),
    releaseYear: r.releaseDate ? new Date(r.releaseDate).getFullYear() : undefined,
    trackCount: r.trackCount,
    genre: r.primaryGenreName,
  };
}

export function mapArtist(r: ItunesArtist, imageUrl = ""): Artist | null {
  if (!r.artistId || !r.artistName) return null;
  return {
    id: `itunes_artist_${r.artistId}`,
    name: r.artistName,
    imageUrl,
    genres: r.primaryGenreName ? [r.primaryGenreName] : undefined,
  };
}

export async function searchSongs(term: string, limit = 25): Promise<Track[]> {
  const results = await itunesFetch({ term, entity: "song", limit: String(limit) });
  return results.map(mapSong).filter((t): t is Track => t !== null);
}

export async function searchAlbums(term: string, limit = 12): Promise<Album[]> {
  const results = await itunesFetch({ term, entity: "album", limit: String(limit) });
  return results.map(mapAlbum).filter((a): a is Album => a !== null);
}

export async function searchArtists(term: string, limit = 12): Promise<Artist[]> {
  const results = await itunesFetch({ term, entity: "musicArtist", limit: String(limit) });
  return results.map((r) => mapArtist(r)).filter((a): a is Artist => a !== null);
}

/** Look up all songs in an album by iTunes collectionId. */
export async function getAlbumTracks(collectionId: number): Promise<{ album: Album | null; tracks: Track[] }> {
  const results = await itunesLookup({ id: String(collectionId), entity: "song", limit: "200" });
  const songs = results.map(mapSong).filter((t): t is Track => t !== null);
  const first = results.find((r) => r.collectionId) as ItunesSong | undefined;
  const album = first ? mapAlbum(first as unknown as ItunesAlbum) : null;
  songs.sort((a, b) => (a.trackNumber ?? 999) - (b.trackNumber ?? 999));
  return { album, tracks: songs };
}

/** Get artist info + top tracks + discography. */
export async function getArtistData(artistId: number) {
  // Fetch artist entity for the name
  let name = "Artist";
  let imageUrl = "";
  try {
    const artists = await itunesLookup({ id: String(artistId), entity: "musicArtist" });
    const a = artists[0] as ItunesArtist | undefined;
    if (a?.artistName) name = a.artistName;
  } catch {
    /* ignore */
  }

  const songs = await searchSongs(name, 50);
  const artistSongs = songs.filter((s) => s.artist === name || s.artistId === `itunes_artist_${artistId}`);

  // Use artwork of the artist's most popular song as avatar
  if (artistSongs[0]?.artworkUrl) imageUrl = artistSongs[0].artworkUrl;

  // Unique albums from the artist's songs
  const albumMap = new Map<string, Album>();
  for (const s of artistSongs) {
    if (s.albumId && !albumMap.has(s.albumId)) {
      albumMap.set(s.albumId, {
        id: s.albumId,
        title: s.album,
        artist: s.artist,
        artistId: s.artistId,
        artworkUrl: s.artworkUrl,
        releaseYear: s.releaseYear,
      });
    }
  }

  return {
    artist: { id: `itunes_artist_${artistId}`, name, imageUrl } satisfies Artist,
    popularTracks: artistSongs.slice(0, 10),
    albums: [...albumMap.values()].slice(0, 12),
    allTracks: artistSongs,
  };
}

/** Curated home sections using iTunes search. */
export async function getHomeSections() {
  const queries: { id: string; title: string; subtitle?: string; term: string; kind: "tracks" | "albums" }[] = [
    { id: "trending", title: "Trending Now", term: "top hits 2025", kind: "tracks" },
    { id: "chill", title: "Chill Vibes", subtitle: "Relax and unwind", term: "chill lofi", kind: "tracks" },
    { id: "workout", title: "Beast Mode", subtitle: "High energy tracks", term: "workout remix", kind: "tracks" },
    { id: "focus", title: "Deep Focus", subtitle: "Music to concentrate", term: "ambient focus", kind: "tracks" },
    { id: "feelgood", title: "Feel Good", subtitle: "Happy songs to lift your mood", term: "feel good pop", kind: "tracks" },
    { id: "rock", title: "Rock Classics", term: "classic rock", kind: "tracks" },
  ];

  const albumQueries = [
    { id: "featured-albums", title: "Featured Albums", term: "album of the year" },
    { id: "new-releases", title: "New Releases", term: "new music" },
  ];

  const settled = await Promise.allSettled([
    ...queries.map((q) => searchSongs(q.term, 12)),
    ...albumQueries.map((q) => searchAlbums(q.term, 12)),
    searchArtists("popular artists", 10),
  ]);

  const sections: HomeSection[] = queries.map((q, i) => {
    const res = settled[i];
    return {
      id: q.id,
      title: q.title,
      subtitle: q.subtitle,
      kind: "tracks" as const,
      items: res.status === "fulfilled" ? res.value : [],
    };
  }).filter((s) => s.items.length > 0);

  albumQueries.forEach((q, i) => {
    const res = settled[queries.length + i];
    const items = res.status === "fulfilled" ? res.value : [];
    if (items.length > 0) {
      sections.push({ id: q.id, title: q.title, kind: "albums", items });
    }
  });

  const artistRes = settled[queries.length + albumQueries.length];
  if (artistRes.status === "fulfilled" && artistRes.value.length > 0) {
    sections.push({ id: "artists", title: "Recommended Artists", kind: "artists", items: artistRes.value });
  }

  // Derive "Made for you" mixes from top tracks
  const allTracks = sections.flatMap((s) => (s.kind === "tracks" ? (s.items as Track[]) : []));
  const top = allTracks.slice(0, 30);
  if (top.length > 0) {
    sections.unshift({
      id: "made-for-you",
      title: "Made For You",
      subtitle: "Daily mixes picked just for you",
      kind: "tracks",
      items: top,
    });
  }

  return sections;
}

interface JamendoTrack {
  id?: number;
  name?: string;
  artist_name?: string;
  album_name?: string;
  image?: string;
  audio?: string;
  duration?: number;
}

// ---- Jamendo (optional, requires JAMENDO_CLIENT_ID) ----
export async function searchJamendo(term: string, limit = 20): Promise<Track[]> {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) return [];
  try {
    const url = new URL("https://api.jamendo.com/v3/tracks/");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("include", "musicinfo");
    url.searchParams.set("search", term);
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: JamendoTrack[] };
    return (data.results ?? []).map((t): Track | null => {
      if (!t.id || !t.name) return null;
      return {
        id: `jamendo_${t.id}`,
        title: t.name,
        artist: t.artist_name ?? "Unknown Artist",
        album: t.album_name ?? "Single",
        artworkUrl: t.image ?? "",
        previewUrl: t.audio ?? null,
        durationMs: (t.duration ?? 0) * 1000,
        source: "jamendo",
      };
    }).filter((t): t is Track => t !== null);
  } catch {
    return [];
  }
}
