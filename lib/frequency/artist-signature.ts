function normalizeArtistValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\$/g, "s")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildFavoriteArtistsSignature(artists: string[]) {
  return artists
    .map((artist) => normalizeArtistValue(artist))
    .filter(Boolean)
    .sort()
    .join("|");
}
