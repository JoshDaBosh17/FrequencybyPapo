import type { FrequencyRoom } from "@/lib/types";

const ROOM_IDENTITY_EXCLUDED_CHANNELS = new Set([
  "overview",
  "people",
  "songs",
  "insights",
]);

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeRoomVisibility(value: string | null | undefined): "personal" | "public" {
  return value === "public" ? "public" : "personal";
}

export function getRoomVisibilityLabel(visibility: "personal" | "public") {
  return visibility === "public" ? "Public room" : "Personal room";
}

export function getRoomVisibilityDescription(visibility: "personal" | "public") {
  return visibility === "public"
    ? "Open for discovery and shared music momentum."
    : "A tighter room for your own circle and taste lane.";
}

export function getChannelVibe(
  room: Pick<FrequencyRoom, "channelVibes">,
  channel: string,
) {
  const value = room.channelVibes?.[channel];

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue || null;
}

export function getRoomIdentityGenres(
  room: Pick<FrequencyRoom, "starterVibe" | "genreChannels" | "channelVibes">,
) {
  const seen = new Set<string>();
  const genres = [
    room.starterVibe ?? "",
    ...(room.genreChannels ?? []).flatMap((channel) => [getChannelVibe(room, channel) ?? "", channel]),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => !ROOM_IDENTITY_EXCLUDED_CHANNELS.has(normalizeValue(value)))
    .filter((value) => {
      const key = normalizeValue(value);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

  return genres.slice(0, 5);
}

export function buildRoomMusicSignal(
  room: Pick<FrequencyRoom, "songCount" | "genreChannels" | "starterVibe" | "channelVibes">,
) {
  const genreCount = getRoomIdentityGenres(room).length;

  if (room.songCount > 0) {
    return `${room.songCount} drop${room.songCount === 1 ? "" : "s"} shaping the room`;
  }

  if (room.starterVibe?.trim()) {
    return `${room.starterVibe.trim()} is setting the first tone`;
  }

  if (genreCount > 0) {
    return `${genreCount} music lane${genreCount === 1 ? "" : "s"} ready for drops`;
  }

  return "Waiting for the first song, artist, or link";
}
