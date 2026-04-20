import {
  buildDirectPlatformLinks,
  buildMusicLinkFallbackLabel,
  detectMusicLinkPlatform,
  getMusicPlatformLabel,
  looksLikeHttpUrl,
} from "@/lib/frequency/music-link";
import type {
  PersonalSongItem,
  RoomShareItem,
  RoomShareKind,
} from "@/lib/types";

export const ROOM_SHARE_KIND_OPTIONS = [
  { id: "song", label: "Song" },
  { id: "artist", label: "Artist" },
  { id: "link", label: "Link" },
] satisfies Array<{ id: RoomShareKind; label: string }>;

export type RoomShareSubmitDraft = {
  kind: RoomShareKind;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  note?: string | null;
  sourcePlatform?: RoomShareItem["sourcePlatform"];
  links?: RoomShareItem["links"];
  artworkUrl?: string | null;
  resolvedArtist?: string | null;
  resolvedTrack?: string | null;
};

function normalizeText(value: string, maxLength: number) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

export function normalizeRoomShareInput(value: string) {
  return normalizeText(value, 180);
}

export function normalizeRoomShareNote(value: string) {
  return normalizeText(value, 220);
}

export function normalizeChannelVibe(value: string) {
  return normalizeText(value, 40);
}

export function isProbablyUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function getRoomShareKindLabel(kind: RoomShareKind) {
  if (kind === "artist") {
    return "Artist";
  }

  if (kind === "link") {
    return "Link";
  }

  return "Song";
}

export function getRoomShareKindVerb(kind: RoomShareKind) {
  if (kind === "artist") {
    return "artist";
  }

  if (kind === "link") {
    return "link";
  }

  return "song";
}

export function buildRoomShareUrlLabel(url: string) {
  return buildMusicLinkFallbackLabel(url);
}

export function buildSongRoomShareDraft(params: {
  title: string;
  artist: string;
  note?: string | null;
}): RoomShareSubmitDraft {
  const title = normalizeRoomShareInput(params.title);
  const artist = normalizeRoomShareInput(params.artist);
  const note =
    typeof params.note === "string" ? normalizeRoomShareNote(params.note) : "";

  if (!title) {
    throw new Error("Add a song title.");
  }

  if (!artist) {
    throw new Error("Add the artist.");
  }

  return {
    kind: "song" as const,
    note: note || null,
    subtitle: artist,
    title,
    url: null,
  };
}

export function buildArtistRoomShareDraft(params: {
  artist: string;
}): RoomShareSubmitDraft {
  const artist = normalizeRoomShareInput(params.artist);

  if (!artist) {
    throw new Error("Add an artist name.");
  }

  return {
    kind: "artist" as const,
    note: null,
    subtitle: null,
    title: artist,
    url: null,
  };
}

export function buildLinkRoomShareDraft(params: {
  url: string;
  note?: string | null;
}): RoomShareSubmitDraft {
  const url = params.url.trim().slice(0, 320);
  const note =
    typeof params.note === "string" ? normalizeRoomShareNote(params.note) : "";
  const sourcePlatform = detectMusicLinkPlatform(url);

  if (!url) {
    throw new Error("Paste a link first.");
  }

  if (!isProbablyUrl(url)) {
    throw new Error("Paste a full link.");
  }

  return {
    kind: "link" as const,
    links: buildDirectPlatformLinks(url),
    note: note || null,
    resolvedArtist: null,
    resolvedTrack: null,
    sourcePlatform,
    subtitle: sourcePlatform ? getMusicPlatformLabel(sourcePlatform) : "Shared context link",
    title: buildRoomShareUrlLabel(url),
    url,
  };
}

export function buildResolvedLinkRoomShareDraft(params: {
  url: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
  note?: string | null;
  sourcePlatform?: RoomShareItem["sourcePlatform"];
}): RoomShareSubmitDraft {
  const url = params.url.trim().slice(0, 320);
  const title = normalizeRoomShareInput(params.title);
  const artist = normalizeRoomShareInput(params.artist);
  const note =
    typeof params.note === "string" ? normalizeRoomShareNote(params.note) : "";
  const sourcePlatform = params.sourcePlatform ?? detectMusicLinkPlatform(url);

  if (!url) {
    throw new Error("Paste a link first.");
  }

  if (!title) {
    throw new Error("Add a song title.");
  }

  if (!artist) {
    throw new Error("Add the artist.");
  }

  return {
    artworkUrl: params.artworkUrl?.trim() || null,
    kind: "song",
    links: buildDirectPlatformLinks(url),
    note: note || null,
    resolvedArtist: artist,
    resolvedTrack: title,
    sourcePlatform,
    subtitle: artist,
    title,
    url,
  };
}

function normalizeDisplayText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

function isGenericLinkTitle(
  value: string | null | undefined,
  url: string | null | undefined,
) {
  const normalizedValue = normalizeDisplayText(value);

  if (!normalizedValue) {
    return true;
  }

  if (looksLikeHttpUrl(normalizedValue)) {
    return true;
  }

  const lowerValue = normalizedValue.toLowerCase();

  if (
    lowerValue === "shared link" ||
    lowerValue === "shared drop" ||
    lowerValue === "shared context link"
  ) {
    return true;
  }

  try {
    const parsedUrl = new URL((url ?? "").trim());
    return lowerValue === parsedUrl.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return false;
  }
}

type RoomShareDisplaySource = Pick<
  RoomShareItem | PersonalSongItem,
  | "kind"
  | "resolvedArtist"
  | "resolvedTrack"
  | "sourcePlatform"
  | "subtitle"
  | "title"
  | "url"
>;

export function getRoomShareDisplayText(item: RoomShareDisplaySource) {
  const sourcePlatform = item.sourcePlatform ?? detectMusicLinkPlatform(item.url);
  const resolvedTrack = normalizeDisplayText(item.resolvedTrack);
  const resolvedArtist = normalizeDisplayText(item.resolvedArtist);
  const title = normalizeDisplayText(item.title);
  const subtitle = normalizeDisplayText(item.subtitle);
  const fallbackTitle =
    item.url && sourcePlatform
      ? buildMusicLinkFallbackLabel(item.url, sourcePlatform)
      : item.url
        ? buildRoomShareUrlLabel(item.url)
        : item.kind === "artist"
          ? "Artist"
          : "Shared drop";
  const safeTitle =
    title && !isGenericLinkTitle(title, item.url) ? title : null;
  const safeSubtitle =
    subtitle &&
    !looksLikeHttpUrl(subtitle) &&
    subtitle.toLowerCase() !== "shared context link"
      ? subtitle
      : null;
  const canonicalTitle = resolvedTrack ?? safeTitle ?? fallbackTitle;
  const canonicalSubtitle =
    resolvedArtist ??
    safeSubtitle ??
    (sourcePlatform && canonicalTitle === fallbackTitle
      ? getMusicPlatformLabel(sourcePlatform)
      : null);

  return {
    displaySubtitle:
      item.url && resolvedTrack && resolvedArtist ? null : canonicalSubtitle,
    displayTitle:
      item.url && resolvedTrack && resolvedArtist
        ? `${resolvedTrack} — ${resolvedArtist}`
        : canonicalTitle,
    title: canonicalTitle,
    subtitle: canonicalSubtitle,
  };
}

function timestampSortValue(value: unknown) {
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

export function sortRoomShareItemsByRecency<T extends Pick<RoomShareItem, "createdAt">>(items: T[]) {
  return [...items].sort(
    (left, right) => timestampSortValue(right.createdAt) - timestampSortValue(left.createdAt),
  );
}
