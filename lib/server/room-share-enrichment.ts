import type {
  RoomShareKind,
  RoomSharePlatformLinks,
  RoomShareSourcePlatform,
} from "@/lib/types"

import { adminDb } from "./firebase-admin";
import { setAdminDocument } from "./firestore-write";
import { getArtistTopTags, getTrackTopTags } from "./lastfm";
import {
  detectMusicSourcePlatform,
  extractDirectPlatformLinks,
  extractMusicLinkMetadata,
  resolveSongMetadataAndLinks,
} from "./song-platform-links";

type RoomShareEnrichmentStatus = "ready" | "error";

type RoomShareEnrichmentResult = {
  itemId: string;
  roomId: string;
  kind: RoomShareKind;
  title: string;
  subtitle: string | null;
  artist: string | null;
  track: string | null;
  sourcePlatform: RoomShareSourcePlatform | null;
  links: RoomSharePlatformLinks | null;
  artworkUrl: string | null;
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
  sourcePlatform?: RoomShareSourcePlatform | null;
  links?: RoomSharePlatformLinks | null;
  artworkUrl?: string | null;
  resolvedArtist?: string | null;
  resolvedTrack?: string | null;
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

function emptyPlatformLinks(): RoomSharePlatformLinks {
  return {
    appleMusic: null,
    soundcloud: null,
    spotify: null,
    youtube: null,
  };
}

function mergePlatformLinks(...linkSets: Array<RoomSharePlatformLinks | null | undefined>) {
  return linkSets.reduce<RoomSharePlatformLinks>((merged, linkSet) => {
    if (!linkSet) {
      return merged;
    }

    return {
      appleMusic: linkSet.appleMusic ?? merged.appleMusic ?? null,
      soundcloud: linkSet.soundcloud ?? merged.soundcloud ?? null,
      spotify: linkSet.spotify ?? merged.spotify ?? null,
      youtube: linkSet.youtube ?? merged.youtube ?? null,
    };
  }, emptyPlatformLinks());
}

function addSourceLink(params: {
  links: RoomSharePlatformLinks | null | undefined;
  sourcePlatform: RoomShareSourcePlatform | null;
  sourceUrl: string | null;
}) {
  const mergedLinks = mergePlatformLinks(params.links);

  if (!params.sourcePlatform || !params.sourceUrl) {
    return mergedLinks;
  }

  return {
    ...mergedLinks,
    [params.sourcePlatform]: params.sourceUrl,
  } satisfies RoomSharePlatformLinks;
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
  const storedArtist = normalizeText(item.resolvedArtist);
  const storedTrack = normalizeText(item.resolvedTrack);

  if (kind === "song" && storedArtist && storedTrack) {
    return {
      resolvedArtist: storedArtist,
      resolvedTrack: storedTrack,
    };
  }

  if (kind === "artist" && storedArtist) {
    return {
      resolvedArtist: storedArtist,
      resolvedTrack: null,
    };
  }

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
  kind: RoomShareKind;
  title: string;
  subtitle: string | null;
  artist: string | null;
  track: string | null;
  sourcePlatform: RoomShareSourcePlatform | null;
  links: RoomSharePlatformLinks | null;
  artworkUrl: string | null;
  primaryGenre: string | null;
  status: RoomShareEnrichmentStatus;
  source: "lastfm_track" | "lastfm_artist" | null;
  error: string | null;
}) {
  const itemRef = adminDb.collection("rooms").doc(params.roomId).collection("items").doc(params.itemId);

  await setAdminDocument(
    itemRef,
    {
      kind: params.kind,
      title: params.title,
      subtitle: params.subtitle,
      resolvedArtist: params.artist,
      resolvedTrack: params.track,
      sourcePlatform: params.sourcePlatform,
      links: params.links,
      artworkUrl: params.artworkUrl,
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
    kind: params.kind,
    title: params.title,
    subtitle: params.subtitle,
    artist: params.artist,
    track: params.track,
    sourcePlatform: params.sourcePlatform,
    links: params.links,
    artworkUrl: params.artworkUrl,
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
  const normalizedSubtitle = normalizeText(item.subtitle);
  const normalizedUrl = normalizeText(item.url);
  const detectedSourcePlatform =
    item.sourcePlatform ?? detectMusicSourcePlatform(normalizedUrl);

  logRoomShareEnrichment("room_share_enrichment_started", {
    roomId,
    itemId,
    kind: item.kind ?? null,
    title: normalizedTitle,
    subtitle: normalizedSubtitle,
    sourcePlatform: detectedSourcePlatform,
    url: normalizedUrl,
  });

  try {
    const resolvedMetadata = await resolveRoomShareMetadata(item);
    let storedKind: RoomShareKind = item.kind ?? "song";
    let storedTitle = normalizedTitle;
    let storedSubtitle = normalizedSubtitle;
    let resolvedArtist = resolvedMetadata.resolvedArtist;
    let resolvedTrack = resolvedMetadata.resolvedTrack;
    let sourcePlatform = detectedSourcePlatform;
    let links = addSourceLink({
      links: mergePlatformLinks(item.links, extractDirectPlatformLinks(normalizedUrl)),
      sourcePlatform: detectedSourcePlatform,
      sourceUrl: normalizedUrl,
    });
    let artworkUrl =
      typeof item.artworkUrl === "string" && item.artworkUrl.trim()
        ? item.artworkUrl.trim()
        : null;

    logRoomShareEnrichment("room_share_metadata_parsed", {
      roomId,
      itemId,
      parsedArtist: resolvedArtist,
      parsedTrack: resolvedTrack,
      sourcePlatform,
    });

    if (storedKind === "link" && normalizedUrl) {
      logRoomShareEnrichment("room_share_link_metadata_started", {
        roomId,
        itemId,
        sourcePlatform,
        url: normalizedUrl,
      });

      const linkMetadata = await extractMusicLinkMetadata(normalizedUrl).catch((error) => {
        logRoomShareEnrichment("room_share_link_metadata_failed", {
          roomId,
          itemId,
          url: normalizedUrl,
          error: error instanceof Error ? error.message : "Link metadata extraction failed.",
        });
        return null;
      });

      if (linkMetadata?.sourcePlatform) {
        sourcePlatform = linkMetadata.sourcePlatform;
      }

      links = addSourceLink({
        links,
        sourcePlatform,
        sourceUrl: normalizedUrl,
      });

      if (linkMetadata?.artist || linkMetadata?.title) {
        resolvedArtist = linkMetadata.artist ?? resolvedArtist;
        resolvedTrack = linkMetadata.title ?? resolvedTrack;
      }
      artworkUrl = linkMetadata?.artworkUrl ?? artworkUrl;

      logRoomShareEnrichment("room_share_link_metadata_completed", {
        roomId,
        itemId,
        sourcePlatform,
        resolvedArtist,
        resolvedTrack,
      });

      if (resolvedArtist && resolvedTrack) {
        storedKind = "song";
        storedTitle = resolvedTrack;
        storedSubtitle = resolvedArtist;

        logRoomShareEnrichment("room_share_link_promoted_to_song", {
          roomId,
          itemId,
          sourcePlatform,
          title: storedTitle,
          subtitle: storedSubtitle,
        });
      }
    }

    if (storedKind === "song" && resolvedArtist && resolvedTrack) {
      logRoomShareEnrichment("room_share_song_support_started", {
        roomId,
        itemId,
        artist: resolvedArtist,
        track: resolvedTrack,
        url: normalizedUrl,
        sourcePlatform,
      });

      const songSupport = await resolveSongMetadataAndLinks({
        artist: resolvedArtist,
        existingLinks: links,
        title: resolvedTrack,
        url: normalizedUrl,
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
        storedKind = "song";
        storedTitle = songSupport.title;
        storedSubtitle = songSupport.artist;
        links = addSourceLink({
          links: mergePlatformLinks(links, songSupport.links),
          sourcePlatform,
          sourceUrl: normalizedUrl,
        });

        logRoomShareEnrichment("room_share_song_support_completed", {
          roomId,
          itemId,
          artist: resolvedArtist,
          track: resolvedTrack,
          metadataSource: songSupport.metadataSource,
          artworkUrl: songSupport.artworkUrl ?? artworkUrl,
          links,
        });
        artworkUrl = songSupport.artworkUrl ?? artworkUrl;
      }
    }

    if (!resolvedArtist) {
      const result = {
        artist: null,
        error: "missing_metadata",
        itemId,
        links,
        artworkUrl,
        kind: storedKind,
        primaryGenre: null,
        roomId,
        source: null,
        sourcePlatform,
        status: "error",
        subtitle: storedSubtitle,
        title: storedTitle,
        track: resolvedTrack,
      } satisfies RoomShareEnrichmentResult;

      await updateRoomShareEnrichmentState(result);
      logRoomShareEnrichment("room_share_enrichment_skipped", {
        roomId,
        itemId,
        reason: "missing_metadata",
        links,
        artworkUrl,
        sourcePlatform,
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
        artworkUrl,
        kind: storedKind,
        primaryGenre: null,
        roomId,
        source,
        sourcePlatform,
        status: "error",
        subtitle: storedSubtitle,
        title: storedTitle,
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
        artworkUrl,
        sourcePlatform,
      });
      return result;
    }

    const result = {
      artist: resolvedArtist,
      error: null,
      itemId,
      links,
      artworkUrl,
      kind: storedKind,
      primaryGenre,
      roomId,
      source,
      sourcePlatform,
      status: "ready",
      subtitle: storedSubtitle,
      title: storedTitle,
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
        links: addSourceLink({
          links: mergePlatformLinks(item.links, extractDirectPlatformLinks(normalizedUrl)),
          sourcePlatform: detectedSourcePlatform,
          sourceUrl: normalizedUrl,
        }),
        artworkUrl:
          typeof item.artworkUrl === "string" && item.artworkUrl.trim()
            ? item.artworkUrl.trim()
            : null,
        kind: item.kind ?? "song",
      primaryGenre: null,
      roomId,
      source: null,
      sourcePlatform: detectedSourcePlatform,
      status: "error",
      subtitle: normalizedSubtitle,
      title: normalizedTitle,
      track: null,
    });

    logRoomShareEnrichment("room_share_enrichment_failed", {
      roomId,
      itemId,
      error: message,
      sourcePlatform: detectedSourcePlatform,
    });
    throw error;
  }
}
