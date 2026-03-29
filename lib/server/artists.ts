const HANDLE_SUFFIXES = ["", "official", "music", "tv", "topic"];

function stripDiacritics(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function compactArtistValue(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/\$/g, "s")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeComparableText(value: string) {
  return compactArtistValue(value).replace(/\s+/g, " ").trim();
}

export function normalizeVideoKey(value: string) {
  return normalizeComparableText(value)
    .replace(/\b(official|audio|video|topic|lyrics?|visualizer|remaster(?:ed)?|hd)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArtistName(input: string) {
  const displayName = input.trim().replace(/\s+/g, " ");
  const comparableName = normalizeComparableText(displayName);
  const normalizedKey = comparableName.replace(/\s+/g, "");
  const noSpaceHandle = comparableName.replace(/\s+/g, "");
  const wordJoinedHandle = comparableName.split(" ").join("");

  const guesses = new Set<string>();

  for (const base of [normalizedKey, noSpaceHandle, wordJoinedHandle]) {
    if (!base) {
      continue;
    }

    for (const suffix of HANDLE_SUFFIXES) {
      guesses.add(`@${base}${suffix}`);
    }
  }

  return {
    displayName,
    normalizedKey,
    comparableName,
    handleGuesses: [...guesses].slice(0, 8),
  };
}
