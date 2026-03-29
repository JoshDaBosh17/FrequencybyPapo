import { NextResponse } from "next/server";

import { resolveCanonicalSongEntry } from "@/lib/server/song-correction";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { title?: string; artist?: string };
    const title = body.title?.trim();
    const artist = body.artist?.trim();

    if (!title || !artist) {
      return NextResponse.json({ error: "title and artist are required" }, { status: 400 });
    }

    const resolution = await resolveCanonicalSongEntry(title, artist);
    return NextResponse.json(resolution);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve song name." },
      { status: 500 },
    );
  }
}
