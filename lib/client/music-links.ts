import type { RoomShareSourcePlatform } from "@/lib/types";

export type MusicLinkResolutionResult = {
  matched: boolean;
  platform: RoomShareSourcePlatform | null;
  trackId: string | null;
  title: string | null;
  artist: string | null;
  artworkUrl: string | null;
  fallbackLabel: string;
  url: string;
};

export async function resolveMusicLink(url: string) {
  const response = await fetch("/api/music-links/resolve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error("Could not resolve music link.");
  }

  return (await response.json()) as MusicLinkResolutionResult;
}
