import type { RoomSharePlatformLinks } from "@/lib/types"

import { adminDb } from "./firebase-admin";
import { setAdminDocument } from "./firestore-write";
import { getArtistTopTags, getTrackTopTags } from "./lastfm";
import { resolveSongMetadataAndLinks } from "./song-platform-links";

type RoomShareEnrichmentStatus = "ready" | "error";

type RoomShareEnrichmentResult = {
  itemId: string;
  roomId: string;
  title: string;
  artist: string | null;
  track: string | null;
  links: RoomSharePlatformLinks | null;
  primaryGenre: string | null;
  status: RoomShareEnrichmentStatus;
  source: "lastfm_track" | "lastfm_artist" | null;
  error: string | null;
};

type StoredRoomShareItem = {
  id?: string;
  roomId?: string;
  channel?: string;
  kind?: "song" | "artist" | "link";
  title?: string;
  subtitle?: string | null;
  url?: string | null;
  note?: string | null;
  links?: RoomSharePlatformLinks | null;
  addedBy?: string;
  addedByName?: string | null;
};

const GENERIC_ROOM_SHARE_LABELS = new Set([
  "shared song link",
  "shared artist link",
  "shared context link",
  "shared link",
]);

const TITLE_SPLIT_PATTERN = /\s(?:-|–|—|\|)\s/;
const TRACK_TITLE_NOISE_PATTERN =
  /\((official(?:\s+(?:audio|video))?|audio|video|lyrics?|visualizer|topic|hd|4k|remaster(?:ed)?|live)\)/gi;

function logRoomShareEnrichment(event: string, payload: Record<string, unknown>) {
  console.log("[frequency][room-share-enrichment]", {
    event,
    ...payload,
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

function resolvePrimaryGenre(tags: Array<{ tag: string; weight: number }>) {
  return tags
    .map((tag) => tag.tag.trim())
    .filter(Boolean)[0] ?? null;
}

function looksGenericLabel(value: string | null | undefined) {
  const normalized = normalizeText(value)?.toLowerCase() ?? "";
  return !normalized || GENERIC_ROOM_SHARE_LABELS.has(normalized);
}

function sanitizeTrackTitle(value: string) {
  return value
    .replace(TRACK_TITLE_NOISE_PATTERN, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArtistTrackFromLabel(label: string) {
  const cleanedLabel = sanitizeTrackTitle(label);
  const parts = cleanedLabel
    .split(TITLE_SPLIT_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  return {
    artist: parts[0] ?? null,
    track: parts.slice(1).join(" - ") || null,
  };
}

function isYouTubeUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return /(^|\.)youtube\.com$/i.test(url.hostname) || /(^|\.)youtu\.be$/i.test(url.hostname);
  } catch {
    return false;
  }
}

async function fetchYouTubeOEmbed(url: string) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`YouTube oEmbed failed with ${response.status}`);
  }

  return (await response.json()) as {
    title?: string;
    author_name?: string;
  };
}

async function resolveRoomShareMetadata(item: StoredRoomShareItem) {
  const title = normalizeText(item.title) ?? "";
  const subtitle = normalizeText(item.subtitle);
  const url = normalizeText(item.url);
  const kind = item.kind ?? "song";

  if (kind === "artist" && !looksGenericLabel(title)) {
    return {
      resolvedArtist: title,
      resolvedTrack: null,
    };
  }

  if (kind === "song" && subtitle) {
    return {
      resolvedArtist: subtitle,
      resolvedTrack: title,
    };
  }

  if (!looksGenericLabel(title)) {
    const parsedFromTitle = parseArtistTrackFromLabel(title);
    if (parsedFromTitle) {
      return {
        resolvedArtist: parsedFromTitle.artist,
        resolvedTrack: kind === "artist" ? null : parsedFromTitle.track,
      };
    }

    if (kind === "song" && url) {
      return {
        resolvedArtist: title,
        resolvedTrack: null,
      };
    }
  }

  if (url && isYouTubeUrl(url)) {
    try {
      const oEmbed = await fetchYouTubeOEmbed(url);
      logRoomShareEnrichment("youtube_oembed_resolved", {
        url,
        title: oEmbed.title ?? null,
        authorName: oEmbed.author_name ?? null,
      });

      const parsedFromOEmbedTitle = isNonEmptyString(oEmbed.title)
        ? parseArtistTrackFromLabel(oEmbed.title)
        : null;
      const sanitizedOEmbedTrack = normalizeText(sanitizeTrackTitle(oEmbed.title ?? ""));

      return {
        resolvedArtist:
          parsedFromOEmbedTitle?.artist ??
          normalizeText(oEmbed.author_name) ??
          null,
        resolvedTrack:
          kind === "artist"
            ? null
            : parsedFromOEmbedTitle?.track ?? sanitizedOEmbedTrack,
      };
    } catch (error) {
      logRoomShareEnrichment("youtube_oembed_failed", {
        url,
        error: error instanceof Error ? error.message : "Unknown YouTube oEmbed error.",
      });
    }
  }

  return {
    resolvedArtist: kind === "artist" && !looksGenericLabel(title) ? title : null,
    resolvedTrack: null,
  };
}

async function updateRoomShareEnrichmentState(params: {
  roomId: string;
  itemId: string;
  title: string;
  artist: string | null;
  track: string | null;
  links: RoomSharePlatformLinks | null;
  primaryGenre: string | null;
  status: RoomShareEnrichmentStatus;
  source: "lastfm_track" | "lastfm_artist" | null;
  error: string | null;
}) {
  const itemRef = adminDb.collection("rooms").doc(params.roomId).collection("items").doc(params.itemId);

  await setAdminDocument(
    itemRef,
    {
      resolvedArtist: params.artist,
      resolvedTrack: params.track,
      links: params.links,
      primaryGenre: params.primaryGenre,
      enrichmentStatus: params.status,
      enrichmentError: params.error,
      enrichmentSource: params.source,
      enrichedAt: new Date(),
    },
    { merge: true },
    {
      triggerReason: `room_share_enrichment_${params.status}`,
      userId: null,
    },
  );

  logRoomShareEnrichment("room_share_enrichment_stored", {
    roomId: params.roomId,
    itemId: params.itemId,
    title: params.title,
    artist: params.artist,
    track: params.track,
    links: params.links,
    primaryGenre: params.primaryGenre,
    status: params.status,
    source: params.source,
    error: params.error,
  });
}

export async function enrichRoomShareItem({
  roomId,
  itemId,
}: {
  roomId: string;
  itemId: string;
}): Promise<RoomShareEnrichmentResult> {
  const itemRef = adminDb.collection("rooms").doc(roomId).collection("items").doc(itemId);
  const itemSnapshot = await itemRef.get();

  if (!itemSnapshot.exists) {
    throw new Error("Room share item not found.");
  }

  const item = itemSnapshot.data() as StoredRoomShareItem;
  const normalizedTitle = normalizeText(item.title) ?? "Shared drop";

  logRoomShareEnrichment("room_share_enrichment_started", {
    roomId,
    itemId,
    kind: item.kind ?? null,
    title: normalizedTitle,
    subtitle: normalizeText(item.subtitle),
    url: normalizeText(item.url),
  });

  try {
    const resolvedMetadata = await resolveRoomShareMetadata(item);
    let resolvedArtist = resolvedMetadata.resolvedArtist;
    let resolvedTrack = resolvedMetadata.resolvedTrack;
    let links: RoomSharePlatformLinks | null = null;

    logRoomShareEnrichment("room_share_metadata_parsed", {
      roomId,
      itemId,
      parsedArtist: resolvedArtist,
      parsedTrack: resolvedTrack,
    });

    if (item.kind === "song" && resolvedArtist && resolvedTrack) {
      logRoomShareEnrichment("room_share_song_support_started", {
        roomId,
        itemId,
        artist: resolvedArtist,
        track: resolvedTrack,
        url: normalizeText(item.url),
      });

      const songSupport = await resolveSongMetadataAndLinks({
        artist: resolvedArtist,
        title: resolvedTrack,
        url: normalizeText(item.url),
      }).catch((error) => {
        logRoomShareEnrichment("room_share_song_support_failed", {
          roomId,
          itemId,
          artist: resolvedArtist,
          track: resolvedTrack,
          error: error instanceof Error ? error.message : "Song support resolution failed.",
        });
        return null;
      });

      if (songSupport) {
        resolvedArtist = songSupport.artist;
        resolvedTrack = songSupport.title;
        links = songSupport.links;

        logRoomShareEnrichment("room_share_song_support_completed", {
          roomId,
          itemId,
          artist: resolvedArtist,
          track: resolvedTrack,
          metadataSource: songSupport.metadataSource,
          links,
        });
      }
    }

    if (!resolvedArtist) {
      const result = {
        artist: null,
        error: "missing_metadata",
        itemId,
        links,
        primaryGenre: null,
        roomId,
        source: null,
        status: "error",
        title: normalizedTitle,
        track: resolvedTrack,
      } satisfies RoomShareEnrichmentResult;

      await updateRoomShareEnrichmentState(result);
      logRoomShareEnrichment("room_share_enrichment_skipped", {
        roomId,
        itemId,
        reason: "missing_metadata",
        links,
      });
      return result;
    }

    let source: "lastfm_track" | "lastfm_artist" | null = null;
    let primaryGenre: string | null = null;

    if (resolvedTrack) {
      logRoomShareEnrichment("lastfm_track_lookup_started", {
        roomId,
        itemId,
        artist: resolvedArtist,
        track: resolvedTrack,
      });
      const trackTags = await getTrackTopTags(
        resolvedArtist,
        resolvedTrack,
      ).catch((error) => {
        logRoomShareEnrichment("lastfm_track_lookup_failed", {
          roomId,
          itemId,
          artist: resolvedArtist,
          track: resolvedTrack,
          error: error instanceof Error ? error.message : "Unknown Last.fm track error.",
        });
        return [];
      });

      logRoomShareEnrichment("lastfm_track_lookup_completed", {
        roomId,
        itemId,
        artist: resolvedArtist,
        track: resolvedTrack,
        payload: trackTags,
      });

      primaryGenre = resolvePrimaryGenre(trackTags);
      if (primaryGenre) {
        source = "lastfm_track";
      }
    }

    if (!primaryGenre) {
      logRoomShareEnrichment("lastfm_artist_lookup_started", {
        roomId,
        itemId,
        artist: resolvedArtist,
      });

      const artistTags = await getArtistTopTags(resolvedArtist).catch((error) => {
        logRoomShareEnrichment("lastfm_artist_lookup_failed", {
          roomId,
          itemId,
          artist: resolvedArtist,
          error: error instanceof Error ? error.message : "Unknown Last.fm artist error.",
        });
        return [];
      });

      logRoomShareEnrichment("lastfm_artist_lookup_completed", {
        roomId,
        itemId,
        artist: resolvedArtist,
        payload: artistTags,
      });

      primaryGenre = resolvePrimaryGenre(artistTags);
      if (primaryGenre) {
        source = "lastfm_artist";
      }
    }

    if (!primaryGenre) {
      const result = {
        artist: resolvedArtist,
        error: "empty_lastfm_response",
        itemId,
        links,
        primaryGenre: null,
        roomId,
        source,
        status: "error",
        title: normalizedTitle,
        track: resolvedTrack,
      } satisfies RoomShareEnrichmentResult;

      await updateRoomShareEnrichmentState(result);
      logRoomShareEnrichment("room_share_enrichment_empty", {
        roomId,
        itemId,
        reason: "empty_lastfm_response",
        artist: resolvedArtist,
        track: resolvedTrack,
        links,
      });
      return result;
    }

    const result = {
      artist: resolvedArtist,
      error: null,
      itemId,
      links,
      primaryGenre,
      roomId,
      source,
      status: "ready",
      title: normalizedTitle,
      track: resolvedTrack,
    } satisfies RoomShareEnrichmentResult;

    await updateRoomShareEnrichmentState(result);
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Room share enrichment failed.";

    await updateRoomShareEnrichmentState({
      artist: null,
      error: message,
      itemId,
      links: null,
      primaryGenre: null,
      roomId,
      source: null,
      status: "error",
      title: normalizedTitle,
      track: null,
    });

    logRoomShareEnrichment("room_share_enrichment_failed", {
      roomId,
      itemId,
      error: message,
    });
    throw error;
  }
}
