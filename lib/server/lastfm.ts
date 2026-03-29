import { Timestamp } from "firebase-admin/firestore";

import { IS_SERVER_TEST_MODE } from "@/lib/env/server";
import { adminDb } from "./firebase-admin";
import { setAdminDocument } from "./firestore-write";
import { normalizeArtistName, normalizeComparableText } from "./artists";

type LastFmTag = {
  name: string;
  count?: string;
};

type LastFmTrack = {
  name: string;
  artist?: { name?: string };
};

type LastFmTrackSearchMatch = {
  name?: string;
  artist?: string;
  listeners?: string;
  mbid?: string;
};

type LastFmTrackInfo = {
  name?: string;
  mbid?: string;
  artist?: { name?: string } | string;
  listeners?: string;
  playcount?: string;
};

type LastFmArtistSearchMatch = {
  name?: string;
  listeners?: string;
  mbid?: string;
};

type LastFmArtistInfo = {
  name?: string;
  mbid?: string;
  stats?: {
    listeners?: string;
  };
};

type LastFmSimilarArtist = {
  name: string;
  match?: string;
};

type SimilarArtistCacheEntry = {
  artistName: string;
  normalizedArtistName: string;
  relevance: number;
  rank: number;
  topTags: string[];
};

type SimilarArtistCacheDoc = {
  artistName: string;
  normalizedArtistName: string;
  similarArtists: SimilarArtistCacheEntry[];
  resolvedAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
};

type ArtistGenreProfileItem = {
  artist: string;
  tags: string[];
};

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = process.env.LASTFM_BASE_URL ?? "https://ws.audioscrobbler.com/2.0/";
const SIMILAR_ARTIST_CACHE_TTL_MS = IS_SERVER_TEST_MODE
  ? 180 * 24 * 60 * 60 * 1000
  : 30 * 24 * 60 * 60 * 1000;

const TAG_ALIASES: Record<string, string> = {
  "hip hop": "hip-hop",
  hiphop: "hip-hop",
  "hip-hop": "hip-hop",
  "afro house": "afro-house",
  "afro-house": "afro-house",
  rnb: "r&b",
  "r and b": "r&b",
  "r&b": "r&b",
};

const JUNK_TAGS = new Set([
  "seen live",
  "favorites",
  "awesome",
  "love",
  "female vocalists",
  "male vocalists",
  "good",
  "soundtrack",
  "favorite",
  "favourite",
  "fav",
  "albums i own",
]);

async function lastFmRequest<T>(method: string, params: Record<string, string>) {
  if (!LASTFM_API_KEY) {
    throw new Error("LASTFM_API_KEY is not set");
  }

  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", LASTFM_API_KEY);
  url.searchParams.set("format", "json");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Last.fm request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeTag(tag: string) {
  const normalized = tag.trim().toLowerCase().replace(/\s+/g, " ");
  return TAG_ALIASES[normalized] ?? normalized;
}

function keepTag(tag: string) {
  if (!tag || JUNK_TAGS.has(tag) || tag.length < 2) {
    return false;
  }

  return /^[a-z0-9&/\-+\s]+$/.test(tag);
}

function isExpired(timestamp?: Timestamp | null) {
  if (!timestamp) {
    return true;
  }

  return timestamp.toMillis() <= Date.now();
}

function normalizeGenreSeed(value: string | null | undefined) {
  return value ? normalizeTag(value) : null;
}

export async function getArtistTopTags(artist: string) {
  const response = await lastFmRequest<{ toptags?: { tag?: LastFmTag[] } }>("artist.getTopTags", {
    artist,
    autocorrect: "1",
  });

  return (response.toptags?.tag ?? [])
    .map((tag) => ({
      tag: normalizeTag(tag.name),
      weight: Number(tag.count ?? 0),
    }))
    .filter((tag) => keepTag(tag.tag) && tag.weight > 0);
}

export async function getArtistTopTracks(artist: string) {
  const response = await lastFmRequest<{ toptracks?: { track?: LastFmTrack[] } }>("artist.getTopTracks", {
    artist,
    autocorrect: "1",
    limit: "6",
  });

  return (response.toptracks?.track ?? [])
    .map((track) => ({
      artist: track.artist?.name ?? artist,
      track: track.name,
    }))
    .filter((track) => Boolean(track.track?.trim()));
}

export async function getTrackTopTags(artist: string, track: string) {
  const response = await lastFmRequest<{ toptags?: { tag?: LastFmTag[] } }>("track.getTopTags", {
    artist,
    track,
    autocorrect: "1",
  });

  return (response.toptags?.tag ?? [])
    .map((tag) => ({
      tag: normalizeTag(tag.name),
      weight: Number(tag.count ?? 0),
    }))
    .filter((tag) => keepTag(tag.tag) && tag.weight > 0);
}

export async function searchTracks(query: string) {
  const response = await lastFmRequest<{
    results?: {
      trackmatches?: {
        track?: LastFmTrackSearchMatch[] | LastFmTrackSearchMatch;
      };
    };
  }>("track.search", {
    track: query,
    limit: "8",
  });

  const matches = response.results?.trackmatches?.track;
  const items = Array.isArray(matches) ? matches : matches ? [matches] : [];

  return items
    .map((track) => ({
      name: track.name?.trim() ?? "",
      artist: track.artist?.trim() ?? "",
      listeners: Number(track.listeners ?? 0),
      mbid: track.mbid?.trim() || null,
    }))
    .filter((track) => Boolean(track.name) && Boolean(track.artist));
}

export async function getAutocorrectedTrack(artist: string, track: string) {
  try {
    const response = await lastFmRequest<{ track?: LastFmTrackInfo; error?: number }>(
      "track.getInfo",
      {
        artist,
        track,
        autocorrect: "1",
      },
    );

    if (response.error || !response.track?.name?.trim()) {
      return null;
    }

    const responseArtist =
      typeof response.track.artist === "string"
        ? response.track.artist
        : response.track.artist?.name;

    if (!responseArtist?.trim()) {
      return null;
    }

    return {
      name: response.track.name.trim(),
      artist: responseArtist.trim(),
      listeners: Number(response.track.listeners ?? response.track.playcount ?? 0),
      mbid: response.track.mbid?.trim() || null,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("could not be found")) {
      return null;
    }

    throw error;
  }
}

export async function searchArtists(query: string) {
  const response = await lastFmRequest<{
    results?: {
      artistmatches?: {
        artist?: LastFmArtistSearchMatch[] | LastFmArtistSearchMatch;
      };
    };
  }>("artist.search", {
    artist: query,
    limit: "5",
  });

  const matches = response.results?.artistmatches?.artist;
  const items = Array.isArray(matches) ? matches : matches ? [matches] : [];

  return items
    .map((artist) => ({
      name: artist.name?.trim() ?? "",
      listeners: Number(artist.listeners ?? 0),
      mbid: artist.mbid?.trim() || null,
    }))
    .filter((artist) => Boolean(artist.name));
}

export async function getAutocorrectedArtist(query: string) {
  try {
    const response = await lastFmRequest<{ artist?: LastFmArtistInfo; error?: number }>(
      "artist.getInfo",
      {
        artist: query,
        autocorrect: "1",
      },
    );

    if (response.error || !response.artist?.name?.trim()) {
      return null;
    }

    return {
      name: response.artist.name.trim(),
      listeners: Number(response.artist.stats?.listeners ?? 0),
      mbid: response.artist.mbid?.trim() || null,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("could not be found")) {
      return null;
    }

    throw error;
  }
}

export async function getCachedSimilarArtists(seedArtist: string) {
  const normalized = normalizeArtistName(seedArtist);
  const ref = adminDb.collection("artistSimilarities").doc(normalized.normalizedKey);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    const cached = snapshot.data() as SimilarArtistCacheDoc;
    if (!isExpired(cached.expiresAt)) {
      return cached.similarArtists ?? [];
    }
  }

  const response = await lastFmRequest<{ similarartists?: { artist?: LastFmSimilarArtist[] } }>(
    "artist.getSimilar",
    {
      artist: seedArtist,
      autocorrect: "1",
      limit: "14",
    },
  );

  const rawArtists = (response.similarartists?.artist ?? []).slice(0, 14);
  const similarArtists = (
    await Promise.all(
      rawArtists.map(async (artist, index) => {
        const name = artist.name?.trim();
        if (!name) {
          return null;
        }

        const tags = await getArtistTopTags(name).catch(() => []);
        return {
          artistName: name,
          normalizedArtistName: normalizeComparableText(name),
          relevance: Math.max(0.1, Number(artist.match ?? 0)),
          rank: index + 1,
          topTags: tags.slice(0, 5).map((tag) => tag.tag),
        };
      }),
    )
  ).filter((value): value is SimilarArtistCacheEntry => value !== null);

  await setAdminDocument(
    ref,
    {
      artistName: normalized.displayName,
      normalizedArtistName: normalized.normalizedKey,
      similarArtists,
      resolvedAt: new Date(),
      expiresAt: new Date(Date.now() + SIMILAR_ARTIST_CACHE_TTL_MS),
    },
    { merge: true },
    {
      triggerReason: "cache_lastfm_similar_artists",
      userId: null,
    },
  );

  return similarArtists;
}

export function filterSimilarArtistsByGenre<T extends { topTags?: string[] }>(
  artists: T[],
  genreSeed?: string | null,
) {
  const normalizedGenreSeed = normalizeGenreSeed(genreSeed);
  if (!normalizedGenreSeed) {
    return artists;
  }

  const matching = artists.filter((artist) =>
    (artist.topTags ?? []).some((tag) => normalizeTag(tag) === normalizedGenreSeed),
  );

  return matching.length ? matching : artists;
}

export async function buildGenreProfile(favoriteArtists: string[]) {
  const profile = new Map<string, number>();

  await Promise.all(
    favoriteArtists.map(async (artist, index) => {
      const tags = await getArtistTopTags(artist);
      for (const tag of tags.slice(0, 8)) {
        const artistBias = Math.max(1, favoriteArtists.length - index);
        profile.set(tag.tag, (profile.get(tag.tag) ?? 0) + tag.weight * artistBias);
      }
    }),
  );

  const sorted = [...profile.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);
  const maxWeight = sorted[0]?.[1] ?? 1;

  return sorted.map(([tag, weight]) => ({
    tag,
    weight: Math.max(8, Math.round((weight / maxWeight) * 100)),
  }));
}

export async function buildArtistGenreProfiles(
  favoriteArtists: string[],
): Promise<ArtistGenreProfileItem[]> {
  const profiles = await Promise.all(
    favoriteArtists.map(async (artist) => {
      const tags = await getArtistTopTags(artist);
      return {
        artist,
        primaryTag: tags[0]?.tag ?? null,
        tags: tags.slice(0, 6).map((tag) => tag.tag),
      };
    }),
  );

  return profiles.filter((profile) => profile.tags.length > 0);
}

export async function pickSuggestionTrack(favoriteArtists: string[]) {
  for (const artist of favoriteArtists) {
    const tracks = await getArtistTopTracks(artist);
    const match = tracks.find((track) => track.track.length > 1);

    if (match) {
      return {
        artist: match.artist,
        track: match.track,
        title: `${match.track} - ${match.artist}`,
      };
    }
  }

  return null;
}
