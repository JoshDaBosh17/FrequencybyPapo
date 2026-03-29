import { getChannelVibe, getRoomIdentityGenres } from "@/lib/frequency/room-identity";
import { sortRoomShareItemsByRecency } from "@/lib/frequency/room-share";
import { getFavoriteArtistEntriesInRecencyOrder } from "@/lib/frequency/taste-profile";
import type {
  ArtistGenreProfileItem,
  FavoriteArtistEntry,
  FrequencyRoom,
  RoomShareItem,
} from "@/lib/types";

export type HelixTimelineEntry = {
  id: string;
  genre: string;
  addedAt: string;
  metadataLines?: string[];
  side?: "left" | "right";
};

const NON_GENRE_CHANNELS = new Set(["overview", "people", "songs", "insights"]);

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTimestampMs(value: unknown, fallbackMs: number) {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? fallbackMs : parsed;
  }

  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = (value as { seconds?: number }).seconds ?? 0;
    return seconds ? seconds * 1000 : fallbackMs;
  }

  return fallbackMs;
}

function buildIsoTimestamp(value: unknown, fallbackMs: number) {
  return new Date(normalizeTimestampMs(value, fallbackMs)).toISOString();
}

function dedupeGenresInOrder(genres: string[], maxGenres: number) {
  const seen = new Set<string>();

  return genres
    .map((genre) => genre.trim())
    .filter(Boolean)
    .filter((genre) => {
      const key = normalizeKey(genre);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, maxGenres);
}

function resolveRoomTimelineGenre(room: FrequencyRoom, channel: string) {
  const channelVibe = getChannelVibe(room, channel);

  if (channelVibe) {
    return channelVibe;
  }

  const normalizedChannel = normalizeKey(channel);
  if (normalizedChannel && !NON_GENRE_CHANNELS.has(normalizedChannel)) {
    return channel.trim();
  }

  return room.starterVibe?.trim() || getRoomIdentityGenres(room)[0] || null;
}

function buildFallbackTimelineEntries(genres: string[], label: string) {
  return genres.map(
    (genre, index) =>
      ({
        addedAt: new Date(Date.now() - index * 1000).toISOString(),
        genre,
        id: `fallback-${normalizeKey(genre)}-${index}`,
        metadataLines: [label],
        side: index % 2 === 0 ? "left" : "right",
      }) satisfies HelixTimelineEntry,
  );
}

export function buildUserHelixTimelineEntries({
  favoriteArtists,
  favoriteArtistEntries = [],
  artistGenreProfiles = [],
}: {
  favoriteArtists: string[];
  favoriteArtistEntries?: FavoriteArtistEntry[];
  artistGenreProfiles?: ArtistGenreProfileItem[];
}) {
  const orderedArtists = getFavoriteArtistEntriesInRecencyOrder(
    favoriteArtists,
    favoriteArtistEntries,
  );
  const profilesByArtist = artistGenreProfiles.reduce<Map<string, ArtistGenreProfileItem>>(
    (map, profile) => {
      map.set(normalizeKey(profile.artist), profile);
      return map;
    },
    new Map(),
  );

  return orderedArtists.flatMap((artistEntry, index) => {
    const artistProfile = profilesByArtist.get(normalizeKey(artistEntry.artist));
    const primaryGenre = artistProfile?.primaryTag ?? artistProfile?.tags[0] ?? null;

    if (!primaryGenre) {
      return [];
    }

    return [
      {
        addedAt: artistEntry.addedAt,
        genre: primaryGenre,
        id: `user-${normalizeKey(artistEntry.artist)}-${artistEntry.addedAt}-${index}`,
        metadataLines: [artistEntry.artist],
        side: index % 2 === 0 ? "left" : "right",
      } satisfies HelixTimelineEntry,
    ];
  });
}

export function buildRoomHelixTimelineEntries({
  room,
  shareItems,
  activeChannel,
}: {
  room: FrequencyRoom;
  shareItems: RoomShareItem[];
  activeChannel?: string | null;
}): HelixTimelineEntry[] {
  const normalizedActiveChannel = activeChannel ? normalizeKey(activeChannel) : null;
  const sourceItems = normalizedActiveChannel
    ? shareItems.filter((item) => normalizeKey(item.channel) === normalizedActiveChannel)
    : shareItems;
  const orderedItems = sortRoomShareItemsByRecency(sourceItems);
  const entries = orderedItems.flatMap((item, index) => {
    const genre = item.primaryGenre?.trim() || resolveRoomTimelineGenre(room, item.channel);

    if (!genre) {
      return [];
    }

    const fallbackMs = Date.now() - index * 1000;
    const subtitle = item.subtitle?.trim();
    const addedByName = item.addedByName?.trim();
    const metadataLines = [item.title.trim(), subtitle || addedByName || null].filter(
      (value): value is string => Boolean(value),
    );

    return [
      {
        addedAt: buildIsoTimestamp(item.createdAt, fallbackMs),
        genre,
        id: `room-${item.id}-${index}`,
        metadataLines,
        side: index % 2 === 0 ? "left" : "right",
      } satisfies HelixTimelineEntry,
    ];
  });

  if (entries.length) {
    return entries;
  }

  const fallbackGenres = dedupeGenresInOrder(
    [
      activeChannel ? resolveRoomTimelineGenre(room, activeChannel) ?? "" : "",
      ...getRoomIdentityGenres(room),
    ],
    6,
  );

  return buildFallbackTimelineEntries(
    fallbackGenres,
    activeChannel ? "The first drop here will extend this lane." : "The first room drop will extend the helix.",
  );
}

export function buildHelixPreviewGenres(
  entries: HelixTimelineEntry[],
  fallbackGenres: string[] = [],
  maxGenres = 5,
) {
  return dedupeGenresInOrder(
    [...entries.map((entry) => entry.genre), ...fallbackGenres],
    maxGenres,
  );
}
