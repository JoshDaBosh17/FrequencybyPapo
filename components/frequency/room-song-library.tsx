"use client";

import { Music4, X } from "lucide-react";
import { useMemo } from "react";

import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import {
  SONG_REACTION_OPTIONS,
  getSongReactionTotal,
  getSongReactionCount,
} from "@/lib/frequency/song-reactions";
import type { SongActivityItem } from "@/lib/frequency/song-activity";

function normalizeTimestampMs(value: unknown) {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === "object" && "seconds" in value) {
    return ((value as { seconds?: number }).seconds ?? 0) * 1000;
  }

  return 0;
}

export function RoomSongLibrary({
  items,
  onRemoveItem,
  onSelectItem,
  canRemoveItem,
  removingItemId,
}: {
  items: SongActivityItem[];
  onRemoveItem?: (item: SongActivityItem) => void;
  onSelectItem?: (item: SongActivityItem) => void;
  canRemoveItem?: (item: SongActivityItem) => boolean;
  removingItemId?: string | null;
}) {
  const rankedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const reactionDelta =
          getSongReactionTotal(right.reactions) - getSongReactionTotal(left.reactions);

        if (reactionDelta !== 0) {
          return reactionDelta;
        }

        return normalizeTimestampMs(right.createdAt) - normalizeTimestampMs(left.createdAt);
      }),
    [items],
  );

  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
          Song Library
        </h2>
        <p className="text-[14px] leading-6 text-[var(--text-soft)]">
          Top room picks, sorted by the reactions they&apos;ve earned.
        </p>
      </div>

      {rankedItems.length ? (
        <div className="grid grid-cols-3 gap-3">
          {rankedItems.map((item) => {
            const accentColor = getGenreColor(item.primaryGenre ?? "frequency");
            const removable = canRemoveItem ? canRemoveItem(item) : Boolean(onRemoveItem);
            const removePending = removingItemId === item.id;
            const reactionSummary = SONG_REACTION_OPTIONS.filter(
              (reaction) => getSongReactionCount(item.reactions, reaction.id) > 0,
            );

            return (
              <div
                key={item.id}
                className="section-haze relative overflow-hidden rounded-[22px] border border-white/8 p-3"
                style={{
                  background: `linear-gradient(180deg, ${withAlpha(accentColor, 0.12)}, rgba(10,12,18,0.9) 78%)`,
                  boxShadow: `inset 0 1px 0 ${withAlpha(accentColor, 0.12)}`,
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${withAlpha(accentColor, 0.84)}, transparent)`,
                  }}
                />
                {removable ? (
                  <button
                    aria-label={`Remove ${item.title}`}
                    className="absolute right-2.5 top-2.5 z-10 inline-flex size-7 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
                    disabled={removePending}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveItem?.(item);
                    }}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}

                <button
                  className="flex min-h-[132px] w-full flex-col justify-between gap-3 pr-6 text-left transition hover:[filter:brightness(1.04)]"
                  onClick={() => onSelectItem?.(item)}
                  type="button"
                >
                  <div className="min-w-0 space-y-2">
                    <div
                      className="inline-flex size-9 items-center justify-center rounded-full border border-white/10"
                      style={{
                        background: withAlpha(accentColor, 0.16),
                        boxShadow: `0 0 20px ${withAlpha(accentColor, 0.18)}`,
                      }}
                    >
                      <Music4 className="size-4 text-[var(--text)]" />
                    </div>
                    <div className="space-y-1">
                      <p className="line-clamp-2 break-words text-[13px] font-semibold leading-4.5 tracking-[-0.03em] text-[var(--text)]">
                        {item.title}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--text-soft)]">{item.artist}</p>
                      {item.comment ? (
                        <p className="line-clamp-2 break-words text-[11px] leading-4 text-[var(--text-faint)]">
                          {item.comment}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-[10.5px] text-[var(--text-faint)]">
                      {item.uploadedBy.displayName}
                    </p>
                    <div className="flex min-h-5 items-center gap-2 text-[10px] text-[var(--text-faint)]">
                      {reactionSummary.length ? (
                        reactionSummary.map((reaction) => (
                          <span key={reaction.id} className="inline-flex min-w-0 items-center gap-1">
                            <span>{reaction.emoji}</span>
                            <span className="tabular-nums">
                              {getSongReactionCount(item.reactions, reaction.id)}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: accentColor }}
                          />
                          No reactions yet
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="section-haze rounded-[26px] border border-white/8 px-4 py-4">
          <div className="space-y-1.5">
            <p className="text-[15px] font-medium text-[var(--text)]">No songs yet</p>
            <p className="text-[13px] leading-5 text-[var(--text-soft)]">
              Add the first song to start building this room&apos;s library.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
