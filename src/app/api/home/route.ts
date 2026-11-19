import { NextResponse } from "next/server";
import { getHomeSections } from "@/lib/music";

export async function GET() {
  try {
    const sections = await getHomeSections();
    return NextResponse.json({ sections });
  } catch {
    return NextResponse.json({ sections: [] }, { status: 500 });
  }
}
