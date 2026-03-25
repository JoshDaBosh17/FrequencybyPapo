export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function getInitials(name?: string | null) {
  if (!name) {
    return "FR";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "FR";
}

export function getAvatarTone(seed: string) {
  const tones = ["#d29d7b", "#de8ea2", "#8bb9d8", "#8bb89e", "#b6a0db", "#d9ab63"];
  const value = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[value % tones.length];
}

export function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
