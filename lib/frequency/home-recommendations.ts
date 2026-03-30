import type {
  GenreProfileItem,
  RoomSharePlatformLinks,
  RoomShareSourcePlatform,
} from "@/lib/types";

export type HomeRecommendationItem = {
  id: string;
  title: string;
  artist: string;
  primaryGenre: string | null;
  sourcePlatform: RoomShareSourcePlatform | null;
  links: RoomSharePlatformLinks | null;
  createdAt: string;
};

export type HomeRecommendationRequest = {
  favoriteArtists?: string[];
  recentArtists?: string[];
  recentGenres?: string[];
  genreProfile?: GenreProfileItem[];
  exclude?: Array<{ title: string; artist: string }>;
  limit?: number;
  refreshToken?: string | null;
};

const HOME_RECOMMENDATION_CACHE_VERSION = "v1";

function normalizeList(values: string[] | undefined) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .join("|");
}

export function buildHomeRecommendationCacheKey(params: {
  scope?: string;
  uid: string | null | undefined;
  favoriteArtists: string[];
  recentArtists: string[];
  recentGenres: string[];
  genreProfile: GenreProfileItem[];
}) {
  return [
    "frequency",
    "home",
    "you-might-like",
    HOME_RECOMMENDATION_CACHE_VERSION,
    params.scope ?? "home",
    params.uid ?? "anon",
    normalizeList(params.favoriteArtists),
    normalizeList(params.recentArtists),
    normalizeList(params.recentGenres),
    normalizeList(params.genreProfile.map((entry) => entry.tag)),
  ].join(":");
}
