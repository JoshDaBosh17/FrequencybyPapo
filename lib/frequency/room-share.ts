import type { RoomShareItem, RoomShareKind } from "@/lib/types";

export const ROOM_SHARE_KIND_OPTIONS = [
  { id: "song", label: "Song" },
  { id: "artist", label: "Artist" },
  { id: "link", label: "Link" },
] satisfies Array<{ id: RoomShareKind; label: string }>;

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
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./i, "");
  } catch {
    return "shared link";
  }
}

export function buildSongRoomShareDraft(params: {
  title: string;
  artist: string;
  note?: string | null;
}) {
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
}) {
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
}) {
  const url = params.url.trim().slice(0, 320);

  if (!url) {
    throw new Error("Paste a link first.");
  }

  if (!isProbablyUrl(url)) {
    throw new Error("Paste a full link.");
  }

  return {
    kind: "link" as const,
    note: null,
    subtitle: "Shared context link",
    title: buildRoomShareUrlLabel(url),
    url,
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
