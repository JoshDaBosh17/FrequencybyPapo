import type {
  FrequencyRoom,
  PersonalSongItem,
  RoomShareItem,
  RoomShareReactions,
  UserProfile,
} from "@/lib/types";
import { buildDirectPlatformLinks, detectMusicLinkPlatform } from "@/lib/frequency/music-link";
import { getRoomShareDisplayText } from "@/lib/frequency/room-share";

export type SongActivityItem = {
  id: string;
  roomId: string;
  roomName: string | null;
  channel: string | null;
  title: string;
  artist: string;
  comment: string | null;
  primaryGenre: string | null;
  links: RoomShareItem["links"];
  artworkUrl: string | null;
  sourcePlatform: RoomShareItem["sourcePlatform"];
  createdAt: unknown;
  ageLabel: string;
  addedDateLabel: string | null;
  contextLabel: string | null;
  visualAccentKey: string;
  reactions: RoomShareReactions;
  uploadedBy: {
    uid: string;
    displayName: string;
    avatarUrl: string | null;
    isCurrentUser: boolean;
  };
  rawItem: RoomShareItem;
};

export type SongFrequencyLaneEntry = {
  id: string;
  genre: string;
  title: string;
  artist: string;
  uploader: string;
  createdAt: unknown;
};

function normalizeTimestampMs(value: unknown) {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = (value as { seconds?: number }).seconds ?? 0;
    return seconds * 1000;
  }

  return 0;
}

function formatRelativeAge(value: unknown) {
  const timestampMs = normalizeTimestampMs(value);

  if (!timestampMs) {
    return "Just now";
  }

  const diffMs = Math.max(0, Date.now() - timestampMs);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestampMs));
}

function formatAddedDate(value: unknown) {
  const timestampMs = normalizeTimestampMs(value);

  if (!timestampMs) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestampMs));
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

function hasPlayableLinks(item: RoomShareItem) {
  return Boolean(
    item.links?.spotify ||
      item.links?.appleMusic ||
      item.links?.soundcloud ||
      detectMusicLinkPlatform(item.url),
  );
}

function buildContextLabel(roomName: string | null, channel: string | null) {
  if (roomName && channel) {
    return `${roomName} / #${channel}`;
  }

  if (roomName) {
    return roomName;
  }

  if (channel) {
    return `#${channel}`;
  }

  return null;
}

function buildVisualAccentKey(params: {
  artist: string;
  roomName?: string | null;
  title: string;
  uploaderName: string;
  primaryGenre?: string | null;
}) {
  const genre = normalizeText(params.primaryGenre);

  if (genre) {
    return genre;
  }

  const artist = normalizeText(params.artist);

  if (artist) {
    return `artist:${artist}`;
  }

  const roomName = normalizeText(params.roomName);

  if (roomName) {
    return `room:${roomName}`;
  }

  const title = normalizeText(params.title);

  if (title) {
    return `title:${title}`;
  }

  return `uploader:${normalizeText(params.uploaderName) ?? "frequency"}`;
}

export function buildSongActivityItems(params: {
  items: RoomShareItem[];
  rooms?: FrequencyRoom[];
  uploaderProfiles?: UserProfile[];
  currentUserId?: string | null;
  uploaderIds?: string[];
}) {
  const roomsById = new Map(
    (params.rooms ?? []).map((room) => [room.id, room] as const),
  );
  const profilesById = new Map(
    (params.uploaderProfiles ?? []).map((profile) => [profile.uid, profile] as const),
  );
  const allowedUploaderIds =
    params.uploaderIds && params.uploaderIds.length
      ? new Set(params.uploaderIds.map((uid) => uid.trim()).filter(Boolean))
      : null;

  return params.items
    .filter((item) => !allowedUploaderIds || allowedUploaderIds.has(item.addedBy))
    .flatMap((item) => {
      const display = getRoomShareDisplayText(item);
      const title = normalizeText(item.resolvedTrack) ?? normalizeText(display.title);
      const artist = normalizeText(item.resolvedArtist) ?? normalizeText(display.subtitle);
      const directLinks = buildDirectPlatformLinks(item.url);
      const links =
        item.links?.spotify ||
        item.links?.appleMusic ||
        item.links?.soundcloud ||
        item.links?.youtube
          ? item.links
          : directLinks;

      if (!title || !artist) {
        return [];
      }

      const uploaderProfile = profilesById.get(item.addedBy);
      const room = roomsById.get(item.roomId);
      const uploadedByName =
        item.addedBy === params.currentUserId
          ? "You"
          : normalizeText(uploaderProfile?.displayName) ??
            normalizeText(item.addedByName) ??
            "Someone";

      return [
        {
          ageLabel: formatRelativeAge(item.createdAt),
          addedDateLabel: formatAddedDate(item.createdAt),
          artist,
          channel: normalizeText(item.channel),
          comment: normalizeText(item.note),
          contextLabel: buildContextLabel(room?.name ?? null, normalizeText(item.channel)),
          createdAt: item.createdAt,
          id: item.id,
          links,
          artworkUrl: normalizeText(item.artworkUrl) ?? null,
          primaryGenre: normalizeText(item.primaryGenre),
          rawItem: item,
          reactions: item.reactions ?? {},
          roomId: item.roomId,
          roomName: room?.name ?? null,
          sourcePlatform: item.sourcePlatform ?? null,
          title,
          visualAccentKey: buildVisualAccentKey({
            artist,
            primaryGenre: item.primaryGenre,
            roomName: room?.name ?? null,
            title,
            uploaderName: uploadedByName,
          }),
          uploadedBy: {
            avatarUrl: normalizeText(uploaderProfile?.photoURL) ?? null,
            displayName: uploadedByName,
            isCurrentUser: item.addedBy === params.currentUserId,
            uid: item.addedBy,
          },
        } satisfies SongActivityItem,
      ];
    })
    .sort((left, right) => normalizeTimestampMs(right.createdAt) - normalizeTimestampMs(left.createdAt));
}

export function buildSongFrequencyLaneEntries(items: SongActivityItem[]) {
  return [...items]
    .filter((item) => Boolean(item.primaryGenre))
    .sort((left, right) => normalizeTimestampMs(left.createdAt) - normalizeTimestampMs(right.createdAt))
    .map(
      (item) =>
        ({
          artist: item.artist,
          createdAt: item.createdAt,
          genre: item.primaryGenre ?? "frequency",
          id: item.id,
          title: item.title,
          uploader: item.uploadedBy.displayName,
        }) satisfies SongFrequencyLaneEntry,
    );
}

export function buildSongFrequencySummary(items: SongActivityItem[]) {
  if (!items.length) {
    return "Your social frequency starts with the next song someone drops.";
  }

  const recentItems = items.slice(0, 8);
  const uniqueVoices = new Set(recentItems.map((item) => item.uploadedBy.uid)).size;
  const topGenres = Array.from(
    recentItems.reduce<Map<string, number>>((map, item) => {
      const genre = item.primaryGenre?.trim();
      if (!genre) {
        return map;
      }

      map.set(genre, (map.get(genre) ?? 0) + 1);
      return map;
    }, new Map()),
  )
    .sort((left, right) => right[1] - left[1])
    .map(([genre]) => genre)
    .slice(0, 2);

  if (!topGenres.length) {
    return `Recent drops are coming from ${uniqueVoices} voice${uniqueVoices === 1 ? "" : "s"} right now.`;
  }

  if (topGenres.length === 1) {
    return `Recent drops lean ${topGenres[0]} across ${uniqueVoices} voice${uniqueVoices === 1 ? "" : "s"}.`;
  }

  return `Recent drops lean ${topGenres[0]} and ${topGenres[1]} across ${uniqueVoices} voices.`;
}

export function filterPlayableSongActivityItems(items: SongActivityItem[]) {
  return items.filter((item) => hasPlayableLinks(item.rawItem));
}

export function buildPersonalSongActivityItems(params: {
  items: PersonalSongItem[];
  currentUserId?: string | null;
  profile?: UserProfile | null;
}) {
  return params.items
    .flatMap((item) => {
      const display = getRoomShareDisplayText(item);
      const title = normalizeText(item.resolvedTrack) ?? normalizeText(display.title);
      const artist = normalizeText(item.resolvedArtist) ?? normalizeText(display.subtitle);
      const directLinks = buildDirectPlatformLinks(item.url);
      const links =
        item.links?.spotify ||
        item.links?.appleMusic ||
        item.links?.soundcloud ||
        item.links?.youtube
          ? item.links
          : directLinks;

      if (!title || !artist) {
        return [];
      }

      return [
        {
          ageLabel: formatRelativeAge(item.createdAt),
          addedDateLabel: formatAddedDate(item.createdAt),
          artist,
          artworkUrl: normalizeText(item.artworkUrl) ?? null,
          channel: null,
          comment: normalizeText(item.note),
          contextLabel: "Your collection",
          createdAt: item.createdAt,
          id: item.id,
          links,
          primaryGenre: normalizeText(item.primaryGenre),
          rawItem: {
            addedBy: params.currentUserId ?? params.profile?.uid ?? item.userId,
            addedByName: params.profile?.displayName ?? "You",
            artworkUrl: item.artworkUrl ?? null,
            channel: "",
            createdAt: item.createdAt,
            enrichmentError: item.enrichmentError ?? null,
            enrichmentSource: item.enrichmentSource ?? null,
            enrichmentStatus: item.enrichmentStatus ?? "idle",
            enrichedAt: item.enrichedAt ?? null,
            id: item.id,
            kind: item.kind,
            links,
            note: item.note ?? null,
            primaryGenre: item.primaryGenre ?? null,
            reactions: {},
            resolvedArtist: item.resolvedArtist ?? null,
            resolvedTrack: item.resolvedTrack ?? null,
            roomId: "",
            sourcePlatform: item.sourcePlatform ?? null,
            subtitle: item.subtitle ?? null,
            title: item.title,
            url: item.url ?? null,
          } satisfies RoomShareItem,
          reactions: {},
          roomId: "__personal__",
          roomName: null,
          sourcePlatform: item.sourcePlatform ?? null,
          title,
          visualAccentKey: buildVisualAccentKey({
            artist,
            primaryGenre: item.primaryGenre,
            roomName: "Your collection",
            title,
            uploaderName: "You",
          }),
          uploadedBy: {
            avatarUrl: normalizeText(params.profile?.photoURL) ?? null,
            displayName: "You",
            isCurrentUser: true,
            uid: params.currentUserId ?? params.profile?.uid ?? item.userId,
          },
        } satisfies SongActivityItem,
      ];
    })
    .sort((left, right) => normalizeTimestampMs(right.createdAt) - normalizeTimestampMs(left.createdAt));
}
