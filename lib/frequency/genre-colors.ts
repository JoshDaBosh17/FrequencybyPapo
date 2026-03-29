const GENRE_COLOR_HUE_ANCHORS = [
  18, 32, 46, 62, 84, 110, 138, 164, 188, 210, 232, 254, 278, 302, 326, 344,
] as const;

export type GenreColorEntry = {
  genre: string;
  color: string;
};

// Tune this list to shift the overall palette character. The generator keeps genre colors
// stable by hashing the normalized genre name into one of these anchors plus a small offset.
function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function normalizeGenre(value: string) {
  return value.trim().toLowerCase();
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = clamp(saturation, 0, 100) / 100;
  const normalizedLightness = clamp(lightness, 0, 100) / 100;
  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const hueSection = normalizedHue / 60;
  const intermediate = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const match = normalizedLightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma;
    green = intermediate;
  } else if (hueSection < 2) {
    red = intermediate;
    green = chroma;
  } else if (hueSection < 3) {
    green = chroma;
    blue = intermediate;
  } else if (hueSection < 4) {
    green = intermediate;
    blue = chroma;
  } else if (hueSection < 5) {
    red = intermediate;
    blue = chroma;
  } else {
    red = chroma;
    blue = intermediate;
  }

  const channelToHex = (channel: number) =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channelToHex(red)}${channelToHex(green)}${channelToHex(blue)}`;
}

export function getGenreColor(genre: string) {
  const normalizedGenre = normalizeGenre(genre);

  if (!normalizedGenre) {
    return "#8bb9d8";
  }

  const hash = hashString(normalizedGenre);
  const anchor = GENRE_COLOR_HUE_ANCHORS[hash % GENRE_COLOR_HUE_ANCHORS.length];
  const hueOffset = ((hash >>> 5) % 11) - 5;
  const saturation = 66 + ((hash >>> 9) % 10);
  const lightness = 62 + ((hash >>> 14) % 7);

  return hslToHex(anchor + hueOffset, saturation, lightness);
}

export function buildOrderedGenreColors(
  genres: string[],
  palette?: string[],
): GenreColorEntry[] {
  const seen = new Set<string>();
  const activeGenres = genres
    .map((genre) => genre.trim())
    .filter(Boolean)
    .filter((genre) => {
      const normalizedGenre = normalizeGenre(genre);
      if (seen.has(normalizedGenre)) {
        return false;
      }

      seen.add(normalizedGenre);
      return true;
    });

  // Colors are allocated only for the active ordered genres. Extra palette slots are ignored,
  // which keeps sparse taste data from rendering decorative unused colors.
  return activeGenres.map((genre, index) => ({
    color: palette?.[index] ?? getGenreColor(genre),
    genre,
  }));
}

export function buildGenreColorMap(genres: string[], palette?: string[]) {
  return buildOrderedGenreColors(genres, palette).reduce<Map<string, string>>(
    (map, entry) => {
      map.set(normalizeGenre(entry.genre), entry.color);
      return map;
    },
    new Map(),
  );
}

export function withAlpha(color: string, alpha: number) {
  const normalizedColor = color.trim();
  const sanitizedAlpha = clamp(alpha, 0, 1);

  if (/^#[0-9a-f]{6}$/i.test(normalizedColor)) {
    const red = Number.parseInt(normalizedColor.slice(1, 3), 16);
    const green = Number.parseInt(normalizedColor.slice(3, 5), 16);
    const blue = Number.parseInt(normalizedColor.slice(5, 7), 16);

    return `rgba(${red}, ${green}, ${blue}, ${sanitizedAlpha})`;
  }

  return color;
}
