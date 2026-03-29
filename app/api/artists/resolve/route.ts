import { NextResponse } from "next/server";

import { resolveCanonicalArtistName } from "@/lib/server/artist-correction";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim();

    if (!input) {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }

    const resolution = await resolveCanonicalArtistName(input);
    return NextResponse.json(resolution);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve artist name." },
      { status: 500 },
    );
  }
}
