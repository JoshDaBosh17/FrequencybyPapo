import type { DiscoveryMode } from "@/lib/frequency/recommendation-intent";
import type { RecommendationCandidate } from "./youtube";

export const HIGH_CONFIDENCE_THRESHOLD = 78;
export const MEDIUM_CONFIDENCE_THRESHOLD = 58;
export const AMBIGUITY_MARGIN_THRESHOLD = 8;

type QueryIntent = {
  artistNames: string[];
  genreSeed?: string | null;
  discoveryMode?: DiscoveryMode;
};

export type ConfidenceTier = "high" | "medium" | "low";

export type CandidateScoreBreakdown = {
  label: string;
  value: number;
};

export type ScoredRecommendationCandidate = RecommendationCandidate & {
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  confidenceReasons: string[];
  scoreBreakdown: CandidateScoreBreakdown[];
};

export type RecommendationConfidenceResult = {
  rankedCandidates: ScoredRecommendationCandidate[];
  selectedCandidate: ScoredRecommendationCandidate | null;
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  confidenceReasons: string[];
  ambiguous: boolean;
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenSet(value: string) {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function hasArtistSongPattern(title: string, artistName: string) {
  const [leadingSegment = ""] = title.split(/\s*[-|–—]\s*/, 1);
  const normalizedArtist = normalize(artistName);
  const normalizedLeadingSegment = normalize(leadingSegment);

  return (
    /^\s*[^-|–—]+(?:\s*[-|–—]\s*)[^-|–—]+/.test(title) &&
    (normalizedLeadingSegment.includes(normalizedArtist) ||
      normalizedArtist.includes(normalizedLeadingSegment))
  );
}

function overlapCount(left: Set<string>, right: Set<string>) {
  let total = 0;
  for (const token of left) {
    if (right.has(token)) {
      total += 1;
    }
  }
  return total;
}

function buildTier(score: number): ConfidenceTier {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) {
    return "high";
  }

  if (score >= MEDIUM_CONFIDENCE_THRESHOLD) {
    return "medium";
  }

  return "low";
}

function factor(label: string, value: number, reasons: string[], breakdown: CandidateScoreBreakdown[]) {
  if (!value) {
    return 0;
  }

  reasons.push(`${label}: ${value > 0 ? "+" : ""}${value}`);
  breakdown.push({ label, value });
  return value;
}

function scoreCandidate(intent: QueryIntent, candidate: RecommendationCandidate): ScoredRecommendationCandidate {
  const reasons: string[] = [];
  const breakdown: CandidateScoreBreakdown[] = [];
  let score = 0;

  const artistQuery = intent.artistNames[0] ?? candidate.artist;
  const normalizedArtist = normalize(artistQuery);
  const normalizedChannel = normalize(candidate.channelTitle);
  const normalizedTitle = normalize(candidate.title);
  const queryTokens = tokenSet(artistQuery);
  const channelTokens = tokenSet(candidate.channelTitle);
  const titleTokens = tokenSet(candidate.title);
  const queryOverlap = overlapCount(queryTokens, new Set([...channelTokens, ...titleTokens]));
  const genreTokens = tokenSet(intent.genreSeed ?? "");
  const genreOverlap = overlapCount(genreTokens, new Set([...channelTokens, ...titleTokens]));
  const isRemix = /\bremix\b/i.test(candidate.title);
  const isOfficialTitle =
    normalizedTitle.includes("official audio") ||
    normalizedTitle.includes("official video") ||
    normalizedTitle.includes("official music video");
  const isOfficialVisualizer = normalizedTitle.includes("official visualizer") || normalizedTitle.includes("visualizer");
  const isOfficialLyric = normalizedTitle.includes("official lyric video") || normalizedTitle.includes("lyric video");
  const hasAudioSignal = normalizedTitle.includes("official audio") || /\baudio\b/i.test(candidate.title);
  const hasLyricsSignal = /\blyrics?\b/i.test(candidate.title);
  const hasArtistSongTitlePattern = hasArtistSongPattern(candidate.title, artistQuery);
  const artistPresentInTitle = normalizedTitle.includes(normalizedArtist);
  const isLowSignalVariant = /\bsped up|speed up|slowed|bass boosted|nightcore|8d\b/i.test(candidate.title);
  const isLiveLikeVariant = /\blive|set\b/i.test(candidate.title);
  const isCompilationLike = /\bcompilation|reupload|fan upload|edit\b/i.test(candidate.title);
  const durationSeconds = candidate.durationSeconds;
  const isValidSongDuration =
    typeof durationSeconds === "number" && durationSeconds >= 90 && durationSeconds <= 600;
  const isPreferredSongDuration =
    typeof durationSeconds === "number" && durationSeconds >= 150 && durationSeconds <= 330;

  if (normalizedChannel === normalizedArtist) {
    score += factor("artistExactMatch", 32, reasons, breakdown);
  } else if (normalizedChannel.includes(normalizedArtist)) {
    score += factor("artistNearMatch", 22, reasons, breakdown);
  } else if (queryOverlap >= Math.max(1, Math.floor(queryTokens.size / 2))) {
    score += factor("artistTokenOverlap", 16, reasons, breakdown);
  }

  if (candidate.channelRole === "official") {
    score += factor("officialChannel", 16, reasons, breakdown);
  }

  if (candidate.channelRole === "topic") {
    score += factor("topicChannel", 18, reasons, breakdown);
  }

  if (typeof candidate.artistPoolWeight === "number") {
    score += factor(
      "artistPoolWeight",
      Math.round(candidate.artistPoolWeight * 12),
      reasons,
      breakdown,
    );
  }

  if (isOfficialTitle) {
    score += factor("officialReleaseSignal", 12, reasons, breakdown);
  }

  if (hasAudioSignal) {
    score += factor("audioSignal", normalizedTitle.includes("official audio") ? 10 : 6, reasons, breakdown);
  }

  if (hasLyricsSignal) {
    score += factor("lyricsSignal", 5, reasons, breakdown);
  }

  if (isOfficialVisualizer) {
    score += factor("officialVisualizerSignal", 6, reasons, breakdown);
  }

  if (isOfficialLyric) {
    score += factor("officialLyricSignal", 5, reasons, breakdown);
  }

  if (queryOverlap >= 1) {
    score += factor("queryTokensPresent", Math.min(10, queryOverlap * 4), reasons, breakdown);
  }

  if (hasArtistSongTitlePattern) {
    score += factor("artistSongPattern", 10, reasons, breakdown);
  }

  if (genreOverlap >= 1) {
    score += factor("genreSeedAlignment", Math.min(8, genreOverlap * 4), reasons, breakdown);
  }

  if (isPreferredSongDuration) {
    score += factor("preferredSongDuration", 8, reasons, breakdown);
  } else if (isValidSongDuration) {
    score += factor("validSongDuration", 4, reasons, breakdown);
  } else if (typeof durationSeconds === "number") {
    score += factor("invalidSongDurationPenalty", -40, reasons, breakdown);
  }

  if (candidate.publishedAt) {
    const ageDays = (Date.now() - new Date(candidate.publishedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays <= 120) {
      score += factor("recentUpload", 6, reasons, breakdown);
    }
  }

  if (intent.discoveryMode === "familiar" && candidate.source === "trusted-channel") {
    score += factor("familiarTrustedChannelBias", 8, reasons, breakdown);
  }

  if (intent.discoveryMode === "familiar" && candidate.source === "broad-fallback") {
    score += factor("familiarBroadFallbackPenalty", -8, reasons, breakdown);
  }

  if (intent.discoveryMode === "blend" && candidate.source === "trusted-channel") {
    score += factor("blendTrustedChannelBias", 4, reasons, breakdown);
  }

  if (intent.discoveryMode === "explore" && candidate.source === "broad-fallback") {
    score += factor("exploreBreadthBias", 6, reasons, breakdown);
  }

  if (!isRemix && (isOfficialTitle || isOfficialVisualizer || isOfficialLyric)) {
    score += factor("originalOfficialBaseline", 8, reasons, breakdown);
  }

  if (isRemix && (candidate.channelRole === "official" || candidate.channelRole === "topic")) {
    score += factor("officialRemix", 10, reasons, breakdown);
  } else if (isRemix && queryOverlap >= 1) {
    score += factor("credibleRemix", 4, reasons, breakdown);
  } else if (isRemix && candidate.score >= 10) {
    score += factor("genreAlignedRemix", 3, reasons, breakdown);
  } else if (isRemix) {
    score += factor("lowSignalRemixPenalty", -10, reasons, breakdown);
  }

  if (isLowSignalVariant) {
    score += factor("unsupportedEditPenalty", -24, reasons, breakdown);
  }

  if (isLiveLikeVariant) {
    score += factor("liveVariantPenalty", -18, reasons, breakdown);
  }

  if (/\bextended\b/i.test(candidate.title)) {
    score += factor("extendedVersionPenalty", -8, reasons, breakdown);
  }

  if (isCompilationLike || /\bcover\b/i.test(candidate.title)) {
    score += factor("lowSignalMetadataPenalty", -16, reasons, breakdown);
  }

  if (!candidate.thumbnail) {
    score += factor("missingMetadataPenalty", -6, reasons, breakdown);
  }

  if (artistPresentInTitle) {
    score += factor("artistPresentInTitle", 12, reasons, breakdown);
  } else {
    score += factor("selectedArtistAbsent", -18, reasons, breakdown);
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const confidenceTier = buildTier(boundedScore);

  return {
    ...candidate,
    confidenceScore: boundedScore,
    confidenceTier,
    confidenceReasons: reasons,
    scoreBreakdown: breakdown,
  };
}

function logConfidenceEvent(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][confidence]", {
    event,
    ...payload,
  });
}

export function scoreRecommendationCandidates(
  queryIntent: QueryIntent,
  candidates: RecommendationCandidate[],
): RecommendationConfidenceResult {
  logConfidenceEvent("confidence_scoring_started", {
    artistNames: queryIntent.artistNames,
    candidateCount: candidates.length,
  });

  const rankedCandidates = candidates
    .map((candidate) => {
      const scored = scoreCandidate(queryIntent, candidate);
      logConfidenceEvent("confidence_candidate_scored", {
        artist: scored.artist,
        videoId: scored.videoId,
        confidenceScore: scored.confidenceScore,
        confidenceTier: scored.confidenceTier,
        scoreBreakdown: scored.scoreBreakdown,
      });
      return scored;
    })
    .sort((left, right) => right.confidenceScore - left.confidenceScore || right.score - left.score);

  const selectedCandidate = rankedCandidates[0] ?? null;
  const runnerUp = rankedCandidates[1] ?? null;
  const ambiguous = Boolean(
    selectedCandidate &&
      runnerUp &&
      selectedCandidate.confidenceScore < HIGH_CONFIDENCE_THRESHOLD &&
      selectedCandidate.confidenceScore - runnerUp.confidenceScore <= AMBIGUITY_MARGIN_THRESHOLD
  );

  if (!selectedCandidate) {
    logConfidenceEvent("confidence_no_candidate", {
      artistNames: queryIntent.artistNames,
    });

    return {
      rankedCandidates,
      selectedCandidate: null,
      confidenceScore: 0,
      confidenceTier: "low",
      confidenceReasons: [],
      ambiguous: false,
    };
  }

  if (ambiguous) {
    logConfidenceEvent("confidence_ambiguous_candidates", {
      artistNames: queryIntent.artistNames,
      topVideoId: selectedCandidate.videoId,
      runnerUpVideoId: runnerUp?.videoId ?? null,
      scoreDelta: selectedCandidate.confidenceScore - (runnerUp?.confidenceScore ?? 0),
    });
  } else if (selectedCandidate.confidenceTier === "high") {
    logConfidenceEvent("confidence_high_accept", {
      artistNames: queryIntent.artistNames,
      videoId: selectedCandidate.videoId,
      confidenceScore: selectedCandidate.confidenceScore,
      confidenceReasons: selectedCandidate.confidenceReasons,
    });
  } else if (selectedCandidate.confidenceTier === "medium") {
    logConfidenceEvent("confidence_medium_accept", {
      artistNames: queryIntent.artistNames,
      videoId: selectedCandidate.videoId,
      confidenceScore: selectedCandidate.confidenceScore,
      confidenceReasons: selectedCandidate.confidenceReasons,
    });
  } else {
    logConfidenceEvent("confidence_low_trigger_fallback", {
      artistNames: queryIntent.artistNames,
      videoId: selectedCandidate.videoId,
      confidenceScore: selectedCandidate.confidenceScore,
      confidenceReasons: selectedCandidate.confidenceReasons,
    });
  }

  return {
    rankedCandidates,
    selectedCandidate,
    confidenceScore: selectedCandidate.confidenceScore,
    confidenceTier: selectedCandidate.confidenceTier,
    confidenceReasons: selectedCandidate.confidenceReasons,
    ambiguous,
  };
}
