import { Play, ChevronRight } from "lucide-react";

import { Song } from "@/lib/types";
import { cn } from "@/lib/utils";

type SongRowProps = {
  song: Song;
  expanded?: boolean;
  affordance?: "play" | "chevron";
};

export function SongRow({
  song,
  expanded,
  affordance = "play",
}: SongRowProps) {
  return (
    <div
      className={cn(
        "glass-surface-strong flex min-h-[72px] items-center gap-3 rounded-[24px] px-3 py-3",
        expanded ? "min-h-[88px]" : "",
      )}
    >
      <div
        className="size-14 shrink-0 rounded-[18px]"
        style={{
          background: `linear-gradient(145deg, ${song.artworkColor}, rgba(255,255,255,0.72))`,
        }}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[var(--text)]">
          {song.title}
        </p>
        <p className="truncate text-[14px] font-medium text-[var(--text-soft)]">
          {song.artist}
        </p>
        <p className="truncate text-[13px] text-[var(--text-faint)]">{song.context}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-2">
        <span className="text-[13px] font-medium text-[var(--text-faint)]">{song.duration}</span>
        <button className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-white/80 text-[var(--text-soft)]">
          {affordance === "play" ? <Play className="size-4 fill-current" /> : <ChevronRight className="size-4" />}
        </button>
      </div>
    </div>
  );
}
