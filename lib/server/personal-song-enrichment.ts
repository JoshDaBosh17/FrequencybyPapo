import type {
  PersonalSongItem,
  RoomShareKind,
  RoomSharePlatformLinks,
  RoomShareSourcePlatform,
} from "@/lib/types";

import { adminDb } from "./firebase-admin";
import { setAdminDocument } from "./firestore-write";
import { getArtistTopTags, getTrackTopTags } from "./lastfm";
import {
  detectMusicSourcePlatform,
  extractDirectPlatformLinks,
  extractMusicLinkMetadata,
  resolveSongMetadataAndLinks,
} from "./song-platform-links";

type PersonalSongEnrichmentStatus = "ready" | "error";

type PersonalSongEnrichmentResult = {
  itemId: string;
  userId: string;
  kind: RoomShareKind;
  title: string;
  subtitle: string | null;
  artist: string | null;
  track: string | null;
  sourcePlatform: RoomShareSourcePlatform | null;
  links: RoomSharePlatformLinks | null;
  artworkUrl: string | null;
  primaryGenre: string | null;
  status: PersonalSongEnrichmentStatus;
  source: "lastfm_track" | "lastfm_artist" | null;
  error: string | null;
};

type StoredPersonalSongItem = Partial<PersonalSongItem>;

const GENERIC_PERSONAL_LABELS = new Set([
  "saved song link",
  "saved artist link",
  "saved context link",
  "saved link",
]);

const TITLE_SPLIT_PATTERN = /\s(?:-|–|—|\|)\s/;
const TRACK_TITLE_NOISE_PATTERN =
  /\((official(?:\s+(?:audio|video))?|audio|video|lyrics?|visualizer|topic|hd|4k|remaster(?:ed)?|live)\)/gi;

function logPersonalSongEnrichment(event: string, payload: Record<string, unknown>) {
  console.log("[frequency][personal-song-enrichment]", {
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
  return !normalized || GENERIC_PERSONAL_LABELS.has(normalized);
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

async function resolvePersonalSongMetadata(item: StoredPersonalSongItem) {
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
      logPersonalSongEnrichment("youtube_oembed_failed", {
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

async function updatePersonalSongEnrichmentState(params: {
  userId: string;
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
  status: PersonalSongEnrichmentStatus;
  source: "lastfm_track" | "lastfm_artist" | null;
  error: string | null;
}) {
  const itemRef = adminDb.collection("users").doc(params.userId).collection("savedSongs").doc(params.itemId);

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
      triggerReason: `personal_song_enrichment_${params.status}`,
      userId: params.userId,
    },
  );
}

export async function enrichPersonalSongItem({
  userId,
  itemId,
}: {
  userId: string;
  itemId: string;
}): Promise<PersonalSongEnrichmentResult> {
  const itemRef = adminDb.collection("users").doc(userId).collection("savedSongs").doc(itemId);
  const itemSnapshot = await itemRef.get();

  if (!itemSnapshot.exists) {
    throw new Error("Personal song item not found.");
  }

  const item = itemSnapshot.data() as StoredPersonalSongItem;
  const normalizedTitle = normalizeText(item.title) ?? "Saved song";
  const normalizedSubtitle = normalizeText(item.subtitle);
  const normalizedUrl = normalizeText(item.url);
  const detectedSourcePlatform =
    item.sourcePlatform ?? detectMusicSourcePlatform(normalizedUrl);

  try {
    const resolvedMetadata = await resolvePersonalSongMetadata(item);
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

    if (storedKind === "link" && normalizedUrl) {
      const linkMetadata = await extractMusicLinkMetadata(normalizedUrl).catch((error) => {
        logPersonalSongEnrichment("personal_link_metadata_failed", {
          userId,
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

      if (resolvedArtist && resolvedTrack) {
        storedKind = "song";
        storedTitle = resolvedTrack;
        storedSubtitle = resolvedArtist;
      }
    }

    if (storedKind === "song" && resolvedArtist && resolvedTrack) {
      const songSupport = await resolveSongMetadataAndLinks({
        artist: resolvedArtist,
        existingLinks: links,
        title: resolvedTrack,
        url: normalizedUrl,
      }).catch((error) => {
        logPersonalSongEnrichment("personal_song_support_failed", {
          userId,
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
        artworkUrl = songSupport.artworkUrl ?? artworkUrl;
      }
    }

    if (!resolvedArtist) {
      const result = {
        artist: null,
        artworkUrl,
        error: "missing_metadata",
        itemId,
        kind: storedKind,
        links,
        primaryGenre: null,
        source: null,
        sourcePlatform,
        status: "error",
        subtitle: storedSubtitle,
        title: storedTitle,
        track: resolvedTrack,
        userId,
      } satisfies PersonalSongEnrichmentResult;

      await updatePersonalSongEnrichmentState(result);
      return result;
    }

    let source: "lastfm_track" | "lastfm_artist" | null = null;
    let primaryGenre: string | null = null;

    if (resolvedTrack) {
      const trackTags = await getTrackTopTags(resolvedArtist, resolvedTrack).catch(() => []);
      primaryGenre = resolvePrimaryGenre(trackTags);
      if (primaryGenre) {
        source = "lastfm_track";
      }
    }

    if (!primaryGenre) {
      const artistTags = await getArtistTopTags(resolvedArtist).catch(() => []);
      primaryGenre = resolvePrimaryGenre(artistTags);
      if (primaryGenre) {
        source = "lastfm_artist";
      }
    }

    if (!primaryGenre) {
      const result = {
        artist: resolvedArtist,
        artworkUrl,
        error: "empty_lastfm_response",
        itemId,
        kind: storedKind,
        links,
        primaryGenre: null,
        source,
        sourcePlatform,
        status: "error",
        subtitle: storedSubtitle,
        title: storedTitle,
        track: resolvedTrack,
        userId,
      } satisfies PersonalSongEnrichmentResult;

      await updatePersonalSongEnrichmentState(result);
      return result;
    }

    const result = {
      artist: resolvedArtist,
      artworkUrl,
      error: null,
      itemId,
      kind: storedKind,
      links,
      primaryGenre,
      source,
      sourcePlatform,
      status: "ready",
      subtitle: storedSubtitle,
      title: storedTitle,
      track: resolvedTrack,
      userId,
    } satisfies PersonalSongEnrichmentResult;

    await updatePersonalSongEnrichmentState(result);
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Personal song enrichment failed.";

    await updatePersonalSongEnrichmentState({
      artist: null,
      artworkUrl:
        typeof item.artworkUrl === "string" && item.artworkUrl.trim()
          ? item.artworkUrl.trim()
          : null,
      error: message,
      itemId,
      kind: item.kind ?? "song",
      links: addSourceLink({
        links: mergePlatformLinks(item.links, extractDirectPlatformLinks(normalizedUrl)),
        sourcePlatform: detectedSourcePlatform,
        sourceUrl: normalizedUrl,
      }),
      primaryGenre: null,
      source: null,
      sourcePlatform: detectedSourcePlatform,
      status: "error",
      subtitle: normalizedSubtitle,
      title: normalizedTitle,
      track: null,
      userId,
    });

    throw error;
  }
}
