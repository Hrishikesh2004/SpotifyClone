import { NextRequest, NextResponse } from "next/server";
import { getAlbumTracks } from "@/lib/music";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const collectionId = Number(id.replace(/^itunes_album_/, ""));
  if (!collectionId || isNaN(collectionId)) {
    return NextResponse.json({ error: "Invalid album id" }, { status: 400 });
  }
  try {
    const data = await getAlbumTracks(collectionId);
    if (!data.album || data.tracks.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load album" }, { status: 500 });
  }
}
