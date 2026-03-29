import { NextResponse } from "next/server";

import { enrichRoomShareItem } from "@/lib/server/room-share-enrichment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let roomId: string | undefined;
  let itemId: string | undefined;

  try {
    const body = (await request.json()) as {
      roomId?: string;
      itemId?: string;
    };

    roomId = body.roomId;
    itemId = body.itemId;

    console.log("[frequency][room-share-enrichment]", {
      event: "api_room_share_enrich_received",
      roomId: roomId ?? null,
      itemId: itemId ?? null,
    });

    if (!roomId || !itemId) {
      return NextResponse.json(
        { error: "roomId and itemId are required" },
        { status: 400 },
      );
    }

    const result = await enrichRoomShareItem({ roomId, itemId });

    console.log("[frequency][room-share-enrichment]", {
      event: "api_room_share_enrich_completed",
      roomId,
      itemId,
      hasAppleMusic: Boolean(result.links?.appleMusic),
      primaryGenre: result.primaryGenre,
      hasSoundCloud: Boolean(result.links?.soundcloud),
      status: result.status,
      source: result.source,
      hasSpotify: Boolean(result.links?.spotify),
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[frequency][room-share-enrichment]", {
      event: "api_room_share_enrich_failed",
      roomId: roomId ?? null,
      itemId: itemId ?? null,
      error: error instanceof Error ? error.message : "Room share enrichment failed.",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Room share enrichment failed." },
      { status: 500 },
    );
  }
}
