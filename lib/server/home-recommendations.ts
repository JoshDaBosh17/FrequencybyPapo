import { normalizeComparableText } from "./artists";
import {
  filterSimilarArtistsByGenre,
  getArtistTopTags,
  getArtistTopTracks,
  getCachedSimilarArtists,
  getTrackTopTags,
} from "./lastfm";
import { resolveSongMetadataAndLinks } from "./song-platform-links";

import type { HomeRecommendationItem, HomeRecommendationRequest } from "@/lib/frequency/home-recommendations";

type CandidateTrack = {
  artist: string;
  seedArtist: string;
  title: string;
  weight: number;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

function normalizeGenre(value: string | null | undefined) {
  return normalizeText(value)?.toLowerCase() ?? null;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function buildSeedArtists(input: HomeRecommendationRequest) {
  return Array.from(
    new Set(
      [...(input.recentArtists ?? []), ...(input.favoriteArtists ?? [])]
        .map((artist) => normalizeText(artist))
        .filter((artist): artist is string => Boolean(artist)),
    ),
  ).slice(0, 4);
}

function buildTopGenres(input: HomeRecommendationRequest) {
  const recentGenres = (input.recentGenres ?? [])
    .map((genre) => normalizeGenre(genre))
    .filter((genre): genre is string => Boolean(genre));
  const profileGenres = (input.genreProfile ?? [])
    .slice()
    .sort((left, right) => right.weight - left.weight)
    .map((entry) => normalizeGenre(entry.tag))
    .filter((genre): genre is string => Boolean(genre));

  return Array.from(new Set([...recentGenres, ...profileGenres])).slice(0, 3);
}

async function buildCandidateArtists(input: HomeRecommendationRequest) {
  const seedArtists = buildSeedArtists(input);
  const topGenres = buildTopGenres(input);

  if (!seedArtists.length) {
    return [];
  }

  const similarArtistGroups = await Promise.allSettled(
    seedArtists.slice(0, 2).map(async (seedArtist) => {
      const candidates = await getCachedSimilarArtists(seedArtist);
      const filtered = topGenres.length
        ? filterSimilarArtistsByGenre(candidates, topGenres[0] ?? null)
        : candidates;

      return filtered.slice(0, 3).map((candidate) => candidate.artistName);
    }),
  );

  return Array.from(
    new Set(
      [
        ...seedArtists,
        ...similarArtistGroups.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      ]
        .map((artist) => normalizeText(artist))
        .filter((artist): artist is string => Boolean(artist)),
    ),
  ).slice(0, 6);
}

function buildCandidateTrackKey(track: { artist: string; title: string }) {
  return `${normalizeComparableText(track.artist)}::${normalizeComparableText(track.title)}`;
}

async function buildCandidateTracks(input: HomeRecommendationRequest) {
  const candidateArtists = await buildCandidateArtists(input);

  if (!candidateArtists.length) {
    return [];
  }

  const trackResults = await Promise.allSettled(
    candidateArtists.map(async (artist, artistIndex) => {
      const tracks = await getArtistTopTracks(artist);

      return tracks.map(
        (track, trackIndex) =>
          ({
            artist: normalizeText(track.artist) ?? artist,
            seedArtist: artist,
            title: normalizeText(track.track) ?? "",
            weight: Math.max(0, 16 - artistIndex * 3 - trackIndex),
          }) satisfies CandidateTrack,
      );
    }),
  );

  const excludeKeys = new Set(
    (input.exclude ?? []).map((item) => buildCandidateTrackKey(item)),
  );
  const candidateMap = new Map<string, CandidateTrack>();

  for (const result of trackResults) {
    if (result.status !== "fulfilled") {
      continue;
    }

    for (const track of result.value) {
      if (!track.title || !track.artist) {
        continue;
      }

      const key = buildCandidateTrackKey(track);
      if (excludeKeys.has(key)) {
        continue;
      }

      const existing = candidateMap.get(key);

      if (!existing || existing.weight < track.weight) {
        candidateMap.set(key, track);
      }
    }
  }

  const orderedTracks = Array.from(candidateMap.values()).sort(
    (left, right) => right.weight - left.weight,
  );

  if (!orderedTracks.length) {
    return [];
  }

  const rotationSeed = hashString(
    [
      input.refreshToken ?? "stable",
      ...buildSeedArtists(input),
      ...buildTopGenres(input),
    ].join("|"),
  );
  const startIndex = rotationSeed % orderedTracks.length;

  return orderedTracks
    .slice(startIndex)
    .concat(orderedTracks.slice(0, startIndex))
    .slice(0, 10);
}

async function resolvePrimaryGenre(track: CandidateTrack) {
  const [trackTagsResult, artistTagsResult] = await Promise.allSettled([
    getTrackTopTags(track.artist, track.title),
    getArtistTopTags(track.artist),
  ]);
  const trackGenre =
    trackTagsResult.status === "fulfilled"
      ? normalizeGenre(trackTagsResult.value[0]?.tag)
      : null;
  const artistGenre =
    artistTagsResult.status === "fulfilled"
      ? normalizeGenre(artistTagsResult.value[0]?.tag)
      : null;

  return trackGenre ?? artistGenre;
}

function hasListeningLinks(item: HomeRecommendationItem) {
  return Boolean(
    item.links?.spotify || item.links?.appleMusic || item.links?.soundcloud,
  );
}

export async function getHomeRecommendations(
  input: HomeRecommendationRequest,
) {
  const limit = Math.min(Math.max(input.limit ?? 4, 1), 6);
  const candidates = await buildCandidateTracks(input);

  if (!candidates.length) {
    return [];
  }

  const resolvedWithLinks: HomeRecommendationItem[] = [];
  const resolvedFallbacks: HomeRecommendationItem[] = [];

  for (const candidate of candidates) {
    const [genre, metadata] = await Promise.all([
      resolvePrimaryGenre(candidate).catch(() => null),
      resolveSongMetadataAndLinks({
        artist: candidate.artist,
        title: candidate.title,
      }).catch(() => ({
        artist: candidate.artist,
        links: null,
        metadataSource: "input" as const,
        title: candidate.title,
      })),
    ]);

    const item = {
      artist: normalizeText(metadata.artist) ?? candidate.artist,
      createdAt: new Date().toISOString(),
      id: buildCandidateTrackKey({
        artist: metadata.artist ?? candidate.artist,
        title: metadata.title ?? candidate.title,
      }),
      links: metadata.links ?? null,
      primaryGenre: genre,
      sourcePlatform: null,
      title: normalizeText(metadata.title) ?? candidate.title,
    } satisfies HomeRecommendationItem;

    if (hasListeningLinks(item)) {
      resolvedWithLinks.push(item);
    } else {
      resolvedFallbacks.push(item);
    }

    if (resolvedWithLinks.length >= limit) {
      break;
    }
  }

  return [...resolvedWithLinks, ...resolvedFallbacks].slice(0, limit);
}
