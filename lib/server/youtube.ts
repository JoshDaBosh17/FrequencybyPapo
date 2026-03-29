import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { IS_SERVER_TEST_MODE } from "@/lib/env/server";
import type { GuidedRecommendationIntent } from "@/lib/frequency/recommendation-intent";
import { adminDb } from "./firebase-admin";
import { setAdminDocument } from "./firestore-write";
import { normalizeArtistName, normalizeComparableText, normalizeVideoKey } from "./artists";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const ARTIST_CHANNEL_CACHE_TTL_MS = IS_SERVER_TEST_MODE
  ? 180 * 24 * 60 * 60 * 1000
  : 30 * 24 * 60 * 60 * 1000;
const YOUTUBE_QUOTA_COSTS = {
  channels: 1,
  search: 100,
  playlistItems: 1,
  videos: 1,
} as const;
const MIN_SONG_DURATION_SECONDS = 90;
const MAX_SONG_DURATION_SECONDS = 10 * 60;
const IDEAL_SONG_DURATION_MIN_SECONDS = 150;
const IDEAL_SONG_DURATION_MAX_SECONDS = 330;
const STRICT_SONG_REJECT_PATTERNS = [
  /#shorts\b/i,
  /\bshorts\b/i,
  /\bclip\b/i,
  /\bteaser\b/i,
  /\bpreview\b/i,
  /\binterview\b/i,
  /\breaction\b/i,
] as const;
const AUDIO_SIGNAL_PATTERN = /\bofficial audio\b|\baudio\b/i;
const LYRIC_SIGNAL_PATTERN = /\blyrics?\b/i;
const TOPIC_SIGNAL_PATTERN = /\btopic\b/i;
const ARTIST_SONG_TITLE_PATTERN = /^\s*[^-|–—]+(?:\s*[-|–—]\s*)[^-|–—]+/;

const SONG_BLOCKED_TERMS = [
  "nightcore",
  "sped up",
  "speed up",
  "slowed",
  "reverb",
  "8d",
  "bass boosted",
  "tiktok",
  "edit audio",
  "mashup",
  "fan made",
  "live @",
  "live at",
  "boiler room",
  "dj set",
  "full set",
  "mix",
  "radio show",
  "podcast",
  "vlog",
  "behind the scenes",
  "trailer",
];

const CHANNEL_BLOCKED_TERMS = [
  "fan",
  "lyrics",
  "lyric",
  "reaction",
  "updates",
  "news",
  "promo",
  "mixes",
  "edits",
  "vault",
  "instrumentals",
  "archive",
  "library",
  "random uploader",
  "world",
  "dump",
  "remix",
];

type YouTubeChannel = {
  channelId: string;
  title: string;
  handle?: string;
  role: "official" | "topic" | "unreleased" | "vevo";
  confidence: number;
};

type StoredYouTubeChannel = {
  channelId: string;
  title: string;
  handle?: string;
  role: "official" | "topic" | "unreleased" | "vevo";
};

type ArtistChannelCacheDoc = {
  artistName: string;
  normalizedArtistName: string;
  buckets?: Partial<Record<YouTubeChannel["role"], StoredYouTubeChannel[]>>;
  channels?: YouTubeChannel[];
  discoverySource: "handle-guess" | "search-fallback" | "manual-confirmed";
  resolvedAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
};

type SearchItem = {
  id?: {
    channelId?: string;
    videoId?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
};

type ChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
    customUrl?: string;
    description?: string;
  };
  brandingSettings?: {
    channel?: {
      title?: string;
    };
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
};

type PlaylistItem = {
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
};

type VideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
  status?: {
    embeddable?: boolean;
  };
  contentDetails?: {
    duration?: string;
  };
};

type SongCandidate = {
  artist: string;
  title: string;
  videoId: string;
  durationSeconds?: number;
  thumbnail: string | null;
  publishedAt: string;
  source: "trusted-channel" | "broad-fallback";
  channelId: string;
  channelTitle: string;
  channelRole?: "official" | "topic" | "unreleased" | "vevo";
  score: number;
  artistPoolWeight?: number;
  recommendationPath?: "seed-artist" | "collaborator-remix-path" | "similar-artist-expansion";
};

export type RecommendationCandidate = SongCandidate;

export type RecommendationRunLog = {
  usedCachedRecommendation: boolean;
  cachedArtistChannels: string[];
  handleGuessResolutions: string[];
  searchFallbackResolutions: string[];
  quota: {
    channels: number;
    search: number;
    playlistItems: number;
    videos: number;
    total: number;
  };
  sampledArtists: string[];
  testMode: boolean;
};

type RunMetrics = {
  cachedArtistChannels: Set<string>;
  handleGuessResolutions: Set<string>;
  searchFallbackResolutions: Set<string>;
  quota: RecommendationRunLog["quota"];
  unresolvedArtists: Set<string>;
};

type YouTubeRequestContext = {
  artistName?: string;
  guessedHandle?: string;
  resolvedChannelId?: string;
  videoId?: string;
  playlistId?: string;
};

function logTrustedPlaybackEvent(
  event:
    | "trusted_playback_started"
    | "trusted_playback_artist_selected"
    | "trusted_playback_canonical_artist_key"
    | "trusted_playback_artist_channel_doc_loaded"
    | "trusted_playback_bucket_summary"
    | "trusted_playback_channel_ids_used_for_search"
    | "trusted_playback_search_results_count"
    | "trusted_playback_candidate_seen"
    | "trusted_playback_candidate_rejected"
    | "trusted_playback_candidate_accepted"
    | "trusted_playback_final_failure_reason",
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][trusted-playback]", {
    event,
    ...payload,
  });
}

function logArtistChannelCacheEvent(
  event:
    | "save_artists_reused_cached_artist_channels"
    | "save_artists_migrated_legacy_channel_doc"
    | "save_artists_pruned_existing_channel_doc"
    | "save_artists_skipped_youtube_lookup_existing_cache"
    | "save_artists_youtube_lookup_required_missing_cache"
    | "channel_cleanup_rejected_legacy_entry"
    | "channel_cleanup_removed_from_firestore"
    | "channel_cleanup_preserved_bucket"
    | "channel_cleanup_rebuilt_doc_without_raw_legacy_channels",
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][artist-channel-cache]", {
    event,
    ...payload,
  });
}

function isExpired(timestamp?: Timestamp | null) {
  if (!timestamp) {
    return true;
  }

  return timestamp.toMillis() <= Date.now();
}

function containsBlockedTerm(value: string) {
  const lower = value.toLowerCase();
  return SONG_BLOCKED_TERMS.some((term) => lower.includes(term));
}

function containsStrictSongRejectPattern(value: string) {
  return STRICT_SONG_REJECT_PATTERNS.some((pattern) => pattern.test(value));
}

function logTrackCandidateDecision(
  event:
    | "track_candidate_accepted_official_video"
    | "track_candidate_accepted_visualizer"
    | "track_candidate_accepted_lyric"
    | "track_candidate_rejected_non_music"
    | "track_candidate_rejected_no_artist_match",
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][track-candidate]", {
    event,
    ...payload,
  });
}

function containsChannelBlockedTerm(value: string) {
  const lower = value.toLowerCase();
  return CHANNEL_BLOCKED_TERMS.some((term) => lower.includes(term));
}

export function parseDuration(value?: string) {
  if (!value) {
    return 0;
  }

  const hours = Number(value.match(/(\d+)H/)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)M/)?.[1] ?? 0);
  const seconds = Number(value.match(/(\d+)S/)?.[1] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export function isValidDuration(seconds: number) {
  return seconds >= MIN_SONG_DURATION_SECONDS && seconds <= MAX_SONG_DURATION_SECONDS;
}

export function isLikelySong(title: string) {
  if (!title.trim()) {
    return false;
  }

  return !containsBlockedTerm(title) && !containsStrictSongRejectPattern(title);
}

function looksLikeTopicChannel(title: string) {
  return title.toLowerCase().includes(" - topic");
}

function looksLikeVevoChannel(title: string) {
  return /\bvevo\b/i.test(title);
}

function looksLikeUnreleasedChannel(title: string, artistDisplayName: string) {
  const normalizedTitle = normalizeComparableText(title);
  const normalizedArtist = normalizeComparableText(artistDisplayName);
  return (
    normalizedTitle.includes(normalizedArtist) &&
    /\bunreleased|demos?|alt|alternate|rarities\b/i.test(title)
  );
}

function hasSuspiciousGeneratedHandle(
  handle: string | undefined,
  normalizedArtistName: string,
) {
  if (!handle) {
    return false;
  }

  const bareHandle = handle.replace(/^@/, "").toLowerCase();
  if (!bareHandle.includes(normalizedArtistName)) {
    return false;
  }

  return /-[a-z0-9]{2,}$/i.test(bareHandle);
}

function isValidHandle(value: string | undefined): value is string {
  return Boolean(value && /^@[\w.-]{2,}$/.test(value));
}

function isValidChannelId(value: string | undefined): value is string {
  return Boolean(value && /^UC[\w-]{22}$/.test(value));
}

function isValidVideoId(value: string | undefined): value is string {
  return Boolean(value && /^[\w-]{11}$/.test(value));
}

function isValidPlaylistId(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{10,}$/.test(value));
}

function logYouTubeRequest(
  endpoint: string,
  params: Record<string, string>,
  context?: YouTubeRequestContext,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][youtube-request]", {
    endpoint,
    artistName: context?.artistName ?? null,
    guessedHandle: context?.guessedHandle ?? null,
    resolvedChannelId: context?.resolvedChannelId ?? null,
    videoId: context?.videoId ?? null,
    params,
  });
}

function logChannelClassification(
  event: "accepted" | "rejected",
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][youtube-channel-classification]", {
    event,
    ...payload,
  });
}

function scoreHandleCloseness(handle: string | undefined, normalizedArtistName: string) {
  if (!handle) {
    return 0;
  }

  const normalizedHandle = normalizeComparableText(handle).replace(/\s+/g, "");
  if (normalizedHandle === normalizedArtistName) {
    return 5;
  }

  if (normalizedHandle.startsWith(normalizedArtistName)) {
    return 3;
  }

  if (normalizedHandle.includes(normalizedArtistName)) {
    return 2;
  }

  return 0;
}

function scoreChannelCandidate(
  title: string,
  handle: string | undefined,
  artistDisplayName: string,
  normalizedArtistName: string,
) {
  const normalizedTitle = normalizeComparableText(title);
  const normalizedDisplayName = normalizeComparableText(artistDisplayName);
  let score = 0;

  if (normalizedTitle === normalizedDisplayName) {
    score += 6;
  }

  if (normalizedTitle.replace(/\s+/g, "") === normalizedArtistName) {
    score += 5;
  }

  if (looksLikeTopicChannel(title)) {
    score += 7;
  }

  if (looksLikeVevoChannel(title)) {
    score += 6;
  }

  if (looksLikeUnreleasedChannel(title, artistDisplayName)) {
    score += 4;
  }

  score += scoreHandleCloseness(handle, normalizedArtistName);

  if (normalizedTitle.includes(normalizedDisplayName)) {
    score += 2;
  }

  if (containsChannelBlockedTerm(title) || containsChannelBlockedTerm(handle ?? "")) {
    score -= 8;
  }

  return score;
}

function compactComparable(value: string) {
  return normalizeComparableText(value).replace(/\s+/g, "");
}

function hasCanonicalOfficialHandleMatch(handle: string | undefined, normalizedArtistName: string) {
  if (!handle) {
    return false;
  }

  const compactHandle = compactComparable(handle.replace(/^@/, ""));
  return compactHandle === normalizedArtistName;
}

function isShortAmbiguousArtistName(normalizedDisplayName: string, normalizedArtistName: string) {
  const artistTokens = normalizedDisplayName.split(" ").filter(Boolean);
  return (
    normalizedArtistName.length <= 5 ||
    (artistTokens.length === 1 && artistTokens[0].length <= 5)
  );
}

function classifyAcceptedChannel(
  title: string,
  handle: string | undefined,
  artistDisplayName: string,
  normalizedArtistName: string,
): { role: YouTubeChannel["role"]; confidence: number } | null {
  const normalizedTitle = normalizeComparableText(title);
  const normalizedDisplayName = normalizeComparableText(artistDisplayName);
  const normalizedTopicTitle = `${normalizedDisplayName} topic`;
  const normalizedVevoTitle = `${normalizedDisplayName} vevo`;
  const confidence = scoreChannelCandidate(title, handle, artistDisplayName, normalizedArtistName);

  if (containsChannelBlockedTerm(title) || containsChannelBlockedTerm(handle ?? "")) {
    return null;
  }

  if (looksLikeTopicChannel(title) && normalizedTitle === normalizedTopicTitle) {
    return { role: "topic", confidence };
  }

  if (
    looksLikeUnreleasedChannel(title, artistDisplayName) &&
    normalizedTitle === `${normalizedDisplayName} unreleased`
  ) {
    return { role: "unreleased", confidence };
  }

  if (looksLikeVevoChannel(title) && normalizedTitle === normalizedVevoTitle) {
    return { role: "vevo", confidence };
  }

  const exactTitleMatch =
    normalizedTitle === normalizedDisplayName ||
    normalizedTitle.replace(/\s+/g, "") === normalizedArtistName;
  const canonicalHandleMatch = hasCanonicalOfficialHandleMatch(handle, normalizedArtistName);
  const shortAmbiguousArtist = isShortAmbiguousArtistName(
    normalizedDisplayName,
    normalizedArtistName,
  );

  if (
    confidence >= (shortAmbiguousArtist ? 7 : 5) &&
    !hasSuspiciousGeneratedHandle(handle, normalizedArtistName) &&
    canonicalHandleMatch &&
    exactTitleMatch
  ) {
    return { role: "official", confidence };
  }

  return null;
}

function buildTrustedChannel(
  item: ChannelItem,
  artistDisplayName: string,
  normalizedArtistName: string,
): YouTubeChannel | null {
  const channelId = item.id;
  const title =
    item.brandingSettings?.channel?.title ??
    item.snippet?.title ??
    "";
  const handle = item.snippet?.customUrl ? `@${item.snippet.customUrl.replace(/^@/, "")}` : undefined;
  const confidence = scoreChannelCandidate(title, handle, artistDisplayName, normalizedArtistName);

  if (!isValidChannelId(channelId) || !title || confidence < 3) {
    logChannelClassification("rejected", {
      artistName: artistDisplayName,
      channelId: channelId ?? null,
      title,
      handle: handle ?? null,
      reason: !isValidChannelId(channelId) ? "invalid_channel_id" : !title ? "missing_title" : "low_confidence",
      score: confidence,
    });
    return null;
  }

  if (containsChannelBlockedTerm(title) || containsChannelBlockedTerm(handle ?? "")) {
    logChannelClassification("rejected", {
      artistName: artistDisplayName,
      channelId,
      title,
      handle: handle ?? null,
      reason: "blocked_term",
      score: confidence,
    });
    return null;
  }

  const classification = classifyAcceptedChannel(
    title,
    handle,
    artistDisplayName,
    normalizedArtistName,
  );

  if (!classification) {
    logChannelClassification("rejected", {
      artistName: artistDisplayName,
      channelId,
      title,
      handle: handle ?? null,
      reason: "failed_acceptance_rules",
      score: confidence,
    });
    return null;
  }

  const acceptedChannel = {
    channelId,
    title,
    handle,
    role: classification.role,
    confidence: classification.confidence,
  };

  logChannelClassification("accepted", {
    artistName: artistDisplayName,
    channelId,
    title,
    handle: handle ?? null,
    role: classification.role,
    score: classification.confidence,
  });

  return acceptedChannel;
}

function dedupeChannels(channels: YouTubeChannel[]) {
  const byId = new Map<string, YouTubeChannel>();

  for (const channel of channels) {
    const existing = byId.get(channel.channelId);
    if (!existing || existing.confidence < channel.confidence) {
      byId.set(channel.channelId, channel);
    }
  }

  return [...byId.values()].sort((left, right) => right.confidence - left.confidence);
}

function bucketizeChannels(channels: YouTubeChannel[]) {
  const buckets: Partial<Record<YouTubeChannel["role"], YouTubeChannel[]>> = {};

  for (const channel of dedupeChannels(channels)) {
    const existing = buckets[channel.role] ?? [];
    if (existing.some((entry) => entry.channelId === channel.channelId)) {
      continue;
    }

    const limit = channel.role === "official" || channel.role === "topic" ? 2 : 1;
    if (existing.length >= limit) {
      continue;
    }

    buckets[channel.role] = [...existing, channel];
  }

  return buckets;
}

function flattenChannelBuckets(
  buckets: Partial<Record<YouTubeChannel["role"], StoredYouTubeChannel[]>>,
) {
  return (["official", "topic", "vevo", "unreleased"] as const).flatMap((role) => buckets[role] ?? []);
}

function hydrateStoredChannel(channel: StoredYouTubeChannel | YouTubeChannel): YouTubeChannel {
  return {
    channelId: channel.channelId,
    title: channel.title,
    handle: channel.handle,
    role: channel.role,
    confidence: "confidence" in channel && typeof channel.confidence === "number" ? channel.confidence : 0,
  };
}

function sanitizeCachedChannel(
  channel: StoredYouTubeChannel | YouTubeChannel,
  artistDisplayName: string,
  normalizedArtistName: string,
): YouTubeChannel | null {
  const hydrated = hydrateStoredChannel(channel);

  if (!isValidChannelId(hydrated.channelId) || !hydrated.title) {
    logArtistChannelCacheEvent("channel_cleanup_rejected_legacy_entry", {
      artistName: artistDisplayName,
      channelId: hydrated.channelId,
      title: hydrated.title,
      handle: hydrated.handle ?? null,
      reason: "invalid_channel_shape",
    });
    return null;
  }

  if (containsChannelBlockedTerm(hydrated.title) || containsChannelBlockedTerm(hydrated.handle ?? "")) {
    logArtistChannelCacheEvent("channel_cleanup_rejected_legacy_entry", {
      artistName: artistDisplayName,
      channelId: hydrated.channelId,
      title: hydrated.title,
      handle: hydrated.handle ?? null,
      reason: "blocked_term",
    });
    return null;
  }

  const classification = classifyAcceptedChannel(
    hydrated.title,
    hydrated.handle,
    artistDisplayName,
    normalizedArtistName,
  );

  if (!classification) {
    logArtistChannelCacheEvent("channel_cleanup_rejected_legacy_entry", {
      artistName: artistDisplayName,
      channelId: hydrated.channelId,
      title: hydrated.title,
      handle: hydrated.handle ?? null,
      reason: "failed_acceptance_rules",
    });
    return null;
  }

  const sanitized = {
    ...hydrated,
    role: classification.role,
    confidence: classification.confidence,
  };

  logArtistChannelCacheEvent("channel_cleanup_preserved_bucket", {
    artistName: artistDisplayName,
    channelId: sanitized.channelId,
    title: sanitized.title,
    role: sanitized.role,
  });

  return sanitized;
}

function selectChannelsForIntent(
  channels: YouTubeChannel[],
  intent?: GuidedRecommendationIntent,
) {
  const buckets = bucketizeChannels(channels);

  if (intent?.discoveryMode === "familiar") {
    return [
      ...(buckets.official ?? []),
      ...((buckets.official?.length ?? 0) ? [] : (buckets.vevo ?? [])),
    ];
  }

  if (intent?.discoveryMode === "explore") {
    return [
      ...(buckets.official ?? []),
      ...(buckets.topic ?? []),
      ...(buckets.unreleased ?? []),
      ...((buckets.official?.length ?? 0) ? [] : (buckets.vevo ?? [])),
    ];
  }

  return [
    ...(buckets.official ?? []),
    ...(buckets.topic ?? []),
    ...((buckets.official?.length ?? 0) ? [] : (buckets.vevo ?? [])),
  ];
}

async function youtubeRequest<T>(
  path: string,
  params: Record<string, string>,
  context?: YouTubeRequestContext,
) {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }

  logYouTubeRequest(path, params, context);

  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.searchParams.set("key", YOUTUBE_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });

  if (!response.ok) {
    const errorBody = await response.text();

    if (process.env.NODE_ENV === "development") {
      console.error("[frequency][youtube-error]", {
        endpoint: path,
        artistName: context?.artistName ?? null,
        guessedHandle: context?.guessedHandle ?? null,
        resolvedChannelId: context?.resolvedChannelId ?? null,
        videoId: context?.videoId ?? null,
        status: response.status,
        body: errorBody,
      });
    }

    throw new Error(`YouTube request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function createRunMetrics(): RunMetrics {
  return {
    cachedArtistChannels: new Set<string>(),
    handleGuessResolutions: new Set<string>(),
    searchFallbackResolutions: new Set<string>(),
    quota: {
      channels: 0,
      search: 0,
      playlistItems: 0,
      videos: 0,
      total: 0,
    },
    unresolvedArtists: new Set<string>(),
  };
}

function trackQuota(metrics: RunMetrics, path: keyof typeof YOUTUBE_QUOTA_COSTS) {
  metrics.quota[path] += 1;
  metrics.quota.total += YOUTUBE_QUOTA_COSTS[path];
}

async function loadCachedArtistChannels(artistName: string, metrics: RunMetrics) {
  const normalized = normalizeArtistName(artistName);
  const docRef = adminDb.collection("artistChannels").doc(normalized.normalizedKey);
  const snapshot = await docRef.get();

  const rawData = snapshot.exists ? ((snapshot.data() as ArtistChannelCacheDoc) ?? null) : null;
  logTrustedPlaybackEvent("trusted_playback_artist_channel_doc_loaded", {
    artistName,
    canonicalArtistKey: normalized.normalizedKey,
    docExists: snapshot.exists,
    bucketedSchemaPresent: Boolean(rawData?.buckets),
    legacyChannelsPresent: Array.isArray(rawData?.channels),
  });

  if (rawData?.buckets) {
    logTrustedPlaybackEvent("trusted_playback_bucket_summary", {
      artistName,
      canonicalArtistKey: normalized.normalizedKey,
      buckets: {
        official: rawData.buckets.official ?? [],
        topic: rawData.buckets.topic ?? [],
        unreleased: rawData.buckets.unreleased ?? [],
        vevo: rawData.buckets.vevo ?? [],
      },
    });
  }

  if (!snapshot.exists) {
    return null;
  }

  const data = rawData as ArtistChannelCacheDoc;
  const normalizedChannels = data.buckets
    ? flattenChannelBuckets(data.buckets).map(hydrateStoredChannel)
    : (data.channels ?? []).map(hydrateStoredChannel);
  if (!normalizedChannels.length || isExpired(data.expiresAt)) {
    return null;
  }

  metrics.cachedArtistChannels.add(artistName);

  return {
    normalized,
    data: {
      ...data,
      channels: normalizedChannels,
      buckets: data.buckets ?? bucketizeChannels(normalizedChannels),
    },
  };
}

export async function reconcileCachedArtistChannelsForSave(artistName: string) {
  const normalized = normalizeArtistName(artistName);
  const docRef = adminDb.collection("artistChannels").doc(normalized.normalizedKey);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    logArtistChannelCacheEvent("save_artists_youtube_lookup_required_missing_cache", {
      artistName,
      normalizedArtistName: normalized.normalizedKey,
      reason: "missing_doc",
    });
    return { artistName, usable: false, reused: false };
  }

  const data = snapshot.data() as ArtistChannelCacheDoc;
  const rawChannels = data.buckets
    ? flattenChannelBuckets(data.buckets)
    : (data.channels ?? []).map((channel) => ({
        channelId: channel.channelId,
        title: channel.title,
        handle: channel.handle,
        role: channel.role,
      }));

  if (!rawChannels.length) {
    logArtistChannelCacheEvent("save_artists_youtube_lookup_required_missing_cache", {
      artistName,
      normalizedArtistName: normalized.normalizedKey,
      reason: "empty_cached_doc",
    });
    return { artistName, usable: false, reused: false };
  }

  const sanitizedChannels = rawChannels
    .map((channel) =>
      sanitizeCachedChannel(channel, normalized.displayName, normalized.normalizedKey),
    )
    .filter((channel): channel is YouTubeChannel => channel !== null);
  const canonicalBuckets = bucketizeChannels(sanitizedChannels);
  const flattenedCanonical = flattenChannelBuckets(canonicalBuckets);
  const hadLegacyShape = !data.buckets && Array.isArray(data.channels);
  const wasPruned = flattenedCanonical.length < rawChannels.length;
  const usable = flattenedCanonical.length > 0;

  if (!usable) {
    logArtistChannelCacheEvent("save_artists_youtube_lookup_required_missing_cache", {
      artistName,
      normalizedArtistName: normalized.normalizedKey,
      reason: "cached_doc_unusable",
    });
    return { artistName, usable: false, reused: false };
  }

  if (hadLegacyShape) {
    logArtistChannelCacheEvent("save_artists_migrated_legacy_channel_doc", {
      artistName,
      normalizedArtistName: normalized.normalizedKey,
    });
  }

  if (wasPruned) {
    logArtistChannelCacheEvent("save_artists_pruned_existing_channel_doc", {
      artistName,
      normalizedArtistName: normalized.normalizedKey,
      removedChannels: rawChannels.length - flattenedCanonical.length,
    });
    logArtistChannelCacheEvent("channel_cleanup_removed_from_firestore", {
      artistName,
      normalizedArtistName: normalized.normalizedKey,
      removedChannels: rawChannels.length - flattenedCanonical.length,
    });
  }

  logArtistChannelCacheEvent("save_artists_reused_cached_artist_channels", {
    artistName,
    normalizedArtistName: normalized.normalizedKey,
    bucketRoles: Object.keys(canonicalBuckets),
  });
  logArtistChannelCacheEvent("save_artists_skipped_youtube_lookup_existing_cache", {
    artistName,
    normalizedArtistName: normalized.normalizedKey,
  });

  await setAdminDocument(
    docRef,
    {
      artistName: normalized.displayName,
      normalizedArtistName: normalized.normalizedKey,
      buckets: Object.fromEntries(
        Object.entries(canonicalBuckets).map(([role, bucketChannels]) => [
          role,
          bucketChannels.map((channel) => ({
            channelId: channel.channelId,
            title: channel.title,
            role: channel.role,
            ...(channel.handle ? { handle: channel.handle } : {}),
          })),
        ]),
      ),
      channels: FieldValue.delete(),
      discoverySource: data.discoverySource ?? "manual-confirmed",
      resolvedAt: data.resolvedAt ?? Timestamp.now(),
      expiresAt: data.expiresAt ?? Timestamp.fromMillis(Date.now() + ARTIST_CHANNEL_CACHE_TTL_MS),
    },
    { merge: true },
    {
      triggerReason: "save_artists_reconcile_cached_artist_channels",
      userId: null,
    },
  );

  logArtistChannelCacheEvent("channel_cleanup_rebuilt_doc_without_raw_legacy_channels", {
    artistName,
    normalizedArtistName: normalized.normalizedKey,
    removedRawChannelsField: true,
  });

  return { artistName, usable: true, reused: true };
}

async function saveArtistChannels(
  artistName: string,
  normalizedArtistName: string,
  discoverySource: ArtistChannelCacheDoc["discoverySource"],
  channels: YouTubeChannel[],
) {
  const now = Date.now();

  await setAdminDocument(
    adminDb.collection("artistChannels").doc(normalizedArtistName),
    {
      artistName,
      normalizedArtistName,
      buckets: Object.fromEntries(
        Object.entries(bucketizeChannels(channels)).map(([role, bucketChannels]) => [
          role,
          bucketChannels.map((channel) => ({
            channelId: channel.channelId,
            title: channel.title,
            role: channel.role,
            ...(channel.handle ? { handle: channel.handle } : {}),
          })),
        ]),
      ),
      discoverySource,
      resolvedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + ARTIST_CHANNEL_CACHE_TTL_MS),
    },
    { merge: true },
    {
      triggerReason: `cache_artist_channels_${discoverySource}`,
      userId: null,
    },
  );
}

async function resolveChannelsByHandleGuess(artistName: string, metrics: RunMetrics) {
  const normalized = normalizeArtistName(artistName);
  const matches: YouTubeChannel[] = [];

  for (const handle of normalized.handleGuesses) {
    if (!isValidHandle(handle)) {
      continue;
    }

    trackQuota(metrics, "channels");
    const response = await youtubeRequest<{ items?: ChannelItem[] }>("channels", {
      part: "snippet,brandingSettings",
      forHandle: handle,
      maxResults: "1",
    }, {
      artistName,
      guessedHandle: handle,
    });

    const item = response.items?.[0];
    if (!item) {
      continue;
    }

    const trusted = buildTrustedChannel(item, normalized.displayName, normalized.normalizedKey);
    if (trusted) {
      matches.push(trusted);
    }
  }

  return {
    normalized,
    channels: dedupeChannels(matches),
  };
}

async function resolveChannelsBySearchFallback(artistName: string, metrics: RunMetrics) {
  const normalized = normalizeArtistName(artistName);
  trackQuota(metrics, "search");
  const search = await youtubeRequest<{ items?: SearchItem[] }>("search", {
    part: "snippet",
    q: artistName,
    type: "channel",
    maxResults: "8",
  }, {
    artistName,
  });

  const ids = (search.items ?? [])
    .map((item) => item.id?.channelId)
    .filter((value): value is string => isValidChannelId(value));

  if (!ids.length) {
    return {
      normalized,
      channels: [] as YouTubeChannel[],
    };
  }

  trackQuota(metrics, "channels");
  const details = await youtubeRequest<{ items?: ChannelItem[] }>("channels", {
    part: "snippet,brandingSettings",
    id: ids.join(","),
    maxResults: String(ids.length),
  }, {
    artistName,
    resolvedChannelId: ids.join(","),
  });

  const matchedChannels = (details.items ?? [])
    .map((item) => buildTrustedChannel(item, normalized.displayName, normalized.normalizedKey))
    .filter((value): value is YouTubeChannel => value !== null);

  const channels = dedupeChannels(matchedChannels);

  return {
    normalized,
    channels,
  };
}

export async function resolveTrustedArtistChannels(artistName: string, metrics: RunMetrics) {
  const normalized = normalizeArtistName(artistName);
  logTrustedPlaybackEvent("trusted_playback_started", {
    artistName,
  });
  logTrustedPlaybackEvent("trusted_playback_artist_selected", {
    artistName,
  });
  logTrustedPlaybackEvent("trusted_playback_canonical_artist_key", {
    artistName,
    canonicalArtistKey: normalized.normalizedKey,
  });

  const cached = await loadCachedArtistChannels(artistName, metrics);
  if (cached) {
    logTrustedPlaybackEvent("trusted_playback_channel_ids_used_for_search", {
      artistName,
      source: "cached_bucketed_channels",
      channels: (cached.data.channels ?? []).map((channel) => ({
        channelId: channel.channelId,
        title: channel.title,
        handle: channel.handle ?? null,
        role: channel.role,
      })),
    });
    return cached.data.channels ?? [];
  }

  const handleResolved = await resolveChannelsByHandleGuess(artistName, metrics);
  let channels = handleResolved.channels;
  let discoverySource: ArtistChannelCacheDoc["discoverySource"] = "handle-guess";

  if (channels.length) {
    metrics.handleGuessResolutions.add(artistName);
  }

  const roles = new Set(channels.map((channel) => channel.role));
  if (!channels.length || !roles.has("topic") || !roles.has("official")) {
    const searchResolved = await resolveChannelsBySearchFallback(artistName, metrics);
    channels = dedupeChannels([...channels, ...searchResolved.channels]);
    if (searchResolved.channels.length) {
      discoverySource = "search-fallback";
      metrics.searchFallbackResolutions.add(artistName);
    }
  }

  if (channels.length) {
    await saveArtistChannels(
      handleResolved.normalized.displayName,
      handleResolved.normalized.normalizedKey,
      discoverySource,
      channels,
    );
  } else {
    metrics.unresolvedArtists.add(artistName);
  }

  logTrustedPlaybackEvent("trusted_playback_channel_ids_used_for_search", {
    artistName,
    source: "resolved_channels_after_lookup",
    channels: channels.map((channel) => ({
      channelId: channel.channelId,
      title: channel.title,
      handle: channel.handle ?? null,
      role: channel.role,
    })),
  });

  return channels;
}

async function getUploadsPlaylistId(channelId: string, artistName: string) {
  if (!isValidChannelId(channelId)) {
    return null;
  }

  // Uses cheap channels.list once a channel is known.
  const response = await youtubeRequest<{ items?: ChannelItem[] }>("channels", {
    part: "contentDetails",
    id: channelId,
    maxResults: "1",
  }, {
    artistName,
    resolvedChannelId: channelId,
  });

  const uploadsPlaylistId = response.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
  return isValidPlaylistId(uploadsPlaylistId) ? uploadsPlaylistId : null;
}

async function getRecentVideosForChannel(
  artistName: string,
  channel: YouTubeChannel,
  metrics: RunMetrics,
  limit = 10,
) {
  if (!isValidChannelId(channel.channelId)) {
    metrics.unresolvedArtists.add(artistName);
    return [];
  }

  trackQuota(metrics, "channels");
  const uploadsPlaylistId = await getUploadsPlaylistId(channel.channelId, artistName);

  if (!uploadsPlaylistId) {
    return [];
  }

  trackQuota(metrics, "playlistItems");
  const playlistItems = await youtubeRequest<{ items?: PlaylistItem[] }>("playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(limit),
  }, {
    artistName,
    resolvedChannelId: channel.channelId,
    playlistId: uploadsPlaylistId,
  });

  const videoIds = (playlistItems.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter((value): value is string => isValidVideoId(value));

  if (!videoIds.length) {
    return [];
  }

  trackQuota(metrics, "videos");
  const details = await youtubeRequest<{ items?: VideoItem[] }>("videos", {
    part: "snippet,status,contentDetails",
    id: videoIds.join(","),
  }, {
    artistName,
    resolvedChannelId: channel.channelId,
    videoId: videoIds.join(","),
  });

  return details.items ?? [];
}

function titleLooksLikeSong(title: string, artistName: string) {
  const normalizedTitle = normalizeComparableText(title);
  const normalizedArtistName = normalizeComparableText(artistName);

  if (!isLikelySong(title)) {
    return false;
  }

  return (
    normalizedTitle === normalizedArtistName ||
    normalizedTitle.includes(normalizedArtistName) ||
    ARTIST_SONG_TITLE_PATTERN.test(title) ||
    title.length <= 64
  );
}

function matchesArtistSongPattern(title: string, artistName: string) {
  if (!ARTIST_SONG_TITLE_PATTERN.test(title)) {
    return false;
  }

  const normalizedArtist = normalizeComparableText(artistName);
  const [leadingSegment = ""] = title.split(/\s*[-|–—]\s*/, 1);
  const normalizedLeadingSegment = normalizeComparableText(leadingSegment);

  return (
    normalizedLeadingSegment.includes(normalizedArtist) ||
    normalizedArtist.includes(normalizedLeadingSegment)
  );
}

function hasAudioSignal(title: string) {
  return AUDIO_SIGNAL_PATTERN.test(title);
}

function hasLyricSignal(title: string) {
  return LYRIC_SIGNAL_PATTERN.test(title);
}

function hasTopicSignal(title: string, channelTitle: string, channelRole?: YouTubeChannel["role"]) {
  return channelRole === "topic" || TOPIC_SIGNAL_PATTERN.test(`${title} ${channelTitle}`);
}

function hasSelectedArtistMatch(title: string, channelTitle: string, artistName: string) {
  const normalizedArtist = normalizeComparableText(artistName);
  const normalizedTitle = normalizeComparableText(title);
  const normalizedChannel = normalizeComparableText(channelTitle);

  return (
    normalizedTitle.includes(normalizedArtist) ||
    normalizedChannel.includes(normalizedArtist) ||
    looksLikeTopicChannel(channelTitle) ||
    looksLikeVevoChannel(channelTitle)
  );
}

function isOfficialVideoFormat(title: string) {
  return /\bofficial (music )?video\b/i.test(title) || /\bvevo\b/i.test(title);
}

function isVisualizerFormat(title: string) {
  return /\bofficial visualizer\b/i.test(title) || /\bvisualizer\b/i.test(title);
}

function isLyricFormat(title: string) {
  return /\bofficial lyric video\b/i.test(title) || /\blyric video\b/i.test(title);
}

function isClearlyNonMusic(title: string, channelTitle: string) {
  const combined = `${title} ${channelTitle}`;
  return (
    !isLikelySong(title) ||
    containsBlockedTerm(combined) ||
    /\btrailer\b/i.test(combined) ||
    /\bbehind(?: the)? scenes\b/i.test(combined) ||
    containsStrictSongRejectPattern(title)
  );
}

function getSongCandidateRejectReason(
  candidate: Pick<VideoItem, "snippet" | "contentDetails" | "status">,
  artistName: string,
) {
  const title = candidate.snippet?.title ?? "";
  const channelTitle = candidate.snippet?.channelTitle ?? "";
  const durationSeconds = parseDuration(candidate.contentDetails?.duration);

  if (!candidate.status?.embeddable) {
    return "unembeddable";
  }

  if (!isValidDuration(durationSeconds)) {
    return "duration_invalid";
  }

  if (!isLikelySong(title)) {
    return "title_not_song_like";
  }

  if (isClearlyNonMusic(title, channelTitle)) {
    return "non_music_content";
  }

  if (!hasSelectedArtistMatch(title, channelTitle, artistName)) {
    return "no_selected_artist_in_title";
  }

  return null;
}

function rankSongCandidates(candidates: SongCandidate[]) {
  return [...candidates].sort((left, right) => right.score - left.score);
}

export function scoreSongCandidate(
  candidate: Pick<VideoItem, "snippet" | "contentDetails" | "status" | "id">,
  artistName: string,
  channelRole?: "official" | "topic" | "unreleased" | "vevo",
) {
  const title = candidate.snippet?.title ?? "";
  const channelTitle = candidate.snippet?.channelTitle ?? "";
  const normalizedTitle = normalizeComparableText(title);
  const normalizedArtist = normalizeComparableText(artistName);
  const artistMatched = hasSelectedArtistMatch(title, channelTitle, artistName);
  const officialVideo = isOfficialVideoFormat(title);
  const visualizer = isVisualizerFormat(title);
  const lyricVideo = isLyricFormat(title);
  const durationSeconds = parseDuration(candidate.contentDetails?.duration);
  const audioSignal = hasAudioSignal(title);
  const lyricSignal = hasLyricSignal(title);
  const artistSongPattern = matchesArtistSongPattern(title, artistName);
  const topicSignal = hasTopicSignal(title, channelTitle, channelRole);
  let score = 0;

  if (isClearlyNonMusic(title, channelTitle) || !isValidDuration(durationSeconds)) {
    logTrackCandidateDecision("track_candidate_rejected_non_music", {
      artistName,
      title,
      channelTitle,
      channelRole: channelRole ?? null,
    });
    return -100;
  }

  if (channelRole === "topic") {
    score += 12;
  }

  if (channelRole === "official") {
    score += 10;
  }

  if (channelRole === "vevo") {
    score += 7;
  }

  if (channelRole === "unreleased") {
    score += 2;
  }

  if (titleLooksLikeSong(title, artistName)) {
    score += 8;
  }

  if (audioSignal) {
    score += normalizedTitle.includes("official audio") ? 12 : 7;
  }

  if (lyricSignal) {
    score += lyricVideo ? 7 : 5;
  }

  if (topicSignal) {
    score += 5;
  }

  if (artistSongPattern) {
    score += 10;
  }

  if (officialVideo) {
    score += 4;
    logTrackCandidateDecision("track_candidate_accepted_official_video", {
      artistName,
      title,
      channelTitle,
      channelRole: channelRole ?? null,
    });
  }

  if (visualizer) {
    score += 3;
    logTrackCandidateDecision("track_candidate_accepted_visualizer", {
      artistName,
      title,
      channelTitle,
      channelRole: channelRole ?? null,
    });
  }

  if (lyricVideo) {
    score += 2;
    logTrackCandidateDecision("track_candidate_accepted_lyric", {
      artistName,
      title,
      channelTitle,
      channelRole: channelRole ?? null,
    });
  }

  if (normalizedTitle === normalizedArtist || /\(.*remix.*\)/i.test(title)) {
    score += 4;
  }

  if (/\bremix\b/i.test(title) && !containsBlockedTerm(title)) {
    score += 3;
  }

  const publishedAt = candidate.snippet?.publishedAt;
  if (publishedAt) {
    const ageMs = Date.now() - new Date(publishedAt).getTime();
    if (ageMs <= 60 * 24 * 60 * 60 * 1000) {
      score += 2;
    }
  }

  if (title.length <= 60 && !/[!]{2,}|[?]{2,}/.test(title)) {
    score += 2;
  }

  if (normalizeComparableText(channelTitle).includes(normalizedArtist)) {
    score += 2;
  }

  if (!candidate.status?.embeddable) {
    score -= 10;
  }

  if (durationSeconds >= IDEAL_SONG_DURATION_MIN_SECONDS && durationSeconds <= IDEAL_SONG_DURATION_MAX_SECONDS) {
    score += 6;
  } else if (isValidDuration(durationSeconds)) {
    score += 2;
  }

  if (/[A-Z]{8,}/.test(title) || /[!]{2,}/.test(title)) {
    score -= 6;
  }

  if (artistMatched) {
    score += 12;
  } else {
    score -= 16;
    logTrackCandidateDecision("track_candidate_rejected_no_artist_match", {
      artistName,
      title,
      channelTitle,
      channelRole: channelRole ?? null,
    });
  }

  return score;
}

function toSongCandidate(
  video: VideoItem,
  artistName: string,
  source: "trusted-channel" | "broad-fallback",
  channelRole?: "official" | "topic" | "unreleased" | "vevo",
): SongCandidate | null {
  const videoId = video.id;
  const title = video.snippet?.title ?? "";
  const channelId = video.snippet?.channelId ?? "";
  const channelTitle = video.snippet?.channelTitle ?? "";

  if (!videoId || !title || !channelId) {
    logTrustedPlaybackEvent("trusted_playback_candidate_rejected", {
      artistName,
      videoId: videoId ?? null,
      title,
      channelId: channelId ?? null,
      channelTitle,
      rejectReason: "missing_required_video_fields",
    });
    return null;
  }

  logTrustedPlaybackEvent("trusted_playback_candidate_seen", {
    artistName,
    videoId,
    title,
    channelId,
    channelTitle,
    channelRole: channelRole ?? null,
  });

  const durationSeconds = parseDuration(video.contentDetails?.duration);
  const rejectReason = getSongCandidateRejectReason(video, artistName);
  if (rejectReason) {
    logTrustedPlaybackEvent("trusted_playback_candidate_rejected", {
      artistName,
      videoId,
      title,
      channelId,
      channelTitle,
      channelRole: channelRole ?? null,
      rejectReason,
      durationSeconds,
    });
    return null;
  }

  const score = scoreSongCandidate(video, artistName, channelRole);
  if (score < 0) {
    logTrustedPlaybackEvent("trusted_playback_candidate_rejected", {
      artistName,
      videoId,
      title,
      channelId,
      channelTitle,
      channelRole: channelRole ?? null,
      rejectReason: "title_confidence_too_low",
      score,
      durationSeconds,
    });
    return null;
  }

  logTrustedPlaybackEvent("trusted_playback_candidate_accepted", {
    artistName,
    videoId,
    title,
    channelId,
    channelTitle,
    channelRole: channelRole ?? null,
    score,
  });

  return {
    artist: artistName,
    title,
    videoId,
    durationSeconds,
    thumbnail:
      video.snippet?.thumbnails?.high?.url ??
      video.snippet?.thumbnails?.medium?.url ??
      video.snippet?.thumbnails?.default?.url ??
      null,
    publishedAt: video.snippet?.publishedAt ?? "",
    channelId,
    channelTitle: video.snippet?.channelTitle ?? "",
    channelRole,
    source,
    score,
  };
}

export async function getTrustedRecentSongCandidates(
  artistName: string,
  metrics: RunMetrics,
  intent?: GuidedRecommendationIntent,
) {
  const channels = await getIntentScopedTrustedArtistChannels(artistName, metrics, intent);
  if (!channels.length) {
    metrics.unresolvedArtists.add(artistName);
    logTrustedPlaybackEvent("trusted_playback_final_failure_reason", {
      artistName,
      reason: "empty_trusted_buckets",
    });
    return [];
  }

  const candidates: SongCandidate[] = [];
  const seenTitles = new Set<string>();

  for (const channel of channels) {
    const recentVideos = await getRecentVideosForChannel(artistName, channel, metrics, 10);
    logTrustedPlaybackEvent("trusted_playback_search_results_count", {
      artistName,
      channelId: channel.channelId,
      channelTitle: channel.title,
      channelRole: channel.role,
      searchWindow: 10,
      resultCount: recentVideos.length,
    });
    let addedForChannel = 0;

    for (const video of recentVideos) {
      const candidate = toSongCandidate(video, artistName, "trusted-channel", channel.role);
      if (!candidate) {
        continue;
      }

      const dedupeKey = normalizeVideoKey(candidate.title);
      if (!dedupeKey || seenTitles.has(dedupeKey)) {
        continue;
      }

      seenTitles.add(dedupeKey);
      candidates.push(candidate);
      addedForChannel += 1;
    }

    if (addedForChannel === 0) {
      const fallbackVideos = await getRecentVideosForChannel(artistName, channel, metrics, 30);
      logTrustedPlaybackEvent("trusted_playback_search_results_count", {
        artistName,
        channelId: channel.channelId,
        channelTitle: channel.title,
        channelRole: channel.role,
        searchWindow: 30,
        resultCount: fallbackVideos.length,
      });
      for (const video of fallbackVideos) {
        const candidate = toSongCandidate(video, artistName, "trusted-channel", channel.role);
        if (!candidate) {
          continue;
        }

        const dedupeKey = normalizeVideoKey(candidate.title);
        if (!dedupeKey || seenTitles.has(dedupeKey)) {
          continue;
        }

        seenTitles.add(dedupeKey);
        candidates.push(candidate);
      }
    }
  }

  if (!candidates.length) {
    logTrustedPlaybackEvent("trusted_playback_final_failure_reason", {
      artistName,
      reason: "over_filtering_after_search",
      channelsSearched: channels.map((channel) => ({
        channelId: channel.channelId,
        title: channel.title,
        role: channel.role,
      })),
    });
  }

  return rankSongCandidates(candidates);
}

export async function getIntentScopedTrustedArtistChannels(
  artistName: string,
  metrics: RunMetrics,
  intent?: GuidedRecommendationIntent,
) {
  const channels = await resolveTrustedArtistChannels(artistName, metrics);
  return selectChannelsForIntent(channels, intent);
}

export async function getBroadFallbackSongCandidate(artistName: string, metrics: RunMetrics) {
  const candidates = await getBroadFallbackSongCandidates(artistName, metrics);
  return candidates[0] ?? null;
}

export async function getBroadFallbackSongCandidates(
  artistName: string,
  metrics: RunMetrics,
  intent?: GuidedRecommendationIntent,
): Promise<SongCandidate[]> {
  const query =
    intent?.genreSeed && intent.discoveryMode !== "familiar"
      ? `${artistName} ${intent.genreSeed} official`
      : `${artistName} official`;
  trackQuota(metrics, "search");
  const search = await youtubeRequest<{ items?: SearchItem[] }>("search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "8",
    videoEmbeddable: "true",
    order: "date",
  }, {
    artistName,
  });

  const ids = (search.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((value): value is string => isValidVideoId(value));

  if (!ids.length) {
    return [];
  }

  trackQuota(metrics, "videos");
  const details = await youtubeRequest<{ items?: VideoItem[] }>("videos", {
    part: "snippet,status,contentDetails",
    id: ids.join(","),
  }, {
    artistName,
    videoId: ids.join(","),
  });

  return (details.items ?? [])
    .map((video) => toSongCandidate(video, artistName, "broad-fallback"))
    .filter((value): value is SongCandidate => value !== null)
    .sort((left, right) => right.score - left.score);
}

export function createRecommendationRunLog(): RecommendationRunLog {
  return {
    usedCachedRecommendation: false,
    cachedArtistChannels: [],
    handleGuessResolutions: [],
    searchFallbackResolutions: [],
    quota: {
      channels: 0,
      search: 0,
      playlistItems: 0,
      videos: 0,
      total: 0,
    },
    sampledArtists: [],
    testMode: IS_SERVER_TEST_MODE,
  };
}

export function createRecommendationRunMetrics() {
  return createRunMetrics();
}

export function finalizeRecommendationRunLog(
  log: RecommendationRunLog,
  metrics: RunMetrics,
): RecommendationRunLog {
  return {
    ...log,
    cachedArtistChannels: [...metrics.cachedArtistChannels],
    handleGuessResolutions: [...metrics.handleGuessResolutions],
    searchFallbackResolutions: [...metrics.searchFallbackResolutions],
    quota: metrics.quota,
  };
}

export async function resetArtistChannelCache(artistName: string) {
  const normalized = normalizeArtistName(artistName);
  await adminDb.collection("artistChannels").doc(normalized.normalizedKey).delete();
  return normalized.normalizedKey;
}
