import type { GenreProfileItem } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const genreColors = ["#d9a85e", "#8bb9d8", "#e9878f", "#82bb9c", "#aea0d9", "#d29d7b"];

export function GenreWheel({ genres }: { genres: GenreProfileItem[] }) {
  const topGenres = genres.slice(0, 6);
  const total = topGenres.reduce((sum, genre) => sum + genre.weight, 0) || 1;
  const segments = topGenres.reduce<{
    angle: number;
    values: string[];
  }>(
    (state, genre, index) => {
      const nextAngle = state.angle + (genre.weight / total) * 360;
      const color = genreColors[index % genreColors.length];

      return {
        angle: nextAngle,
        values: [...state.values, `${color} ${state.angle}deg ${nextAngle}deg`],
      };
    },
    { angle: 0, values: [] },
  ).values;

  return (
    <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div className="relative mx-auto grid size-[220px] place-items-center rounded-full border border-[var(--line)] bg-white/80 shadow-[var(--shadow-soft)]">
        <div
          className="absolute inset-3 rounded-full"
          style={{ background: `conic-gradient(${segments.join(", ")})` }}
        />
        <div className="absolute inset-[26%] rounded-full border border-white/70 bg-[rgba(248,245,241,0.96)]" />
        <div className="relative z-10 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
            Taste wheel
          </p>
          <p className="mt-2 text-[26px] font-semibold tracking-[-0.05em] text-[var(--text)]">
            {topGenres[0] ? titleCase(topGenres[0].tag) : "Waiting"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {topGenres.map((genre, index) => (
          <div
            key={genre.tag}
            className="rounded-[20px] border border-[var(--line)] bg-white/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-semibold text-[var(--text)]">
                {titleCase(genre.tag)}
              </p>
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: genreColors[index % genreColors.length] }}
              />
            </div>
            <div className="mt-3 h-2 rounded-full bg-[rgba(81,68,56,0.08)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${genre.weight}%`,
                  backgroundColor: genreColors[index % genreColors.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
