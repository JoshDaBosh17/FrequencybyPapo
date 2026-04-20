import type { RoomSharePlatformLinks, RoomShareSourcePlatform } from "@/lib/types";

function parseUrl(value: string | null | undefined) {
  try {
    return value ? new URL(value.trim()) : null;
  } catch {
    return null;
  }
}

export function looksLikeHttpUrl(value: string | null | undefined) {
  return /^https?:\/\//i.test((value ?? "").trim());
}

export function detectMusicLinkPlatform(
  url: string | null | undefined,
): RoomShareSourcePlatform | null {
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname === "open.spotify.com" || hostname.endsWith(".spotify.com")) {
    return "spotify";
  }

  if (
    hostname === "music.apple.com" ||
    hostname === "itunes.apple.com" ||
    hostname.endsWith(".apple.com")
  ) {
    return "appleMusic";
  }

  if (hostname === "soundcloud.com" || hostname.endsWith(".soundcloud.com")) {
    return "soundcloud";
  }

  if (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  ) {
    return "youtube";
  }

  return null;
}

export function extractSpotifyTrackId(url: string | null | undefined) {
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return null;
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const trackIndex = segments.findIndex((segment) => segment === "track");
  const trackId = trackIndex >= 0 ? segments[trackIndex + 1] : null;

  return trackId?.trim() || null;
}

export function isSpotifyTrackUrl(url: string | null | undefined) {
  return detectMusicLinkPlatform(url) === "spotify" && Boolean(extractSpotifyTrackId(url));
}

export function getMusicPlatformLabel(platform: RoomShareSourcePlatform) {
  if (platform === "appleMusic") {
    return "Apple Music";
  }

  if (platform === "soundcloud") {
    return "SoundCloud";
  }

  if (platform === "youtube") {
    return "YouTube";
  }

  return "Spotify";
}

export function buildMusicLinkFallbackLabel(
  url: string | null | undefined,
  platform = detectMusicLinkPlatform(url),
) {
  if (platform === "spotify") {
    return "Spotify track";
  }

  if (platform === "appleMusic") {
    return "Apple Music track";
  }

  if (platform === "soundcloud") {
    return "SoundCloud track";
  }

  if (platform === "youtube") {
    return "YouTube video";
  }

  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return "shared link";
  }

  return parsedUrl.hostname.replace(/^www\./i, "");
}

export function buildDirectPlatformLinks(
  url: string | null | undefined,
): RoomSharePlatformLinks {
  const normalizedUrl = url?.trim() || null;
  const platform = detectMusicLinkPlatform(normalizedUrl);

  if (!normalizedUrl || !platform) {
    return {
      appleMusic: null,
      soundcloud: null,
      spotify: null,
      youtube: null,
    };
  }

  return {
    appleMusic: platform === "appleMusic" ? normalizedUrl : null,
    soundcloud: platform === "soundcloud" ? normalizedUrl : null,
    spotify: platform === "spotify" ? normalizedUrl : null,
    youtube: platform === "youtube" ? normalizedUrl : null,
  };
}
