import type { ArtistGenreProfileItem, GenreProfileItem, UserProfile } from "@/lib/types";

export type DiscoveryMode = "familiar" | "blend" | "explore";

export type RecommendationIntentInput = {
  artistSeed?: string | null;
  genreSeed?: string | null;
  discoveryMode?: DiscoveryMode;
};

export type GuidedRecommendationIntent = {
  artistSeed: string | null;
  genreSeed: string | null;
  discoveryMode: DiscoveryMode;
  intentKey: string;
};

function normalizeSeed(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeKeyPart(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeComparison(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, "");
}

export function createGuidedRecommendationIntent(
  input?: RecommendationIntentInput | null,
): GuidedRecommendationIntent {
  const artistSeed = normalizeSeed(input?.artistSeed);
  const genreSeed = normalizeSeed(input?.genreSeed);
  const discoveryMode = input?.discoveryMode ?? "blend";

  return {
    artistSeed,
    genreSeed,
    discoveryMode,
    intentKey: [
      `artist-${normalizeKeyPart(artistSeed) || "any"}`,
      `genre-${normalizeKeyPart(genreSeed) || "any"}`,
      `mode-${discoveryMode}`,
    ].join("__"),
  };
}

export function getRecommendedArtistSeedOptions(profile: UserProfile | null) {
  return (profile?.favoriteArtists ?? []).slice(0, 6);
}

export function getRecommendedGenreSeedOptions(genres: GenreProfileItem[]) {
  return genres.slice(0, 6).map((genre) => genre.tag);
}

function findArtistGenreProfile(
  profiles: ArtistGenreProfileItem[] | undefined,
  artistSeed: string | null,
) {
  if (!artistSeed || !profiles?.length) {
    return null;
  }

  const normalizedArtist = normalizeComparison(artistSeed);
  return (
    profiles.find((profile) => normalizeComparison(profile.artist) === normalizedArtist) ?? null
  );
}

export function getCorrelatedGenreSeedOptions(
  profile: UserProfile | null,
  artistSeed: string | null,
  genreOptions: string[],
) {
  const artistProfile = findArtistGenreProfile(profile?.artistGenreProfiles, artistSeed);
  const allowedGenres = new Set(
    (artistProfile?.tags ?? []).map((tag) => normalizeComparison(tag)),
  );

  if (!artistSeed) {
    return {
      correlatedGenres: genreOptions,
      helperCopy: null,
    };
  }

  const correlatedGenres = genreOptions.filter((genre) =>
    allowedGenres.has(normalizeComparison(genre)),
  );

  return {
    correlatedGenres,
    helperCopy: artistProfile?.tags?.length
      ? `Available vibes for ${artistSeed}`
      : `No saved vibe tags for ${artistSeed} yet`,
  };
}

export function getDefaultGuidedRecommendationIntent(
  profile: UserProfile | null,
): GuidedRecommendationIntent {
  if (profile?.activeRecommendationIntent) {
    return createGuidedRecommendationIntent(profile.activeRecommendationIntent);
  }

  return createGuidedRecommendationIntent({
    artistSeed: null,
    genreSeed: null,
    discoveryMode: "familiar",
  });
}
