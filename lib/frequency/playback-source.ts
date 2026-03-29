import type { HomeSuggestion } from "@/lib/types";

export type ResolvedPlaybackSource = Pick<
  HomeSuggestion,
  "artist" | "title" | "videoId" | "thumbnail" | "channelRole"
>;

export function hasResolvedPlaybackSource(
  suggestion: HomeSuggestion | null | undefined,
): suggestion is HomeSuggestion {
  return Boolean(
    suggestion &&
      typeof suggestion.artist === "string" &&
      suggestion.artist.length > 0 &&
      typeof suggestion.title === "string" &&
      suggestion.title.length > 0 &&
      typeof suggestion.videoId === "string" &&
      suggestion.videoId.length > 0,
  );
}

export function getResolvedPlaybackSource(
  suggestion: HomeSuggestion | null | undefined,
): ResolvedPlaybackSource | null {
  if (!hasResolvedPlaybackSource(suggestion)) {
    return null;
  }

  return {
    artist: suggestion.artist,
    title: suggestion.title,
    videoId: suggestion.videoId,
    thumbnail: suggestion.thumbnail,
    channelRole: suggestion.channelRole,
  };
}

type PlaybackLogEvent =
  | "play_reused_cached_source"
  | "play_missing_source_resolution_required"
  | "play_blocked_generation_on_cached_result"
  | "play_unexpected_generation_attempt";

export function logPlaybackEvent(
  event: PlaybackLogEvent,
  payload?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][playback]", {
    event,
    ...payload,
  });
}
