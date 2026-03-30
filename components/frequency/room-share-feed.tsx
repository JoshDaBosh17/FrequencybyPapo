"use client";

import Link from "next/link";
import { ExternalLink, Link2, Mic2, Music4, X } from "lucide-react";

import {
  buildRoomShareUrlLabel,
  getRoomShareKindLabel,
} from "@/lib/frequency/room-share";
import type { RoomShareItem, RoomShareSourcePlatform } from "@/lib/types";

function RoomShareIcon({ kind }: { kind: RoomShareItem["kind"] }) {
  if (kind === "artist") {
    return <Mic2 className="size-4" />;
  }

  if (kind === "link") {
    return <Link2 className="size-4" />;
  }

  return <Music4 className="size-4" />;
}

type RoomSharePlatform = RoomShareSourcePlatform;

const ROOM_SHARE_PLATFORM_ORDER = [
  "spotify",
  "appleMusic",
  "soundcloud",
  "youtube",
] satisfies RoomSharePlatform[];

function getRoomSharePlatformEntries(
  links: RoomShareItem["links"],
  preferredPlatform?: RoomShareItem["sourcePlatform"],
) {
  const orderedPlatforms = preferredPlatform
    ? [
        preferredPlatform,
        ...ROOM_SHARE_PLATFORM_ORDER.filter((platform) => platform !== preferredPlatform),
      ]
    : ROOM_SHARE_PLATFORM_ORDER;

  return orderedPlatforms
    .map((platform) => ({
      platform,
      url: links?.[platform] ?? null,
    }))
    .filter((entry): entry is { platform: RoomSharePlatform; url: string } => Boolean(entry.url));
}

function getRoomSharePlatformLabel(platform: RoomSharePlatform) {
  if (platform === "appleMusic") {
    return "Apple Music";
  }

  if (platform === "soundcloud") {
    return "SoundCloud";
  }

  if (platform === "youtube") {
    return "YouTube";
  }

  return "Spotify";
}

function RoomSharePlatformIcon({ platform }: { platform: RoomSharePlatform }) {
  if (platform === "spotify") {
    return (
      <svg aria-hidden="true" className="size-3.5" viewBox="0 0 24 24">
        <path
          d="M6.4 10.1c3.9-1.2 7.9-.9 11.2.9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <path
          d="M7.4 13.4c2.8-.8 5.8-.5 8.1.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <path
          d="M8.6 16.5c1.9-.5 3.9-.3 5.5.6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (platform === "appleMusic") {
    return (
      <svg aria-hidden="true" className="size-3.5" viewBox="0 0 24 24">
        <path
          d="M14.7 5.2v9.1a2.7 2.7 0 1 1-1.5-2.4V7.1l5.7-1.4v7.1a2.7 2.7 0 1 1-1.5-2.4V4.2z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg aria-hidden="true" className="size-3.5" viewBox="0 0 24 24">
        <path
          d="M20.3 7.7a2.6 2.6 0 0 0-1.8-1.8C16.9 5.5 12 5.5 12 5.5s-4.9 0-6.5.4A2.6 2.6 0 0 0 3.7 7.7 27 27 0 0 0 3.3 12c0 1.5.1 2.9.4 4.3a2.6 2.6 0 0 0 1.8 1.8c1.6.4 6.5.4 6.5.4s4.9 0 6.5-.4a2.6 2.6 0 0 0 1.8-1.8c.3-1.4.4-2.8.4-4.3s-.1-2.9-.4-4.3Z"
          fill="currentColor"
        />
        <path d="m10 15.2 4.8-3.2L10 8.8v6.4Z" fill="var(--surface-base)" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-3.5" viewBox="0 0 24 24">
      <path
        d="M7.3 16.8h9.2a3 3 0 0 0 0-6 4.7 4.7 0 0 0-8.9-1.2A3.5 3.5 0 0 0 7.3 16.8Z"
        fill="currentColor"
      />
      <path
        d="M5.2 16.8h1.3M3.6 14.8h2.9M2.7 12.8h3.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function RoomSharePlatformLinks({
  compact,
  links,
  preferredPlatform,
  title,
}: {
  compact: boolean;
  links: RoomShareItem["links"];
  preferredPlatform?: RoomShareItem["sourcePlatform"];
  title: string;
}) {
  const platformEntries = getRoomSharePlatformEntries(links, preferredPlatform);

  if (!platformEntries.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {platformEntries.map((entry) => (
        <Link
          key={entry.platform}
          aria-label={`Open ${title} on ${getRoomSharePlatformLabel(entry.platform)}`}
          className={
            compact
              ? "inline-flex size-8 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)]"
              : "inline-flex size-9 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)]"
          }
          href={entry.url}
          rel="noreferrer"
          target="_blank"
          title={getRoomSharePlatformLabel(entry.platform)}
        >
          <RoomSharePlatformIcon platform={entry.platform} />
        </Link>
      ))}
    </div>
  );
}

export function RoomShareFeed({
  items,
  activeChannel,
  maxVisibleItems,
  variant = "stacked",
  compact = false,
  onRemoveItem,
  canRemoveItem,
  removingItemId,
}: {
  items: RoomShareItem[];
  activeChannel: string;
  maxVisibleItems?: number;
  variant?: "stacked" | "integrated";
  compact?: boolean;
  onRemoveItem?: (item: RoomShareItem) => void;
  canRemoveItem?: (item: RoomShareItem) => boolean;
  removingItemId?: string | null;
}) {
  const visibleItems =
    typeof maxVisibleItems === "number" ? items.slice(0, maxVisibleItems) : items;

  if (!visibleItems.length) {
    if (variant === "integrated") {
      return (
        <div
          className={
            compact
              ? "flex min-h-[112px] items-center border-y border-[rgba(255,255,255,0.08)] py-3"
              : "flex min-h-[280px] items-center border-y border-[rgba(255,255,255,0.08)] py-4"
          }
        >
          <div className="space-y-2">
            <p
              className={
                compact
                  ? "text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]"
                  : "text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]"
              }
            >
              Nothing in #{activeChannel} yet
            </p>
            <p
              className={
                compact
                  ? "max-w-[24rem] text-[13px] leading-5 text-[var(--text-soft)]"
                  : "max-w-[28rem] text-[14px] leading-6 text-[var(--text-soft)]"
              }
            >
              Use the add button to share the first song, artist, or link into this lane.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="surface-inline-soft rounded-[24px] p-5">
        <div className="space-y-2">
          <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            No drops in #{activeChannel} yet
          </p>
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">
            Use the add button to share the first song, artist, or link into this lane.
          </p>
        </div>
      </div>
    );
  }

  if (variant === "integrated") {
    return (
      <div className="divide-y divide-[rgba(255,255,255,0.08)] border-y border-[rgba(255,255,255,0.08)]">
        {visibleItems.map((item) => {
          const displayTitle = item.resolvedTrack?.trim() || item.title;
          const displaySubtitle = item.resolvedArtist?.trim() || item.subtitle;
          const hasPlatformLinks = getRoomSharePlatformEntries(item.links, item.sourcePlatform).length > 0;
          const showSourceUrl = item.kind !== "song" && Boolean(item.url) && !hasPlatformLinks;
          const removable = canRemoveItem ? canRemoveItem(item) : Boolean(onRemoveItem);
          const removePending = removingItemId === item.id;

          return (
            <div
              key={item.id}
              className={
                compact
                  ? "flex min-h-[66px] items-start justify-between gap-3 py-3"
                  : "flex min-h-[74px] items-start justify-between gap-4 py-3.5"
              }
            >
              <div className="min-w-0 flex flex-1 gap-3">
                <div
                  className={
                    compact
                      ? "surface-pill mt-0.5 grid size-8 shrink-0 place-items-center rounded-[12px] text-[var(--text-soft)]"
                      : "surface-pill mt-0.5 grid size-9 shrink-0 place-items-center rounded-[14px] text-[var(--text-soft)]"
                  }
                >
                  <RoomShareIcon kind={item.kind} />
                </div>
                <div className="min-w-0 space-y-1">
                  <div
                    className={
                      compact
                        ? "flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]"
                        : "flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]"
                    }
                  >
                    <span>{getRoomShareKindLabel(item.kind)}</span>
                    <span className="text-white/18">/</span>
                    <span>{item.addedByName ?? "Someone"}</span>
                  </div>
                  <p
                    className={
                      compact
                        ? "truncate text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]"
                        : "truncate text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]"
                    }
                  >
                    {displayTitle}
                  </p>
                  {displaySubtitle || item.note ? (
                    <div className="space-y-0.5">
                      {displaySubtitle ? (
                        <p
                          className={
                            compact
                              ? "truncate text-[12px] text-[var(--text-soft)]"
                              : "truncate text-[13px] text-[var(--text-soft)]"
                          }
                        >
                          {displaySubtitle}
                        </p>
                      ) : null}
                      {item.note ? (
                        <p
                          className={
                            compact
                              ? "line-clamp-2 text-[11px] leading-4 text-[var(--text-faint)]"
                              : "line-clamp-2 text-[12px] leading-5 text-[var(--text-faint)]"
                          }
                        >
                          {item.note}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {hasPlatformLinks || showSourceUrl || removable ? (
                <div className="flex shrink-0 items-start gap-1.5">
                  <RoomSharePlatformLinks
                    compact={compact}
                    links={item.links}
                    preferredPlatform={item.sourcePlatform}
                    title={displayTitle}
                  />
                  {showSourceUrl ? (
                    <Link
                      className={
                        compact
                          ? "button-secondary inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium"
                          : "button-secondary inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[11px] font-medium"
                      }
                      href={item.url ?? "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {buildRoomShareUrlLabel(item.url ?? "")}
                      <ExternalLink className="size-3.5" />
                    </Link>
                  ) : null}
                  {removable ? (
                    <button
                      aria-label={`Remove ${displayTitle} from #${activeChannel}`}
                      className={
                        compact
                          ? "inline-flex size-8 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
                          : "inline-flex size-9 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
                      }
                      disabled={removePending}
                      onClick={() => {
                        onRemoveItem?.(item);
                      }}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleItems.map((item) => {
        const displayTitle = item.resolvedTrack?.trim() || item.title;
        const displaySubtitle = item.resolvedArtist?.trim() || item.subtitle;
        const hasPlatformLinks = getRoomSharePlatformEntries(item.links, item.sourcePlatform).length > 0;
        const showSourceUrl = item.kind !== "song" && Boolean(item.url) && !hasPlatformLinks;
        const removable = canRemoveItem ? canRemoveItem(item) : Boolean(onRemoveItem);
        const removePending = removingItemId === item.id;

        return (
          <div key={item.id} className="surface-inline-soft rounded-[24px] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="surface-pill inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">
                    <RoomShareIcon kind={item.kind} />
                    {getRoomShareKindLabel(item.kind)}
                  </span>
                  <span className="text-[12px] text-[var(--text-faint)]">
                    Added by {item.addedByName ?? "Someone"}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                    {displayTitle}
                  </p>
                  {displaySubtitle ? (
                    <p className="text-[14px] font-medium text-[var(--text-soft)]">{displaySubtitle}</p>
                  ) : null}
                  {item.note ? (
                    <p className="text-[14px] leading-6 text-[var(--text-soft)]">{item.note}</p>
                  ) : null}
                </div>
              </div>

              {hasPlatformLinks || showSourceUrl || removable ? (
                <div className="flex shrink-0 items-center gap-2">
                  <RoomSharePlatformLinks
                    compact={false}
                    links={item.links}
                    preferredPlatform={item.sourcePlatform}
                    title={displayTitle}
                  />
                  {showSourceUrl ? (
                    <Link
                      className="button-secondary inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-medium"
                      href={item.url ?? "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {buildRoomShareUrlLabel(item.url ?? "")}
                      <ExternalLink className="size-3.5" />
                    </Link>
                  ) : null}
                  {removable ? (
                    <button
                      aria-label={`Remove ${displayTitle} from #${activeChannel}`}
                      className="inline-flex size-10 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-white/[0.06] hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
                      disabled={removePending}
                      onClick={() => {
                        onRemoveItem?.(item);
                      }}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
