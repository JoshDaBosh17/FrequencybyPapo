import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let userId: string | undefined;
  let itemId: string | undefined;

  try {
    const body = (await request.json()) as {
      userId?: string;
      itemId?: string;
    };

    userId = body.userId;
    itemId = body.itemId;

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: "userId and itemId are required" },
        { status: 400 },
      );
    }

    const { enrichPersonalSongItem } = await import(
      "@/lib/server/personal-song-enrichment"
    );
    const result = await enrichPersonalSongItem({ userId, itemId });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[frequency][personal-song-enrichment]", {
      event: "api_personal_song_enrichment_failed",
      userId: userId ?? null,
      itemId: itemId ?? null,
      error:
        error instanceof Error
          ? error.message
          : "Personal song enrichment failed.",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Personal song enrichment failed.",
      },
      { status: 500 },
    );
  }
}
