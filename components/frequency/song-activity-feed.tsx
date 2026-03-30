"use client";

import Image from "next/image";
import { X } from "lucide-react";

import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import type { SongActivityItem } from "@/lib/frequency/song-activity";

type SongActivityFeedProps = {
  items: SongActivityItem[];
  emptyTitle: string;
  emptyBody: string;
  onSelectItem?: (item: SongActivityItem) => void;
  showContext?: boolean;
  maxVisibleItems?: number;
  onRemoveItem?: (item: SongActivityItem) => void;
  canRemoveItem?: (item: SongActivityItem) => boolean;
  removingItemId?: string | null;
};

function SongActivityAvatar({ item }: { item: SongActivityItem }) {
  if (item.uploadedBy.avatarUrl) {
    return (
      <Image
        alt={item.uploadedBy.displayName}
        className="size-10 rounded-full object-cover"
        height={40}
        src={item.uploadedBy.avatarUrl}
        unoptimized
        width={40}
      />
    );
  }

  return (
    <div className="grid size-10 place-items-center rounded-full bg-[rgba(255,255,255,0.08)] text-[11px] font-semibold uppercase text-[var(--text-soft)]">
      {item.uploadedBy.displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)}
    </div>
  );
}

export function SongActivityFeed({
  items,
  emptyTitle,
  emptyBody,
  onSelectItem,
  showContext = false,
  maxVisibleItems,
  onRemoveItem,
  canRemoveItem,
  removingItemId,
}: SongActivityFeedProps) {
  const visibleItems =
    typeof maxVisibleItems === "number" ? items.slice(0, maxVisibleItems) : items;

  if (!visibleItems.length) {
    return (
      <div className="py-8">
        <div className="space-y-2">
          <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            {emptyTitle}
          </p>
          <p className="max-w-2xl text-[14px] leading-6 text-[var(--text-soft)]">
            {emptyBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[rgba(255,255,255,0.08)] border-y border-[rgba(255,255,255,0.08)]">
      {visibleItems.map((item) => {
        const accentColor = getGenreColor(item.primaryGenre ?? "frequency");
        const hasListeningLinks = Boolean(
          item.links?.spotify || item.links?.appleMusic || item.links?.soundcloud,
        );
        const clickable = Boolean(onSelectItem && hasListeningLinks);
        const removable = canRemoveItem ? canRemoveItem(item) : Boolean(onRemoveItem);
        const removePending = removingItemId === item.id;
        const metadata = [
          `Uploaded by ${item.uploadedBy.displayName}`,
          showContext ? item.contextLabel : null,
          item.ageLabel,
        ].filter((value): value is string => Boolean(value));

        const rowContent = (
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              aria-hidden="true"
              className="mt-0.5 h-12 w-[3px] shrink-0 rounded-full"
              style={{
                background: `linear-gradient(180deg, ${accentColor}, ${withAlpha(accentColor, 0.34)})`,
                boxShadow: `0 0 18px ${withAlpha(accentColor, 0.24)}`,
              }}
            />
            <SongActivityAvatar item={item} />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                {item.title}
              </p>
              <p className="truncate text-[14px] text-[var(--text-soft)]">{item.artist}</p>
              <p className="truncate text-[12px] text-[var(--text-faint)]">{metadata.join(" • ")}</p>
              {item.comment ? (
                <p className="line-clamp-2 text-[13px] leading-5 text-[var(--text-soft)]">
                  {item.comment}
                </p>
              ) : null}
            </div>
          </div>
        );

        return (
          <div
            key={item.id}
            className="group flex items-start justify-between gap-3 py-3 sm:py-3.5"
            style={{
              background: `linear-gradient(90deg, ${withAlpha(accentColor, 0.06)}, transparent 28%)`,
            }}
          >
            {clickable ? (
              <button
                className="min-w-0 flex-1 rounded-[22px] text-left transition hover:[filter:brightness(1.04)]"
                onClick={() => onSelectItem?.(item)}
                type="button"
              >
                {rowContent}
              </button>
            ) : (
              rowContent
            )}

            {removable ? (
              <button
                aria-label={`Remove ${item.title}`}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
                disabled={removePending}
                onClick={() => onRemoveItem?.(item)}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
