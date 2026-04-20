import type { UserProfile } from "@/lib/types";

type OnboardingProfile = Partial<
  Pick<
    UserProfile,
    | "activeRecommendationIntent"
    | "artistGenreProfiles"
    | "favoriteArtistEntries"
    | "favoriteArtists"
    | "friendIds"
    | "genreProfile"
    | "homeSuggestion"
    | "joinedRoomIds"
    | "onboardingComplete"
    | "tasteSummary"
  >
>;

function hasTasteSummary(profile: OnboardingProfile) {
  if (!profile.tasteSummary || typeof profile.tasteSummary !== "object") {
    return false;
  }

  return Boolean(
    profile.tasteSummary.overview ||
      profile.tasteSummary.headline ||
      profile.tasteSummary.subheadline,
  );
}

export function hasLegacyOnboardingSignals(profile: OnboardingProfile | null | undefined) {
  if (!profile) {
    return false;
  }

  return Boolean(
    (profile.favoriteArtists?.length ?? 0) > 0 ||
      (profile.favoriteArtistEntries?.length ?? 0) > 0 ||
      (profile.joinedRoomIds?.length ?? 0) > 0 ||
      (profile.friendIds?.length ?? 0) > 0 ||
      (profile.genreProfile?.length ?? 0) > 0 ||
      (profile.artistGenreProfiles?.length ?? 0) > 0 ||
      profile.homeSuggestion ||
      profile.activeRecommendationIntent ||
      hasTasteSummary(profile),
  );
}

export function isOnboardingComplete(profile: OnboardingProfile | null | undefined) {
  return Boolean(profile?.onboardingComplete || hasLegacyOnboardingSignals(profile));
}
