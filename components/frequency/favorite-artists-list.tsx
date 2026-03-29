import { titleCase } from "@/lib/utils";

export function FavoriteArtistsList({
  entries,
  primaryGenresByArtist,
  compact = false,
}: {
  entries: Array<{ artist: string; addedAt: string }>;
  primaryGenresByArtist: Map<string, string | null>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "divide-y divide-[rgba(255,255,255,0.07)]" : "divide-y divide-[rgba(255,255,255,0.07)]"}>
      {entries.map((entry, index) => {
        const primaryGenre = primaryGenresByArtist.get(entry.artist.toLowerCase()) ?? null;

        return (
          <div
            key={`${entry.artist}:${entry.addedAt}`}
            className={
              compact
                ? "flex items-center justify-between gap-3 px-1 py-2.5"
                : "flex items-center justify-between gap-3 px-1 py-3"
            }
          >
            <div className="min-w-0">
              <p
                className={
                  compact
                    ? "truncate text-[14px] font-medium text-[var(--text)]"
                    : "truncate text-[15px] font-medium text-[var(--text)]"
                }
              >
                {entry.artist}
              </p>
              <p
                className={
                  compact
                    ? "mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)]"
                    : "mt-1 text-[12px] uppercase tracking-[0.08em] text-[var(--text-faint)]"
                }
              >
                {primaryGenre ? titleCase(primaryGenre) : "Genre pending"}
              </p>
            </div>
            {index === 0 ? (
              <span
                className={
                  compact
                    ? "surface-pill shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-soft)]"
                    : "surface-pill shrink-0 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-soft)]"
                }
              >
                Newest
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
