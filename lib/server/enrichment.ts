import { FieldValue } from "firebase-admin/firestore";

import { IS_SERVER_TEST_MODE } from "@/lib/env/server";
import { buildFavoriteArtistsSignature } from "@/lib/frequency/artist-signature";
import {
  createGuidedRecommendationIntent,
  type GuidedRecommendationIntent,
  type RecommendationIntentInput,
} from "@/lib/frequency/recommendation-intent";
import { hasGeneratedTasteSummary } from "@/lib/frequency/taste-summary";
import { getFavoriteArtistsInRecencyOrder } from "@/lib/frequency/taste-profile";
import { adminDb } from "./firebase-admin";
import { setAdminDocument } from "./firestore-write";
import {
  buildArtistGenreProfiles,
  buildGenreProfile,
  filterSimilarArtistsByGenre,
  getCachedSimilarArtists,
} from "./lastfm";
import {
  canUseOpenAIFallback,
  chooseCandidateWithOpenAI,
  logOpenAIFallbackEvent,
  type OpenAIFallbackCandidate,
} from "./openai-fallback";
import { generateTasteSummaryFromGenres } from "./taste-summary";
import {
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD,
  scoreRecommendationCandidates,
} from "./recommendation-confidence";
import {
  createRecommendationRunLog,
  createRecommendationRunMetrics,
  finalizeRecommendationRunLog,
  getBroadFallbackSongCandidates,
  getTrustedRecentSongCandidates,
  RecommendationRunLog,
  reconcileCachedArtistChannelsForSave,
  resetArtistChannelCache,
  resolveTrustedArtistChannels,
} from "./youtube";

const RECOMMENDATION_CACHE_TTL_MS = IS_SERVER_TEST_MODE
  ? 7 * 24 * 60 * 60 * 1000
  : 18 * 60 * 60 * 1000;
const RECOMMENDATION_FAILURE_BACKOFF_MS = 10 * 60 * 1000;
const OPENAI_FALLBACK_FAILURE_BACKOFF_MS = 30 * 60 * 1000;
const recommendationLocks = new Set<string>();

function logTasteEnrichmentEvent(event: string, payload: Record<string, unknown>) {
  console.log("[frequency][taste-summary-flow]", {
    event,
    ...payload,
  });
}

type RecommendationReason = "missing" | "stale" | "artistsChanged" | "manual" | "none";
type RecommendationOutcome =
  | "cache_hit_fresh"
  | "cache_hit_stale_allowed"
  | "cache_miss"
  | "cache_invalid_shape"
  | "generation_locked_existing"
  | "generation_started"
  | "generation_completed"
  | "generation_failed"
  | "youtube_lookup_skipped_cache_only";

type RecommendationGuardResult = {
  outcome: RecommendationOutcome;
  reasonForGeneration: RecommendationReason;
  cacheHit: boolean;
  cachedSuggestion: Record<string, unknown> | null;
  shouldGenerate: boolean;
  skipYouTube: boolean;
  lockKey: string;
  generationBlockedByLock: boolean;
  failureBackoffActive: boolean;
};

function getRecommendationCacheEntry(
  recommendationCache: Record<string, unknown> | null | undefined,
  intentKey: string | null,
) {
  if (!recommendationCache || !intentKey) {
    return null;
  }

  const value = recommendationCache[intentKey];
  return isValidCachedRecommendation(value) ? value : null;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }

  return copy;
}

function looksLikeCollaboratorOrRemix(title: string) {
  return /\b(remix|feat\.?|ft\.?|with)\b/i.test(title);
}

function resolveRecommendationPath(
  artist: string,
  title: string,
  seedArtist: string | null,
  expansionSource: "seed-artist" | "similar-artist-expansion",
) {
  if (expansionSource === "similar-artist-expansion") {
    return "similar-artist-expansion" as const;
  }

  if (seedArtist && artist === seedArtist && looksLikeCollaboratorOrRemix(title)) {
    return "collaborator-remix-path" as const;
  }

  return "seed-artist" as const;
}

function logRecommendationOrigin(
  uid: string,
  candidate:
    | {
        artist: string;
        videoId: string;
        recommendationPath?: "seed-artist" | "collaborator-remix-path" | "similar-artist-expansion";
      }
    | null
    | undefined,
) {
  if (process.env.NODE_ENV !== "development" || !candidate) {
    return;
  }

  console.log("[frequency][recommendation-origin]", {
    uid,
    artist: candidate.artist,
    videoId: candidate.videoId,
    recommendationPath: candidate.recommendationPath ?? "seed-artist",
  });
}

async function buildArtistPool(
  favoriteArtists: string[],
  intent: GuidedRecommendationIntent,
) {
  const seedArtist = intent.artistSeed ?? favoriteArtists[0] ?? null;
  if (!seedArtist) {
    return favoriteArtists.slice(0, IS_SERVER_TEST_MODE ? 1 : 3).map((artist, index) => ({
      artist,
      poolWeight: Math.max(0.4, 1 - index * 0.12),
      expansionSource: "seed-artist" as const,
    }));
  }

  if (intent.discoveryMode === "familiar") {
    return [{ artist: seedArtist, poolWeight: 1, expansionSource: "seed-artist" as const }];
  }

  const similarArtists = filterSimilarArtistsByGenre(
    await getCachedSimilarArtists(seedArtist),
    intent.genreSeed,
  );
  const similarLimit = intent.discoveryMode === "explore" ? 8 : 4;
  const expandedArtists = similarArtists.slice(0, similarLimit).map((entry, index) => ({
    artist: entry.artistName,
    poolWeight: Math.max(0.28, Math.min(0.92, entry.relevance * 0.85 - index * 0.03)),
    expansionSource: "similar-artist-expansion" as const,
  }));

  return [
    { artist: seedArtist, poolWeight: 1, expansionSource: "seed-artist" as const },
    ...expandedArtists,
  ];
}

async function buildSongRecommendation(
  uid: string,
  favoriteArtists: string[],
  intent: GuidedRecommendationIntent,
  openAIFallbackFailedAt: { toMillis?: () => number } | null | undefined,
  runLog: RecommendationRunLog,
) {
  const metrics = createRecommendationRunMetrics();
  const ambiguousCandidates: OpenAIFallbackCandidate[] = [];
  const seedArtist = intent.artistSeed ?? favoriteArtists[0] ?? null;
  const sampledArtists = await (async () => {
    const seededArtists = await buildArtistPool(favoriteArtists, intent);
    const discoverySampleSize =
      intent.discoveryMode === "familiar" ? 1 : intent.discoveryMode === "blend" ? 4 : 6;
    const seedArtist = seededArtists[0] ?? null;
    const remainingArtists = seedArtist ? seededArtists.slice(1) : seededArtists;
    const sampleLimit = Math.min(seededArtists.length, IS_SERVER_TEST_MODE ? 1 : discoverySampleSize);
    const shuffledArtists = [
      ...(seedArtist ? [seedArtist] : []),
      ...shuffle(remainingArtists).slice(0, Math.max(0, sampleLimit - (seedArtist ? 1 : 0))),
    ];
    const resolved: Array<{ artist: string; resolved: boolean }> = await Promise.all(
      shuffledArtists.map(async (artist) => {
        try {
          const channels = await resolveTrustedArtistChannels(artist.artist, metrics);
          return { artist: artist.artist, resolved: channels.length > 0 };
        } catch {
          return { artist: artist.artist, resolved: false };
        }
      }),
    );
    const rankedArtists = shuffledArtists
      .map((entry) => ({
        ...entry,
        resolved: resolved.find((resolvedEntry) => resolvedEntry.artist === entry.artist)?.resolved ?? false,
      }))
      .sort(
        (left, right) =>
          Number(right.resolved) - Number(left.resolved) || right.poolWeight - left.poolWeight,
      );

    return rankedArtists.slice(0, Math.min(rankedArtists.length, IS_SERVER_TEST_MODE ? 1 : discoverySampleSize));
  })();
  runLog.sampledArtists = sampledArtists.map((entry) => entry.artist);

  for (const artistEntry of sampledArtists) {
    const trustedCandidates = (await getTrustedRecentSongCandidates(artistEntry.artist, metrics, intent)).map(
      (candidate) => ({
        ...candidate,
        artistPoolWeight: artistEntry.poolWeight,
        recommendationPath: resolveRecommendationPath(
          candidate.artist,
          candidate.title,
          seedArtist,
          artistEntry.expansionSource,
        ),
      }),
    );
    const confidenceResult = scoreRecommendationCandidates(
      {
        artistNames: [artistEntry.artist],
        genreSeed: intent.genreSeed,
        discoveryMode: intent.discoveryMode,
      },
      trustedCandidates,
    );
    if (
      confidenceResult.selectedCandidate &&
      confidenceResult.confidenceScore >= HIGH_CONFIDENCE_THRESHOLD
    ) {
      logOpenAIFallbackEvent("openai_fallback_bypassed_high_confidence", {
        uid,
        artist: artistEntry.artist,
        videoId: confidenceResult.selectedCandidate.videoId,
      });
      const winner = confidenceResult.selectedCandidate;
      logRecommendationOrigin(uid, winner);
      return {
        recommendation: {
          artist: winner.artist,
          title: winner.title,
          videoId: winner.videoId,
          thumbnail: winner.thumbnail,
          publishedAt: winner.publishedAt,
          source: "trusted-channel" as const,
          channelId: winner.channelId,
          channelTitle: winner.channelTitle,
          channelRole: winner.channelRole,
          recommendationMode: "song" as const,
          refreshedAt: FieldValue.serverTimestamp(),
          selectionMethod: "deterministic" as const,
          confidenceScore: confidenceResult.confidenceScore,
          confidenceTier: confidenceResult.confidenceTier,
          confidenceReasons: confidenceResult.confidenceReasons,
          resolutionSource: "deterministic" as const,
          resolvedAt: FieldValue.serverTimestamp(),
          intentKey: intent.intentKey,
          artistSeed: intent.artistSeed,
          genreSeed: intent.genreSeed,
          discoveryMode: intent.discoveryMode,
          recommendationPath: winner.recommendationPath,
        },
        runLog: finalizeRecommendationRunLog(runLog, metrics),
      };
    }

    if (
      confidenceResult.selectedCandidate &&
      confidenceResult.confidenceScore >= MEDIUM_CONFIDENCE_THRESHOLD &&
      !confidenceResult.ambiguous &&
      confidenceResult.selectedCandidate.source === "trusted-channel"
    ) {
      logRecommendationOrigin(uid, confidenceResult.selectedCandidate);
      const trustedWinner = confidenceResult.selectedCandidate;
      return {
        recommendation: {
          artist: trustedWinner.artist,
          title: trustedWinner.title,
          videoId: trustedWinner.videoId,
          thumbnail: trustedWinner.thumbnail,
          publishedAt: trustedWinner.publishedAt,
          source: "trusted-channel" as const,
          channelId: trustedWinner.channelId,
          channelTitle: trustedWinner.channelTitle,
          channelRole: trustedWinner.channelRole,
          recommendationMode: "song" as const,
          refreshedAt: FieldValue.serverTimestamp(),
          selectionMethod: "deterministic" as const,
          confidenceScore: confidenceResult.confidenceScore,
          confidenceTier: confidenceResult.confidenceTier,
          confidenceReasons: confidenceResult.confidenceReasons,
          resolutionSource: "deterministic" as const,
          resolvedAt: FieldValue.serverTimestamp(),
          intentKey: intent.intentKey,
          artistSeed: intent.artistSeed,
          genreSeed: intent.genreSeed,
          discoveryMode: intent.discoveryMode,
          recommendationPath: trustedWinner.recommendationPath,
        },
        runLog: finalizeRecommendationRunLog(runLog, metrics),
      };
    }

    if (confidenceResult.selectedCandidate) {
      ambiguousCandidates.push(...confidenceResult.rankedCandidates.slice(0, 4));
    }
  }

  for (const artistEntry of sampledArtists) {
    const broadFallbackCandidates = (
      await getBroadFallbackSongCandidates(artistEntry.artist, metrics, intent)
    ).map((candidate) => ({
      ...candidate,
      artistPoolWeight: artistEntry.poolWeight,
      recommendationPath: resolveRecommendationPath(
        candidate.artist,
        candidate.title,
        seedArtist,
        artistEntry.expansionSource,
      ),
    }));
    const confidenceResult = scoreRecommendationCandidates(
      {
        artistNames: [artistEntry.artist],
        genreSeed: intent.genreSeed,
        discoveryMode: intent.discoveryMode,
      },
      broadFallbackCandidates,
    );
    if (
      confidenceResult.selectedCandidate &&
      confidenceResult.confidenceScore >= HIGH_CONFIDENCE_THRESHOLD
    ) {
      logOpenAIFallbackEvent("openai_fallback_bypassed_high_confidence", {
        uid,
        artist: artistEntry.artist,
        videoId: confidenceResult.selectedCandidate.videoId,
      });
      const broadFallback = confidenceResult.selectedCandidate;
      logRecommendationOrigin(uid, broadFallback);
      return {
        recommendation: {
          artist: broadFallback.artist,
          title: broadFallback.title,
          videoId: broadFallback.videoId,
          thumbnail: broadFallback.thumbnail,
          publishedAt: broadFallback.publishedAt,
          source: "broad-fallback" as const,
          channelId: broadFallback.channelId,
          channelTitle: broadFallback.channelTitle,
          recommendationMode: "song" as const,
          refreshedAt: FieldValue.serverTimestamp(),
          selectionMethod: "deterministic" as const,
          confidenceScore: confidenceResult.confidenceScore,
          confidenceTier: confidenceResult.confidenceTier,
          confidenceReasons: confidenceResult.confidenceReasons,
          resolutionSource: "deterministic" as const,
          resolvedAt: FieldValue.serverTimestamp(),
          intentKey: intent.intentKey,
          artistSeed: intent.artistSeed,
          genreSeed: intent.genreSeed,
          discoveryMode: intent.discoveryMode,
          recommendationPath: broadFallback.recommendationPath,
        },
        runLog: finalizeRecommendationRunLog(runLog, metrics),
      };
    }

    if (confidenceResult.selectedCandidate) {
      ambiguousCandidates.push(...confidenceResult.rankedCandidates.slice(0, 4));
    }
  }

  const openAIFallbackFailedRecently =
    Boolean(openAIFallbackFailedAt?.toMillis?.()) &&
    Date.now() - (openAIFallbackFailedAt?.toMillis?.() ?? 0) < OPENAI_FALLBACK_FAILURE_BACKOFF_MS;

  if (ambiguousCandidates.length) {
    const dedupedCandidates = ambiguousCandidates
      .filter((candidate, index, all) => all.findIndex((entry) => entry.videoId === candidate.videoId) === index)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);
    const fallbackConfidence = scoreRecommendationCandidates(
      {
        artistNames: sampledArtists.map((entry) => entry.artist),
        genreSeed: intent.genreSeed,
        discoveryMode: intent.discoveryMode,
      },
      dedupedCandidates,
    );

    if (!canUseOpenAIFallback()) {
      logOpenAIFallbackEvent("openai_fallback_failed", {
        uid,
        reason: "missing_api_key",
      });
    } else if (openAIFallbackFailedRecently) {
      logOpenAIFallbackEvent("openai_fallback_failed", {
        uid,
        reason: "backoff_active",
      });
    } else if (
      fallbackConfidence.selectedCandidate &&
      fallbackConfidence.confidenceScore >= MEDIUM_CONFIDENCE_THRESHOLD &&
      !fallbackConfidence.ambiguous
    ) {
      logOpenAIFallbackEvent("openai_fallback_bypassed_high_confidence", {
        uid,
        videoId: fallbackConfidence.selectedCandidate.videoId,
        confidenceScore: fallbackConfidence.confidenceScore,
      });
      logRecommendationOrigin(uid, fallbackConfidence.selectedCandidate);
      return {
        recommendation: {
          artist: fallbackConfidence.selectedCandidate.artist,
          title: fallbackConfidence.selectedCandidate.title,
          videoId: fallbackConfidence.selectedCandidate.videoId,
          thumbnail: fallbackConfidence.selectedCandidate.thumbnail,
          publishedAt: fallbackConfidence.selectedCandidate.publishedAt,
          source: fallbackConfidence.selectedCandidate.source,
          channelId: fallbackConfidence.selectedCandidate.channelId,
          channelTitle: fallbackConfidence.selectedCandidate.channelTitle,
          channelRole: fallbackConfidence.selectedCandidate.channelRole,
          recommendationMode: "song" as const,
          refreshedAt: FieldValue.serverTimestamp(),
          selectionMethod: "deterministic" as const,
          confidenceScore: fallbackConfidence.confidenceScore,
          confidenceTier: fallbackConfidence.confidenceTier,
          confidenceReasons: fallbackConfidence.confidenceReasons,
          resolutionSource: "deterministic" as const,
          resolvedAt: FieldValue.serverTimestamp(),
          intentKey: intent.intentKey,
          artistSeed: intent.artistSeed,
          genreSeed: intent.genreSeed,
          discoveryMode: intent.discoveryMode,
          recommendationPath: fallbackConfidence.selectedCandidate.recommendationPath,
        },
        runLog: finalizeRecommendationRunLog(runLog, metrics),
      };
    } else {
      const selectedCandidate = await chooseCandidateWithOpenAI({
        uid,
        artistNames: sampledArtists.map((entry) => entry.artist),
        candidates: fallbackConfidence.rankedCandidates,
      });

      logOpenAIFallbackEvent("openai_fallback_cached", {
        uid,
        videoId: selectedCandidate.videoId,
      });
      logRecommendationOrigin(uid, selectedCandidate);

      return {
        recommendation: {
          artist: selectedCandidate.artist,
          title: selectedCandidate.title,
          videoId: selectedCandidate.videoId,
          thumbnail: selectedCandidate.thumbnail,
          publishedAt: selectedCandidate.publishedAt,
          source: selectedCandidate.source,
          channelId: selectedCandidate.channelId,
          channelTitle: selectedCandidate.channelTitle,
          channelRole: selectedCandidate.channelRole,
          recommendationMode: "song" as const,
          refreshedAt: FieldValue.serverTimestamp(),
          selectionMethod: "openai-fallback" as const,
          confidenceScore: selectedCandidate.confidenceScore,
          confidenceTier: selectedCandidate.confidenceTier,
          confidenceReasons: selectedCandidate.confidenceReasons,
          resolutionSource: "openai_fallback" as const,
          resolvedAt: FieldValue.serverTimestamp(),
          intentKey: intent.intentKey,
          artistSeed: intent.artistSeed,
          genreSeed: intent.genreSeed,
          discoveryMode: intent.discoveryMode,
          recommendationPath: selectedCandidate.recommendationPath,
        },
        runLog: finalizeRecommendationRunLog(runLog, metrics),
      };
    }
  }

  return { recommendation: null, runLog: finalizeRecommendationRunLog(runLog, metrics) };
}

function logRecommendationRun(uid: string, log: RecommendationRunLog) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][recommendation]", {
    uid,
    testMode: log.testMode,
    usedCachedRecommendation: log.usedCachedRecommendation,
    cachedArtistChannels: log.cachedArtistChannels,
    handleGuessResolutions: log.handleGuessResolutions,
    searchFallbackResolutions: log.searchFallbackResolutions,
    sampledArtists: log.sampledArtists,
    youtubeCallsThisRun: log.quota.channels + log.quota.playlistItems + log.quota.videos + log.quota.search,
    searchCallsThisRun: log.quota.search,
    estimatedQuotaCostThisRun: log.quota.total,
    quota: log.quota,
    outcome: (log as RecommendationRunLog & { outcome?: RecommendationOutcome }).outcome ?? null,
    reasonForGeneration: (log as RecommendationRunLog & { reasonForGeneration?: RecommendationReason })
      .reasonForGeneration ?? "none",
    cacheHit: (log as RecommendationRunLog & { cacheHit?: boolean }).cacheHit ?? false,
    failureBackoffActive:
      (log as RecommendationRunLog & { failureBackoffActive?: boolean }).failureBackoffActive ?? false,
  });
}

function isValidCachedRecommendation(value: unknown): value is {
  artist: string;
  title: string;
  videoId: string;
  thumbnail: string | null;
  confidenceTier?: "high" | "medium" | "low";
  resolutionSource?: "deterministic" | "openai_fallback";
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.artist === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.videoId === "string" &&
    candidate.videoId.length > 0 &&
    ("thumbnail" in candidate ? typeof candidate.thumbnail === "string" || candidate.thumbnail === null : true) &&
    ("confidenceTier" in candidate
      ? candidate.confidenceTier === "high" ||
        candidate.confidenceTier === "medium" ||
        candidate.confidenceTier === "low"
      : true) &&
    ("resolutionSource" in candidate
      ? candidate.resolutionSource === "deterministic" || candidate.resolutionSource === "openai_fallback"
      : true)
  );
}

function hasAcceptableCachedConfidence(value: unknown) {
  if (!isValidCachedRecommendation(value)) {
    return false;
  }

  return (
    (value.resolutionSource === "deterministic" && value.confidenceTier === "high") ||
    value.resolutionSource === "openai_fallback"
  );
}

function buildLockKey(uid: string, favoriteArtistsSignature: string) {
  return `${uid}:${favoriteArtistsSignature}`;
}

function evaluateRecommendationGuard(params: {
  uid: string;
  favoriteArtistsSignature: string;
  favoriteArtistsChanged: boolean;
  forceRecommendation?: boolean;
  recommendationStatus?: "idle" | "loading" | "ready" | "error";
  recommendationExpiresAt?: { toMillis?: () => number } | null;
  recommendationFailedAt?: { toMillis?: () => number } | null;
  homeSuggestion?: unknown;
}): RecommendationGuardResult {
  const lockKey = buildLockKey(params.uid, params.favoriteArtistsSignature);
  const hasValidCachedSuggestion = isValidCachedRecommendation(params.homeSuggestion);
  const hasAcceptableConfidence = hasAcceptableCachedConfidence(params.homeSuggestion);
  const now = Date.now();
  const expiresAt = params.recommendationExpiresAt?.toMillis?.() ?? null;
  const failedAt = params.recommendationFailedAt?.toMillis?.() ?? null;
  const failureBackoffActive = Boolean(
    !params.forceRecommendation &&
      failedAt &&
      now - failedAt < RECOMMENDATION_FAILURE_BACKOFF_MS,
  );
  const cacheFresh = Boolean(hasValidCachedSuggestion && expiresAt && expiresAt > now);
  const cacheStale = Boolean(hasValidCachedSuggestion && expiresAt && expiresAt <= now);
  const generationBlockedByLock = recommendationLocks.has(lockKey);

  if (params.forceRecommendation) {
    if (generationBlockedByLock) {
      return {
        outcome: "generation_locked_existing",
        reasonForGeneration: "manual",
        cacheHit: hasValidCachedSuggestion,
        cachedSuggestion: hasValidCachedSuggestion ? (params.homeSuggestion as Record<string, unknown>) : null,
        shouldGenerate: false,
        skipYouTube: true,
        lockKey,
        generationBlockedByLock: true,
        failureBackoffActive,
      };
    }

    return {
      outcome: hasValidCachedSuggestion ? "cache_hit_stale_allowed" : "cache_miss",
      reasonForGeneration: "manual",
      cacheHit: false,
      cachedSuggestion: hasValidCachedSuggestion ? (params.homeSuggestion as Record<string, unknown>) : null,
      shouldGenerate: true,
      skipYouTube: false,
      lockKey,
      generationBlockedByLock: false,
      failureBackoffActive,
    };
  }

  if (hasValidCachedSuggestion && hasAcceptableConfidence && cacheFresh) {
    return {
      outcome: "cache_hit_fresh",
      reasonForGeneration: "none",
      cacheHit: true,
      cachedSuggestion: params.homeSuggestion as Record<string, unknown>,
      shouldGenerate: false,
      skipYouTube: true,
      lockKey,
      generationBlockedByLock,
      failureBackoffActive,
    };
  }

  if (params.homeSuggestion && !hasValidCachedSuggestion) {
    return {
      outcome: "cache_invalid_shape",
      reasonForGeneration: "missing",
      cacheHit: false,
      cachedSuggestion: null,
      shouldGenerate: !generationBlockedByLock,
      skipYouTube: generationBlockedByLock,
      lockKey,
      generationBlockedByLock,
      failureBackoffActive,
    };
  }

  if (params.favoriteArtistsChanged) {
    return {
      outcome: "cache_miss",
      reasonForGeneration: "artistsChanged",
      cacheHit: false,
      cachedSuggestion: hasValidCachedSuggestion ? (params.homeSuggestion as Record<string, unknown>) : null,
      shouldGenerate: !generationBlockedByLock,
      skipYouTube: generationBlockedByLock,
      lockKey,
      generationBlockedByLock,
      failureBackoffActive,
    };
  }

  if (
    hasValidCachedSuggestion &&
    cacheStale &&
    hasAcceptableConfidence &&
    (failureBackoffActive || generationBlockedByLock || params.recommendationStatus === "loading")
  ) {
    return {
      outcome: generationBlockedByLock ? "generation_locked_existing" : "cache_hit_stale_allowed",
      reasonForGeneration: "stale",
      cacheHit: true,
      cachedSuggestion: params.homeSuggestion as Record<string, unknown>,
      shouldGenerate: false,
      skipYouTube: true,
      lockKey,
      generationBlockedByLock,
      failureBackoffActive,
    };
  }

  if (cacheStale) {
    return {
      outcome: "cache_miss",
      reasonForGeneration: "stale",
      cacheHit: false,
      cachedSuggestion: params.homeSuggestion as Record<string, unknown>,
      shouldGenerate: !generationBlockedByLock,
      skipYouTube: generationBlockedByLock,
      lockKey,
      generationBlockedByLock,
      failureBackoffActive,
    };
  }

  return {
    outcome: generationBlockedByLock ? "generation_locked_existing" : "cache_miss",
    reasonForGeneration: "missing",
    cacheHit: false,
    cachedSuggestion: null,
    shouldGenerate: !generationBlockedByLock && !failureBackoffActive,
    skipYouTube: generationBlockedByLock || failureBackoffActive,
    lockKey,
    generationBlockedByLock,
    failureBackoffActive,
  };
}

export async function resetUserRecommendationCache(uid: string) {
  await setAdminDocument(
    adminDb.collection("users").doc(uid),
    {
      homeSuggestion: null,
      activeRecommendationIntent: null,
      recommendationCache: {},
      recommendationStatus: "idle",
      recommendationError: null,
      recommendationExpiresAt: null,
      recommendationFailedAt: null,
      openAIFallbackFailedAt: null,
    },
    { merge: true },
    {
      triggerReason: "reset_user_recommendation_cache",
      userId: uid,
    },
  );
}

export async function resetRecommendationCaches(options: { uid?: string; artistName?: string }) {
  const result: { resetUser?: string; resetArtist?: string } = {};

  if (options.uid) {
    await resetUserRecommendationCache(options.uid);
    result.resetUser = options.uid;
  }

  if (options.artistName) {
    result.resetArtist = await resetArtistChannelCache(options.artistName);
  }

  return result;
}

export async function enrichUserTaste(
  uid: string,
  options?: {
    forceRecommendation?: boolean;
    resolveRecommendation?: boolean;
    recommendationIntent?: RecommendationIntentInput;
  },
) {
  if (recommendationLocks.has(uid)) {
    if (process.env.NODE_ENV === "development") {
      console.log("[frequency][recommendation]", {
        uid,
        cacheHit: false,
        reasonForGeneration: "none",
        skipped: "already-loading-lock",
        youtubeCallsThisRun: 0,
        searchCallsThisRun: 0,
        estimatedQuotaCostThisRun: 0,
      });
    }

    const lockedSnapshot = await adminDb.collection("users").doc(uid).get();
    return lockedSnapshot.data() ?? null;
  }

  const userRef = adminDb.collection("users").doc(uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new Error("User profile not found");
  }

  const user = snapshot.data() as {
    favoriteArtists?: string[];
    favoriteArtistEntries?: { artist?: string; addedAt?: string }[];
    favoriteArtistsSignature?: string | null;
    homeSuggestion?: unknown;
    activeRecommendationIntent?: GuidedRecommendationIntent | null;
    recommendationCache?: Record<string, unknown>;
    recommendationEmptyStateReason?: "artists_updated" | null;
    recommendationExpiresAt?: { toMillis?: () => number } | null;
    recommendationFailedAt?: { toMillis?: () => number } | null;
    openAIFallbackFailedAt?: { toMillis?: () => number } | null;
    recommendationStatus?: "idle" | "loading" | "ready" | "error";
    tasteSummary?: {
      overview?: string | null;
      headline?: string | null;
      subheadline?: string | null;
      generatedAt?: unknown;
    } | null;
  };
  const favoriteArtists = getFavoriteArtistsInRecencyOrder(
    (user.favoriteArtists ?? []).map((artist) => artist.trim()).filter(Boolean),
    (user.favoriteArtistEntries ?? [])
      .filter(
        (entry): entry is { artist: string; addedAt: string } =>
          typeof entry?.artist === "string" && typeof entry?.addedAt === "string",
      )
      .map((entry) => ({
        artist: entry.artist,
        addedAt: entry.addedAt,
      })),
  );
  const favoriteArtistsSignature = buildFavoriteArtistsSignature(favoriteArtists);
  const existingTasteSummary = user.tasteSummary
    ? {
        overview: user.tasteSummary.overview ?? null,
        headline: user.tasteSummary.headline ?? null,
        subheadline: user.tasteSummary.subheadline ?? null,
        generatedAt: user.tasteSummary.generatedAt,
      }
    : null;
  logTasteEnrichmentEvent("enrichment_loaded_profile", {
    uid,
    favoriteArtistsCount: favoriteArtists.length,
    favoriteArtistsSignature,
    existingTasteSummaryOverview: existingTasteSummary?.overview ?? null,
    hasGeneratedTasteSummary: hasGeneratedTasteSummary(existingTasteSummary),
  });
  const shouldResolveRecommendation = Boolean(
    options?.resolveRecommendation || options?.forceRecommendation || options?.recommendationIntent,
  );
  const manualRecommendationRequest = Boolean(
    options?.forceRecommendation || options?.resolveRecommendation || options?.recommendationIntent,
  );
  const recommendationIntent = shouldResolveRecommendation
    ? createGuidedRecommendationIntent(
        options?.recommendationIntent ?? user.activeRecommendationIntent ?? null,
      )
    : null;

  if (!favoriteArtists.length) {
    logTasteEnrichmentEvent("enrichment_no_artists", {
      uid,
    });
    await setAdminDocument(
      userRef,
      {
        genreProfile: [],
        artistGenreProfiles: [],
        tasteSummary: null,
        homeSuggestion: null,
        activeRecommendationIntent: null,
      recommendationCache: {},
      enrichmentStatus: "idle",
      enrichmentError: null,
      lastEnrichedAt: FieldValue.serverTimestamp(),
      recommendationEmptyStateReason: null,
      recommendationStatus: "idle",
        recommendationError: null,
        recommendationExpiresAt: null,
        recommendationFailedAt: null,
        openAIFallbackFailedAt: null,
      },
      { merge: true },
      {
        triggerReason: "enrich_user_taste_no_artists",
        userId: uid,
      },
    );

    return { genreProfile: [], homeSuggestion: null, tasteSummary: null };
  }

  let genreProfile: Array<{ tag: string; weight: number }> = [];
  let artistGenreProfiles: Array<{ artist: string; tags: string[] }> = [];
  let tasteSummary:
    | {
        overview: string | null;
        headline?: string | null;
        subheadline?: string | null;
        generatedAt?: unknown;
      }
    | null = existingTasteSummary;
  let homeSuggestion = null;
  let enrichmentStatus: "ready" | "error" = "ready";
  let enrichmentError: string | null = null;
  let recommendationStatus: "ready" | "error" = "ready";
  let recommendationError: string | null = null;
  let finalOutcome: RecommendationOutcome;
  const runLog = createRecommendationRunLog() as RecommendationRunLog & {
    outcome?: RecommendationOutcome;
    reasonForGeneration?: RecommendationReason;
    cacheHit?: boolean;
    failureBackoffActive?: boolean;
  };

  try {
    genreProfile = await buildGenreProfile(favoriteArtists);
    artistGenreProfiles = await buildArtistGenreProfiles(favoriteArtists);
    logTasteEnrichmentEvent("enrichment_genres_built", {
      uid,
      genreCount: genreProfile.length,
      genres: genreProfile.map((genre) => ({
        name: genre.tag,
        weight: genre.weight,
      })),
    });
  } catch (error) {
    enrichmentStatus = "error";
    enrichmentError = error instanceof Error ? error.message : "Taste enrichment failed.";
    logTasteEnrichmentEvent("enrichment_genres_failed", {
      uid,
      error: enrichmentError,
    });
  }

  const shouldRefreshTasteSummary =
    (user.favoriteArtistsSignature ?? null) !== favoriteArtistsSignature ||
    !hasGeneratedTasteSummary(existingTasteSummary);

  logTasteEnrichmentEvent("taste_summary_refresh_evaluated", {
    uid,
    shouldRefreshTasteSummary,
    favoriteArtistsChanged: (user.favoriteArtistsSignature ?? null) !== favoriteArtistsSignature,
    hasGeneratedTasteSummary: hasGeneratedTasteSummary(existingTasteSummary),
    existingTasteSummaryOverview: existingTasteSummary?.overview ?? null,
    genreCount: genreProfile.length,
  });

  if (shouldRefreshTasteSummary) {
    logTasteEnrichmentEvent("taste_summary_generation_triggered", {
      uid,
      genres: genreProfile.map((genre) => ({
        name: genre.tag,
        weight: genre.weight,
      })),
    });
    const generatedTasteSummary = await generateTasteSummaryFromGenres({
      uid,
      genres: genreProfile.map((genre) => ({
        name: genre.tag,
        weight: genre.weight,
      })),
    });

    if (generatedTasteSummary.source === "openai") {
      tasteSummary = {
        overview: generatedTasteSummary.overview,
        generatedAt: FieldValue.serverTimestamp(),
      };
      logTasteEnrichmentEvent("taste_summary_cache_update", {
        uid,
        source: generatedTasteSummary.source,
        overview: generatedTasteSummary.overview,
      });
    } else {
      tasteSummary = null;
      logTasteEnrichmentEvent("taste_summary_cache_skipped", {
        uid,
        source: generatedTasteSummary.source,
        fallbackReason: generatedTasteSummary.fallbackReason ?? null,
      });
    }
  }

  if (!shouldResolveRecommendation) {
    await Promise.all(
      favoriteArtists.map((artist) =>
        reconcileCachedArtistChannelsForSave(artist).catch(() => {
          // Save Artists should stay cache-first and resilient; missing or bad channel docs can be resolved later.
        }),
      ),
    );

    const updates: Record<string, unknown> = {
      genreProfile,
      artistGenreProfiles,
      tasteSummary,
      favoriteArtistsSignature,
      enrichmentStatus,
      enrichmentError,
      lastEnrichedAt: FieldValue.serverTimestamp(),
    };

    logTasteEnrichmentEvent("taste_summary_firestore_write", {
      uid,
      overview: tasteSummary?.overview ?? null,
      triggerReason: "enrich_user_taste_genre_only",
    });

    await setAdminDocument(userRef, updates, { merge: true }, {
      triggerReason: "enrich_user_taste_genre_only",
      userId: uid,
    });

    return {
      genreProfile,
      tasteSummary,
      homeSuggestion: user.homeSuggestion ?? null,
      recommendationMeta: {
        outcome: "youtube_lookup_skipped_cache_only" as RecommendationOutcome,
        reasonForGeneration: "none" as RecommendationReason,
        generationInProgress: false,
        cacheHit: false,
      },
    };
  }

  const selectedCachedSuggestion =
    getRecommendationCacheEntry(user.recommendationCache, recommendationIntent?.intentKey ?? null) ??
    (recommendationIntent?.intentKey ===
    ((user.homeSuggestion as { intentKey?: string } | null | undefined)?.intentKey ?? null)
      ? (user.homeSuggestion as Record<string, unknown> | null | undefined) ?? null
      : null);

  const guard = evaluateRecommendationGuard({
    uid,
    favoriteArtistsSignature,
    favoriteArtistsChanged: (user.favoriteArtistsSignature ?? null) !== favoriteArtistsSignature,
    forceRecommendation: manualRecommendationRequest,
    recommendationStatus: user.recommendationStatus,
    recommendationExpiresAt: user.recommendationExpiresAt,
    recommendationFailedAt: user.recommendationFailedAt,
    homeSuggestion: selectedCachedSuggestion,
  });
  const resolvedRecommendationIntent = recommendationIntent;

  runLog.outcome = guard.outcome;
  runLog.reasonForGeneration = guard.reasonForGeneration;
  runLog.cacheHit = guard.cacheHit;
  runLog.failureBackoffActive = guard.failureBackoffActive;
  finalOutcome = guard.outcome;

  if (guard.cacheHit && guard.cachedSuggestion) {
    logOpenAIFallbackEvent("openai_fallback_skipped_cache_hit", {
      uid,
    });
    homeSuggestion = guard.cachedSuggestion;
    runLog.usedCachedRecommendation = true;
    if (
      recommendationIntent &&
      ((user.homeSuggestion as { intentKey?: string } | null | undefined)?.intentKey ?? null) !==
        recommendationIntent.intentKey
    ) {
      await setAdminDocument(
        userRef,
        {
          homeSuggestion: guard.cachedSuggestion,
          activeRecommendationIntent: recommendationIntent,
          recommendationEmptyStateReason: null,
          recommendationStatus: "ready",
          recommendationError: null,
        },
        { merge: true },
        {
          triggerReason: "recommendation_cache_reused_for_intent",
          userId: uid,
        },
      );
    }
    logRecommendationRun(uid, runLog);
    if (process.env.NODE_ENV === "development") {
      console.log("[frequency][recommendation]", {
        uid,
        outcome: "youtube_lookup_skipped_cache_only",
        reasonForGeneration: guard.reasonForGeneration,
      });
    }
  } else if (!guard.shouldGenerate) {
    homeSuggestion = guard.cachedSuggestion;
    logRecommendationRun(uid, runLog);
    if (process.env.NODE_ENV === "development") {
      console.log("[frequency][recommendation]", {
        uid,
        outcome: "youtube_lookup_skipped_cache_only",
        reasonForGeneration: guard.reasonForGeneration,
        lockKey: guard.lockKey,
      });
    }
  } else {
    recommendationLocks.add(guard.lockKey);
    runLog.outcome = "generation_started";
    finalOutcome = "generation_started";
    logRecommendationRun(uid, runLog);
    try {
      await setAdminDocument(
        userRef,
        {
          recommendationFailedAt: null,
          openAIFallbackFailedAt: null,
        },
        { merge: true },
        {
          triggerReason: "recommendation_generation_prepare",
          userId: uid,
        },
      );

      const recommendationResult = await buildSongRecommendation(
        uid,
        favoriteArtists,
        resolvedRecommendationIntent!,
        user.openAIFallbackFailedAt,
        runLog,
      );
      homeSuggestion = recommendationResult.recommendation;
      runLog.cacheHit = false;
      runLog.outcome = homeSuggestion ? "generation_completed" : "generation_failed";
      finalOutcome = runLog.outcome;
      logRecommendationRun(uid, recommendationResult.runLog as typeof runLog);
    } catch (error) {
      recommendationStatus = "error";
      recommendationError = error instanceof Error ? error.message : "Song recommendation failed.";
      runLog.outcome = "generation_failed";
      finalOutcome = "generation_failed";
      logRecommendationRun(uid, runLog);
    } finally {
      recommendationLocks.delete(guard.lockKey);
    }
  }

  if (!homeSuggestion) {
    recommendationStatus = "error";
    recommendationError =
      recommendationError ?? "No trusted playable song was found from your artist channels yet.";
  }

  const updates: Record<string, unknown> = {
    genreProfile,
    artistGenreProfiles,
    tasteSummary,
    favoriteArtistsSignature,
    enrichmentStatus,
    enrichmentError,
    lastEnrichedAt: FieldValue.serverTimestamp(),
    activeRecommendationIntent: recommendationIntent,
    recommendationEmptyStateReason: shouldResolveRecommendation ? null : user.recommendationEmptyStateReason ?? null,
    recommendationStatus,
    recommendationError,
  };

  if (homeSuggestion) {
    updates.homeSuggestion = homeSuggestion;
    updates.recommendationCache = {
      ...(user.recommendationCache ?? {}),
      [resolvedRecommendationIntent!.intentKey]: homeSuggestion,
    };
    updates.recommendationExpiresAt = new Date(Date.now() + RECOMMENDATION_CACHE_TTL_MS);
    updates.recommendationFailedAt = null;
    updates.openAIFallbackFailedAt = null;
  } else {
    updates.homeSuggestion = guard.cachedSuggestion ?? null;
    updates.recommendationExpiresAt =
      guard.cachedSuggestion && user.recommendationExpiresAt?.toMillis
        ? new Date(user.recommendationExpiresAt.toMillis())
        : null;
    updates.recommendationFailedAt = FieldValue.serverTimestamp();
    updates.openAIFallbackFailedAt = FieldValue.serverTimestamp();
  }

  await setAdminDocument(
    userRef,
    updates,
    { merge: true },
    {
      triggerReason: shouldResolveRecommendation
        ? "enrich_user_taste_with_recommendation"
        : "enrich_user_taste_genre_only",
      userId: uid,
    },
  );

  logTasteEnrichmentEvent("taste_summary_firestore_write", {
    uid,
    overview: tasteSummary?.overview ?? null,
    triggerReason: shouldResolveRecommendation
      ? "enrich_user_taste_with_recommendation"
      : "enrich_user_taste_genre_only",
  });

  return {
    genreProfile,
    tasteSummary,
    homeSuggestion,
    recommendationMeta: {
      outcome: finalOutcome,
      reasonForGeneration: guard.reasonForGeneration,
      generationInProgress: finalOutcome === "generation_locked_existing",
      cacheHit: guard.cacheHit,
    },
  };
}
