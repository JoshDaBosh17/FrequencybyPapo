import { getTasteSummaryOverview } from "@/lib/frequency/taste-summary";
import { getFavoriteArtistEntriesInRecencyOrder } from "@/lib/frequency/taste-profile";
import type { UserProfile } from "@/lib/types";

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function dedupeInOrder(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = normalizeKey(value);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export type TasteComparisonSummary = {
  sharedGenres: string[];
  sharedArtists: string[];
  yourTopGenres: string[];
  theirTopGenres: string[];
  yourRecentArtists: string[];
  theirRecentArtists: string[];
  yourOverview: string;
  theirOverview: string;
};

export function buildTasteComparisonSummary(
  currentProfile: Pick<
    UserProfile,
    "favoriteArtists" | "favoriteArtistEntries" | "genreProfile" | "tasteSummary"
  >,
  comparedProfile: Pick<
    UserProfile,
    "favoriteArtists" | "favoriteArtistEntries" | "genreProfile" | "tasteSummary"
  >,
): TasteComparisonSummary {
  const currentGenres = dedupeInOrder(currentProfile.genreProfile.map((genre) => genre.tag));
  const comparedGenres = dedupeInOrder(comparedProfile.genreProfile.map((genre) => genre.tag));
  const comparedGenreKeys = new Set(comparedGenres.map(normalizeKey));
  // The compare surface stays lightweight for now: we keep the overlap readout focused
  // on shared genres, shared artists, and each profile's most recent taste signals.
  const currentArtistEntries = getFavoriteArtistEntriesInRecencyOrder(
    currentProfile.favoriteArtists,
    currentProfile.favoriteArtistEntries ?? [],
  );
  const comparedArtistEntries = getFavoriteArtistEntriesInRecencyOrder(
    comparedProfile.favoriteArtists,
    comparedProfile.favoriteArtistEntries ?? [],
  );
  const comparedArtistKeys = new Set(
    comparedArtistEntries.map((entry) => normalizeKey(entry.artist)),
  );

  return {
    sharedGenres: currentGenres
      .filter((genre) => comparedGenreKeys.has(normalizeKey(genre)))
      .slice(0, 5),
    sharedArtists: currentArtistEntries
      .map((entry) => entry.artist)
      .filter((artist) => comparedArtistKeys.has(normalizeKey(artist)))
      .slice(0, 5),
    yourTopGenres: currentGenres.slice(0, 4),
    theirTopGenres: comparedGenres.slice(0, 4),
    yourRecentArtists: currentArtistEntries.map((entry) => entry.artist).slice(0, 4),
    theirRecentArtists: comparedArtistEntries.map((entry) => entry.artist).slice(0, 4),
    yourOverview: getTasteSummaryOverview(currentProfile.tasteSummary),
    theirOverview: getTasteSummaryOverview(comparedProfile.tasteSummary),
  };
}
