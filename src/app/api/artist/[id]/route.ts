import { NextRequest, NextResponse } from "next/server";
import { getArtistData } from "@/lib/music";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const artistId = Number(id.replace(/^itunes_artist_/, ""));
  if (!artistId || isNaN(artistId)) {
    return NextResponse.json({ error: "Invalid artist id" }, { status: 400 });
  }
  try {
    const data = await getArtistData(artistId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load artist" }, { status: 500 });
  }
}
