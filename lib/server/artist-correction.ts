import { normalizeComparableText } from "./artists";
import { getAutocorrectedArtist, searchArtists } from "./lastfm";

const ARTIST_CORRECTION_MODAL_THRESHOLD = 0.9;
const ARTIST_CORRECTION_MIN_MATCH_THRESHOLD = 0.74;

function listenerStrength(listeners: number) {
  if (listeners <= 0) {
    return 0;
  }

  return Math.min(1, Math.log10(listeners + 1) / 7);
}

function hasSeparator(value: string) {
  return /[,&/+]| feat\.?| with | x /i.test(value);
}

function candidateScore(params: {
  normalizedInput: string;
  candidateName: string;
  listeners: number;
  isAutocorrect: boolean;
}) {
  const normalizedCandidate = normalizeComparableText(params.candidateName);
  const similarityScore = similarity(params.normalizedInput, normalizedCandidate);
  const exactNormalizedMatch = normalizedCandidate === params.normalizedInput;
  const popularityScore = listenerStrength(params.listeners);
  const separatorPenalty = hasSeparator(params.candidateName) ? 0.18 : 0;
  const typoEchoPenalty =
    exactNormalizedMatch && params.listeners > 0 && params.listeners < 10_000 ? 0.18 : 0;
  const score =
    similarityScore * 0.72 +
    popularityScore * 0.24 +
    (params.isAutocorrect ? 0.12 : 0) -
    separatorPenalty -
    typoEchoPenalty;

  return {
    normalizedCandidate,
    similarityScore,
    popularityScore,
    exactNormalizedMatch,
    score,
  };
}

function levenshteinDistance(left: string, right: string) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    dp[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    dp[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      dp[row][col] = Math.min(
        dp[row - 1][col] + 1,
        dp[row][col - 1] + 1,
        dp[row - 1][col - 1] + cost,
      );
    }
  }

  return dp[left.length][right.length];
}

function similarity(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

export function getArtistCorrectionModalThreshold() {
  return ARTIST_CORRECTION_MODAL_THRESHOLD;
}

export async function resolveCanonicalArtistName(input: string) {
  const trimmedInput = input.trim().replace(/\s+/g, " ");
  const normalizedInput = normalizeComparableText(trimmedInput);

  if (!trimmedInput || !normalizedInput) {
    return {
      input: trimmedInput,
      canonicalName: trimmedInput,
      exactMatch: true,
      shouldConfirm: false,
      confidence: 1,
      matched: false,
    };
  }

  const [autocorrectedArtist, searchResults] = await Promise.all([
    getAutocorrectedArtist(trimmedInput),
    searchArtists(trimmedInput),
  ]);

  const rankedCandidates = [
    ...searchResults.map((candidate) => ({
      candidate: candidate.name,
      listeners: candidate.listeners,
      mbid: candidate.mbid,
      isAutocorrect: false,
    })),
    ...(autocorrectedArtist
      ? [
          {
            candidate: autocorrectedArtist.name,
            listeners: autocorrectedArtist.listeners,
            mbid: autocorrectedArtist.mbid,
            isAutocorrect: true,
          },
        ]
      : []),
  ]
    .map((candidate) => {
      const scored = candidateScore({
        normalizedInput,
        candidateName: candidate.candidate,
        listeners: candidate.listeners,
        isAutocorrect: candidate.isAutocorrect,
      });

      return {
        ...candidate,
        ...scored,
      };
    })
    .sort((left, right) => right.score - left.score);

  const bestCandidate = rankedCandidates[0];

  if (!bestCandidate) {
    return {
      input: trimmedInput,
      canonicalName: trimmedInput,
      exactMatch: false,
      shouldConfirm: false,
      confidence: 0,
      matched: false,
    };
  }

  const exactMatch =
    bestCandidate.normalizedCandidate === normalizedInput &&
    (!autocorrectedArtist ||
      normalizeComparableText(autocorrectedArtist.name) === normalizedInput ||
      bestCandidate.candidate === autocorrectedArtist.name);
  const shouldConfirm =
    !exactMatch &&
    (bestCandidate.isAutocorrect || bestCandidate.score >= ARTIST_CORRECTION_MODAL_THRESHOLD) &&
    bestCandidate.similarityScore >= ARTIST_CORRECTION_MIN_MATCH_THRESHOLD;
  const matched =
    bestCandidate.similarityScore >= ARTIST_CORRECTION_MIN_MATCH_THRESHOLD ||
    Boolean(bestCandidate.isAutocorrect);

  return {
    input: trimmedInput,
    canonicalName: bestCandidate.candidate,
    exactMatch,
    shouldConfirm,
    confidence: Math.max(
      0,
      Math.min(
        1,
        bestCandidate.isAutocorrect
          ? Math.max(bestCandidate.score, ARTIST_CORRECTION_MODAL_THRESHOLD)
          : bestCandidate.score,
      ),
    ),
    matched,
  };
}
