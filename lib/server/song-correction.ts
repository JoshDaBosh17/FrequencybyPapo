import { normalizeComparableText } from "./artists";
import { getAutocorrectedTrack, searchTracks } from "./lastfm";

const SONG_CORRECTION_MODAL_THRESHOLD = 0.86;
const SONG_CORRECTION_MIN_MATCH_THRESHOLD = 0.72;

function listenerStrength(listeners: number) {
  if (listeners <= 0) {
    return 0;
  }

  return Math.min(1, Math.log10(listeners + 1) / 7);
}

function normalizeSongTitle(value: string) {
  return normalizeComparableText(value)
    .replace(/\b(feat|ft|featuring|official|audio|video|lyrics?|visualizer|remaster(?:ed)?|live|topic)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCollaborator(value: string) {
  return /[,&/+]| feat\.?| ft\.?| featuring | with | x /i.test(value);
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

function candidateScore(params: {
  normalizedTitleInput: string;
  normalizedArtistInput: string;
  candidateTitle: string;
  candidateArtist: string;
  listeners: number;
  isAutocorrect: boolean;
}) {
  const normalizedCandidateTitle = normalizeSongTitle(params.candidateTitle);
  const normalizedCandidateArtist = normalizeComparableText(params.candidateArtist);
  const titleSimilarity = similarity(params.normalizedTitleInput, normalizedCandidateTitle);
  const artistSimilarity = similarity(params.normalizedArtistInput, normalizedCandidateArtist);
  const popularityScore = listenerStrength(params.listeners);
  const collaboratorPenalty =
    hasCollaborator(params.candidateArtist) &&
    normalizedCandidateArtist !== params.normalizedArtistInput
      ? 0.06
      : 0;
  const score =
    titleSimilarity * 0.56 +
    artistSimilarity * 0.32 +
    popularityScore * 0.12 +
    (params.isAutocorrect ? 0.08 : 0) -
    collaboratorPenalty;

  return {
    normalizedCandidateArtist,
    normalizedCandidateTitle,
    titleSimilarity,
    artistSimilarity,
    popularityScore,
    exactNormalizedMatch:
      normalizedCandidateTitle === params.normalizedTitleInput &&
      normalizedCandidateArtist === params.normalizedArtistInput,
    score,
  };
}

export async function resolveCanonicalSongEntry(title: string, artist: string) {
  const trimmedTitle = title.trim().replace(/\s+/g, " ");
  const trimmedArtist = artist.trim().replace(/\s+/g, " ");
  const normalizedTitleInput = normalizeSongTitle(trimmedTitle);
  const normalizedArtistInput = normalizeComparableText(trimmedArtist);

  if (!trimmedTitle || !trimmedArtist || !normalizedTitleInput || !normalizedArtistInput) {
    return {
      inputArtist: trimmedArtist,
      inputTitle: trimmedTitle,
      canonicalArtist: trimmedArtist,
      canonicalTitle: trimmedTitle,
      confidence: 0,
      exactMatch: false,
      matched: false,
      shouldConfirm: false,
    };
  }

  const [autocorrectedTrack, searchResults] = await Promise.all([
    getAutocorrectedTrack(trimmedArtist, trimmedTitle),
    searchTracks(trimmedTitle),
  ]);

  const rankedCandidates = [
    ...searchResults.map((candidate) => ({
      candidateArtist: candidate.artist,
      candidateTitle: candidate.name,
      isAutocorrect: false,
      listeners: candidate.listeners,
      mbid: candidate.mbid,
    })),
    ...(autocorrectedTrack
      ? [
          {
            candidateArtist: autocorrectedTrack.artist,
            candidateTitle: autocorrectedTrack.name,
            isAutocorrect: true,
            listeners: autocorrectedTrack.listeners,
            mbid: autocorrectedTrack.mbid,
          },
        ]
      : []),
  ]
    .map((candidate) => ({
      ...candidate,
      ...candidateScore({
        normalizedArtistInput,
        normalizedTitleInput,
        candidateArtist: candidate.candidateArtist,
        candidateTitle: candidate.candidateTitle,
        isAutocorrect: candidate.isAutocorrect,
        listeners: candidate.listeners,
      }),
    }))
    .sort((left, right) => right.score - left.score);

  const bestCandidate = rankedCandidates[0];
  const secondCandidate = rankedCandidates[1];

  if (!bestCandidate) {
    return {
      inputArtist: trimmedArtist,
      inputTitle: trimmedTitle,
      canonicalArtist: trimmedArtist,
      canonicalTitle: trimmedTitle,
      confidence: 0,
      exactMatch: false,
      matched: false,
      shouldConfirm: false,
    };
  }

  const exactMatch = bestCandidate.exactNormalizedMatch;
  const confidence = Math.max(
    0,
    Math.min(
      1,
      bestCandidate.isAutocorrect
        ? Math.max(bestCandidate.score, SONG_CORRECTION_MODAL_THRESHOLD)
        : bestCandidate.score,
    ),
  );
  const matched =
    exactMatch ||
    (bestCandidate.titleSimilarity >= SONG_CORRECTION_MIN_MATCH_THRESHOLD &&
      bestCandidate.artistSimilarity >= 0.52) ||
    confidence >= 0.78;
  const hasCloseSecondCandidate =
    Boolean(secondCandidate) &&
    (bestCandidate.score - (secondCandidate?.score ?? 0) < 0.05) &&
    (secondCandidate?.titleSimilarity ?? 0) >= SONG_CORRECTION_MIN_MATCH_THRESHOLD;
  const shouldConfirm =
    matched &&
    !exactMatch &&
    (confidence >= SONG_CORRECTION_MODAL_THRESHOLD ||
      bestCandidate.titleSimilarity >= 0.92 ||
      bestCandidate.artistSimilarity >= 0.82 ||
      hasCollaborator(bestCandidate.candidateArtist) ||
      hasCloseSecondCandidate);

  return {
    inputArtist: trimmedArtist,
    inputTitle: trimmedTitle,
    canonicalArtist: bestCandidate.candidateArtist,
    canonicalTitle: bestCandidate.candidateTitle,
    confidence,
    exactMatch,
    matched,
    shouldConfirm,
  };
}
