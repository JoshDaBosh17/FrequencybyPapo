"use client";

import { Music4, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";

import { IS_FREQUENCY_DEMO_MODE } from "@/lib/frequency/demo-mode";
import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import {
  SONG_REACTION_OPTIONS,
  getSongReactionCount,
} from "@/lib/frequency/song-reactions";
import type { SongActivityItem } from "@/lib/frequency/song-activity";
import { SegmentedControl } from "./segmented-control";

type LibraryGroupMode = "genre" | "day" | "month";

type LibraryGroup = {
  accentKey: string;
  items: SongActivityItem[];
  key: string;
  label: string;
  sortValue: number;
};

const LIBRARY_GROUP_MODES = [
  { id: "genre", label: "Genre" },
  { id: "day", label: "Day" },
  { id: "month", label: "Month" },
] satisfies Array<{ id: LibraryGroupMode; label: string }>;

const LIBRARY_GROUP_COPY = {
  genre: "Grouped by the genre attached to each song.",
  day: "Grouped by the exact day songs entered the room.",
  month: "Grouped into broader monthly chapters.",
} satisfies Record<LibraryGroupMode, string>;

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

function getLocalDateParts(value: unknown) {
  const timestampMs = normalizeTimestampMs(value);

  if (!timestampMs) {
    return null;
  }

  const date = new Date(timestampMs);

  return {
    date,
    dayKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    sortValue: new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(),
  };
}

function formatDayGroupLabel(value: unknown) {
  const timestampMs = normalizeTimestampMs(value);

  if (!timestampMs) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestampMs));
}

function formatMonthGroupLabel(value: unknown) {
  const timestampMs = normalizeTimestampMs(value);

  if (!timestampMs) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(timestampMs));
}

function compareLibrarySongs(left: SongActivityItem, right: SongActivityItem) {
  return normalizeTimestampMs(right.createdAt) - normalizeTimestampMs(left.createdAt);
}

function buildLibraryGroups(items: SongActivityItem[], mode: LibraryGroupMode) {
  const groups = new Map<string, LibraryGroup>();

  for (const item of items) {
    const timestampMs = normalizeTimestampMs(item.createdAt);
    const dateParts = getLocalDateParts(item.createdAt);
    const genre = item.primaryGenre?.trim();
    const group =
      mode === "genre"
        ? {
            accentKey: genre || "frequency",
            key: genre ? `genre:${genre.toLowerCase()}` : "genre:unclassified",
            label: genre || "Unclassified",
            sortValue: 0,
          }
        : mode === "day"
          ? {
              accentKey: item.visualAccentKey,
              key: `day:${dateParts?.dayKey ?? "undated"}`,
              label: formatDayGroupLabel(item.createdAt),
              sortValue: dateParts?.sortValue ?? -1,
            }
          : {
              accentKey: item.visualAccentKey,
              key: `month:${dateParts?.monthKey ?? "undated"}`,
              label: formatMonthGroupLabel(item.createdAt),
              sortValue: dateParts
                ? new Date(dateParts.date.getFullYear(), dateParts.date.getMonth(), 1).getTime()
                : -1,
            };

    const existing = groups.get(group.key);

    if (existing) {
      existing.items.push(item);
      existing.sortValue = Math.max(existing.sortValue, timestampMs, group.sortValue);
      continue;
    }

    groups.set(group.key, {
      ...group,
      items: [item],
      sortValue: Math.max(timestampMs, group.sortValue),
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort(compareLibrarySongs),
    }))
    .sort((left, right) => {
      if (mode === "genre") {
        const countDelta = right.items.length - left.items.length;

        if (countDelta !== 0) {
          return countDelta;
        }

        return left.label.localeCompare(right.label);
      }

      return right.sortValue - left.sortValue;
    });
}

export function RoomSongLibrary({
  items,
  title = "Song Library",
  descriptionByMode,
  emptyTitle = "No songs yet",
  emptyBody = "Add the first song to start building this room's library.",
  onEditItem,
  onRemoveItem,
  onSelectItem,
  canEditItem,
  canRemoveItem,
  removingItemId,
}: {
  items: SongActivityItem[];
  title?: string;
  descriptionByMode?: Partial<Record<LibraryGroupMode, string>>;
  emptyTitle?: string;
  emptyBody?: string;
  onEditItem?: (item: SongActivityItem) => void;
  onRemoveItem?: (item: SongActivityItem) => void;
  onSelectItem?: (item: SongActivityItem) => void;
  canEditItem?: (item: SongActivityItem) => boolean;
  canRemoveItem?: (item: SongActivityItem) => boolean;
  removingItemId?: string | null;
}) {
  const [groupMode, setGroupMode] = useState<LibraryGroupMode>("genre");
  const libraryGroups = useMemo(
    () => buildLibraryGroups(items, groupMode),
    [groupMode, items],
  );
  const groupDescription = descriptionByMode?.[groupMode] ?? LIBRARY_GROUP_COPY[groupMode];
  const hasItems = items.length > 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            {title}
          </h2>
          <p className="max-w-2xl text-[14px] leading-6 text-[var(--text-soft)]">
            {groupDescription}
          </p>
        </div>
        <div className="w-full sm:w-[22rem]">
          <SegmentedControl
            onChange={setGroupMode}
            segments={LIBRARY_GROUP_MODES}
            value={groupMode}
          />
        </div>
      </div>

      {hasItems ? (
        <div className="space-y-6">
          {libraryGroups.map((group) => {
            const groupAccentColor = getGenreColor(group.accentKey);

            return (
              <div className="space-y-3" key={group.key}>
                <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        background: groupAccentColor,
                        boxShadow: `0 0 14px ${withAlpha(groupAccentColor, 0.32)}`,
                      }}
                    />
                    <h3 className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      {group.label}
                    </h3>
                  </div>
                  <span className="surface-pill shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium text-[var(--text-faint)]">
                    {group.items.length} {group.items.length === 1 ? "song" : "songs"}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => {
                    const accentColor = getGenreColor(item.visualAccentKey);
                    const editable = canEditItem ? canEditItem(item) : Boolean(onEditItem);
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
                          background: `linear-gradient(180deg, ${withAlpha(accentColor, IS_FREQUENCY_DEMO_MODE ? 0.14 : 0.12)}, ${
                            IS_FREQUENCY_DEMO_MODE ? "rgba(0,0,0,0.96)" : "rgba(10,12,18,0.9)"
                          } 78%)`,
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
                        {editable || removable ? (
                          <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1">
                            {editable ? (
                              <button
                                aria-label={`Edit ${item.title}`}
                                className="inline-flex size-7 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditItem?.(item);
                                }}
                                type="button"
                              >
                                <Pencil className="size-4" />
                              </button>
                            ) : null}
                            {removable ? (
                              <button
                                aria-label={`Remove ${item.title}`}
                                className="inline-flex size-7 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
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
                          </div>
                        ) : null}

                        <button
                          className="flex min-h-[132px] w-full flex-col justify-between gap-3 pr-12 text-left transition hover:[filter:brightness(1.04)]"
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
                              {[
                                item.uploadedBy.displayName,
                                item.addedDateLabel ? `Added ${item.addedDateLabel}` : item.ageLabel,
                              ].join(" • ")}
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="section-haze rounded-[26px] border border-white/8 px-4 py-4">
          <div className="space-y-1.5">
            <p className="text-[15px] font-medium text-[var(--text)]">{emptyTitle}</p>
            <p className="text-[13px] leading-5 text-[var(--text-soft)]">
              {emptyBody}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
