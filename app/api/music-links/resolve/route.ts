import { NextResponse } from "next/server";

import {
  buildMusicLinkFallbackLabel,
  detectMusicLinkPlatform,
  extractSpotifyTrackId,
} from "@/lib/frequency/music-link";
import { extractMusicLinkMetadata } from "@/lib/server/song-platform-links";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const detectedPlatform = detectMusicLinkPlatform(url);

    if (!detectedPlatform) {
      return NextResponse.json({
        artist: null,
        artworkUrl: null,
        fallbackLabel: buildMusicLinkFallbackLabel(url, null),
        matched: false,
        platform: null,
        title: null,
        trackId: null,
        url,
      });
    }

    const metadata = await extractMusicLinkMetadata(url);
    const platform = metadata.sourcePlatform ?? detectedPlatform;

    return NextResponse.json({
      artist: metadata.artist ?? null,
      artworkUrl: metadata.artworkUrl ?? null,
      fallbackLabel: buildMusicLinkFallbackLabel(url, platform),
      matched: Boolean(metadata.title && metadata.artist),
      platform,
      title: metadata.title ?? null,
      trackId: platform === "spotify" ? extractSpotifyTrackId(url) : null,
      url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not resolve music link.",
      },
      { status: 500 },
    );
  }
}
