import type { TasteSummary, UserProfile } from "@/lib/types";

export const DEFAULT_TASTE_SUMMARY_OVERVIEW = "Your taste is taking shape.";

export function normalizeOverview(overview: string | null | undefined) {
  const trimmedOverview = overview?.trim();
  return trimmedOverview ? trimmedOverview : null;
}

export function isFallbackTasteSummaryOverview(overview: string | null | undefined) {
  return normalizeOverview(overview) === DEFAULT_TASTE_SUMMARY_OVERVIEW;
}

function stripWrappingQuotes(value: string) {
  return value.replace(/^["'\s]+|["'\s]+$/g, "");
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter((token) => Boolean(token) && !/^[-\u2013\u2014]+$/.test(token)).length;
}

export function normalizeGeneratedTasteSummaryOverview(
  overview: string | null | undefined,
) {
  const normalizedOverview = normalizeOverview(stripWrappingQuotes(overview ?? ""));

  if (!normalizedOverview) {
    return null;
  }

  const sentenceTerminatorMatches = normalizedOverview.match(/[.!?]+/g) ?? [];

  if (
    sentenceTerminatorMatches.length > 1 ||
    (sentenceTerminatorMatches.length === 1 && !/[.!?]+$/.test(normalizedOverview))
  ) {
    return null;
  }

  const withTerminalPunctuation = /[.!?]+$/.test(normalizedOverview)
    ? normalizedOverview
    : `${normalizedOverview}.`;
  const wordCount = countWords(withTerminalPunctuation.replace(/[.!?]+$/, ""));

  if (wordCount === 0 || wordCount > 14) {
    return null;
  }

  return withTerminalPunctuation;
}

export function getTasteSummaryOverview(
  tasteSummary: TasteSummary | null | undefined,
) {
  // This helper is the handoff point for the stored OpenAI taste summary. As the backend
  // expands into headline/subheadline fields, the hero can stay stable and read from here.
  return normalizeOverview(tasteSummary?.overview) ?? DEFAULT_TASTE_SUMMARY_OVERVIEW;
}

export function hasGeneratedTasteSummary(
  tasteSummary: TasteSummary | null | undefined,
) {
  const overview = normalizeOverview(tasteSummary?.overview);
  return Boolean(overview && !isFallbackTasteSummaryOverview(overview));
}

export function getProfileTasteSummaryOverview(
  profile: Pick<UserProfile, "tasteSummary"> | null | undefined,
) {
  return getTasteSummaryOverview(profile?.tasteSummary);
}
