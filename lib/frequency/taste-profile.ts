import type {
  ArtistGenreProfileItem,
  FavoriteArtistEntry,
  HelixTasteEntry,
} from "@/lib/types";

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function dedupeArtists(artists: string[]) {
  const seen = new Set<string>();

  return artists
    .map((artist) => artist.trim())
    .filter(Boolean)
    .filter((artist) => {
      const key = normalizeKey(artist);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function sortFavoriteArtistEntries(entries: FavoriteArtistEntry[]) {
  // Keep recency ordering stable so the newest artist always maps to the top of the helix
  // and to the first slot in profile surfaces, even when timestamps tie.
  return [...entries]
    .map((entry, index) => ({ entry, index, time: Date.parse(entry.addedAt) || 0 }))
    .sort((left, right) => {
      if (right.time !== left.time) {
        return right.time - left.time;
      }

      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}

export function buildFavoriteArtistEntries(
  favoriteArtists: string[],
  existingEntries: FavoriteArtistEntry[] = [],
  options?: {
    assumeInputOrder?: "newest_first" | "oldest_first";
    now?: number;
  },
) {
  const cleanedArtists = dedupeArtists(favoriteArtists);
  const preservedEntries = sortFavoriteArtistEntries(existingEntries).reduce<Map<string, FavoriteArtistEntry>>(
    (map, entry) => {
      map.set(normalizeKey(entry.artist), entry);
      return map;
    },
    new Map(),
  );
  const baseTime = options?.now ?? Date.now();
  const assumeInputOrder = options?.assumeInputOrder ?? "newest_first";

  const entries = cleanedArtists.map((artist, index) => {
    const key = normalizeKey(artist);
    const preserved = preservedEntries.get(key);

    if (preserved) {
      return {
        artist,
        addedAt: preserved.addedAt,
      };
    }

    const timestamp =
      assumeInputOrder === "oldest_first"
        ? new Date(Date.UTC(2020, 0, 1) + index * 1000).toISOString()
        : new Date(baseTime - index).toISOString();

    return {
      artist,
      addedAt: timestamp,
    };
  });

  return sortFavoriteArtistEntries(entries);
}

export function getFavoriteArtistsInRecencyOrder(
  favoriteArtists: string[],
  favoriteArtistEntries: FavoriteArtistEntry[] = [],
) {
  if (favoriteArtistEntries.length) {
    return buildFavoriteArtistEntries(favoriteArtists, favoriteArtistEntries).map((entry) => entry.artist);
  }

  return buildFavoriteArtistEntries(favoriteArtists, [], {
    assumeInputOrder: "oldest_first",
  }).map((entry) => entry.artist);
}

export function getFavoriteArtistEntriesInRecencyOrder(
  favoriteArtists: string[],
  favoriteArtistEntries: FavoriteArtistEntry[] = [],
) {
  if (favoriteArtistEntries.length) {
    return buildFavoriteArtistEntries(favoriteArtists, favoriteArtistEntries);
  }

  return buildFavoriteArtistEntries(favoriteArtists, [], {
    assumeInputOrder: "oldest_first",
  });
}

export function buildHelixTasteEntries({
  favoriteArtists,
  favoriteArtistEntries = [],
  artistGenreProfiles = [],
}: {
  favoriteArtists: string[];
  favoriteArtistEntries?: FavoriteArtistEntry[];
  artistGenreProfiles?: ArtistGenreProfileItem[];
}): HelixTasteEntry[] {
  const orderedArtists = getFavoriteArtistEntriesInRecencyOrder(
    favoriteArtists,
    favoriteArtistEntries,
  );
  const profilesByArtist = artistGenreProfiles.reduce<Map<string, ArtistGenreProfileItem>>(
    (map, profile) => {
      map.set(normalizeKey(profile.artist), profile);
      return map;
    },
    new Map(),
  );
  const mergedGenres = new Map<string, number>();
  const entries: HelixTasteEntry[] = [];

  for (const artistEntry of orderedArtists) {
    const artistProfile = profilesByArtist.get(normalizeKey(artistEntry.artist));
    const primaryGenre = artistProfile?.primaryTag ?? artistProfile?.tags[0] ?? null;

    if (!primaryGenre) {
      continue;
    }

    const genreKey = normalizeKey(primaryGenre);
    const existingIndex = mergedGenres.get(genreKey);

    if (existingIndex !== undefined) {
      // Reuse the first visible genre node and strengthen it instead of duplicating
      // the same genre repeatedly down the helix.
      entries[existingIndex] = {
        ...entries[existingIndex],
        // Keep the metadata stack intentionally tight: only the four most recent artists
        // are surfaced per genre for now, while the weight still reflects the full group.
        artists:
          entries[existingIndex].artists.length >= 4
            ? entries[existingIndex].artists
            : [
                ...entries[existingIndex].artists,
                {
                  name: artistEntry.artist,
                  addedAt: artistEntry.addedAt,
                },
              ],
        weight: (entries[existingIndex].weight ?? 1) + 1,
      };
      continue;
    }

    mergedGenres.set(genreKey, entries.length);
    entries.push({
      genre: primaryGenre,
      latestAddedAt: artistEntry.addedAt,
      artists: [
        {
          name: artistEntry.artist,
          addedAt: artistEntry.addedAt,
        },
      ],
      weight: 1,
    });
  }

  return entries;
}
