"use client";

import { useId, useMemo } from "react";
import { X } from "lucide-react";

import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import type { SongActivityItem } from "@/lib/frequency/song-activity";
import type { RoomShareReactionKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SongReactionRow } from "./song-reaction-row";
import {
  buildHorizontalWavePath,
  buildWaveCrossingProgresses,
} from "./helix-wave";
import {
  buildSongFrequencyTimelineLayout,
  buildSongFrequencyTimelineWidth,
} from "./song-frequency-lane-layout";
import { useInitialHorizontalEdgeScroll } from "./use-initial-horizontal-edge-scroll";

type SongFrequencyLaneProps = {
  items: SongActivityItem[];
  className?: string;
  compact?: boolean;
  startLabel?: string | null;
  endLabel?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  onSelectItem?: (item: SongActivityItem) => void;
  onRemoveItem?: (item: SongActivityItem) => void;
  canRemoveItem?: (item: SongActivityItem) => boolean;
  removingItemId?: string | null;
  defaultToRecent?: boolean;
  showReactions?: boolean;
  showSocialDetail?: boolean;
  onToggleReaction?: (item: SongActivityItem, reaction: RoomShareReactionKind) => void;
  reactionUserId?: string | null;
  pendingReactionKey?: string | null;
};

const HERO_VIEWBOX_HEIGHT = 356;
const HERO_REACTION_VIEWBOX_HEIGHT = 392;
const COMPACT_VIEWBOX_HEIGHT = 246;
const COMPACT_REACTION_VIEWBOX_HEIGHT = 278;
const COMPACT_SOCIAL_VIEWBOX_HEIGHT = 308;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getTimelineCycles(itemCount: number, compact: boolean) {
  const minimumCycles = compact ? 3.1 : 3.6;
  const maximumCycles = compact ? 9 : 11;

  return clamp(minimumCycles + itemCount * 0.48, minimumCycles, maximumCycles);
}

function buildGradientStops(entries: Array<{ color: string; progress: number }>) {
  if (!entries.length) {
    return [
      { color: "#8bb9d8", offset: "0%" },
      { color: "#8bb9d8", offset: "100%" },
    ];
  }

  if (entries.length === 1) {
    return [
      { color: entries[0].color, offset: "0%" },
      { color: entries[0].color, offset: "100%" },
    ];
  }

  return entries.flatMap((entry, index) => {
    const offset = `${(entry.progress * 100).toFixed(2)}%`;

    if (index === 0) {
      return [
        { color: entry.color, offset: "0%" },
        { color: entry.color, offset },
      ];
    }

    if (index === entries.length - 1) {
      return [
        { color: entry.color, offset },
        { color: entry.color, offset: "100%" },
      ];
    }

    return [{ color: entry.color, offset }];
  });
}

export function SongFrequencyLane({
  items,
  className,
  compact = false,
  startLabel = "Earlier uploads",
  endLabel = "Recent uploads",
  emptyTitle = "No songs on this frequency yet",
  emptyBody = "Add music to start the lane.",
  onSelectItem,
  onRemoveItem,
  canRemoveItem,
  removingItemId,
  defaultToRecent = true,
  showReactions = false,
  showSocialDetail = false,
  onToggleReaction,
  reactionUserId,
  pendingReactionKey,
}: SongFrequencyLaneProps) {
  const gradientId = useId();
  const glowId = useId();
  const { contentRef, isInitialPositioned, scrollerRef } =
    useInitialHorizontalEdgeScroll({
      debugLabel: compact ? "song_frequency_lane_compact" : "song_frequency_lane",
      enabled: defaultToRecent,
    });
  const reactionMode = showReactions || showSocialDetail;
  const socialDetailMode = compact && showSocialDetail;
  const viewBoxHeight = compact
    ? socialDetailMode
      ? COMPACT_SOCIAL_VIEWBOX_HEIGHT
      : reactionMode
        ? COMPACT_REACTION_VIEWBOX_HEIGHT
        : COMPACT_VIEWBOX_HEIGHT
    : reactionMode
      ? HERO_REACTION_VIEWBOX_HEIGHT
      : HERO_VIEWBOX_HEIGHT;
  const contentWidth = useMemo(
    () => buildSongFrequencyTimelineWidth(items, compact, reactionMode),
    [compact, items, reactionMode],
  );
  const waveConfig = useMemo(
    () => ({
      amplitude: compact ? 20 : 30,
      centerY: viewBoxHeight / 2,
      cycles: getTimelineCycles(items.length, compact),
      edgeTaper: 0.05,
      leftX: compact ? 84 : 120,
      rightX: contentWidth - (compact ? 84 : 120),
      sampleCount: Math.max(compact ? 240 : 320, Math.round(contentWidth / 4)),
    }),
    [compact, contentWidth, items.length, viewBoxHeight],
  );
  const nodes = useMemo(
    () =>
      buildSongFrequencyTimelineLayout({
        compact,
        items,
        reactionMode,
        socialDetailMode,
        waveConfig,
      }),
    [compact, items, reactionMode, socialDetailMode, waveConfig],
  );
  const gradientEntries = useMemo(
    () =>
      nodes.map((node) => ({
        color: getGenreColor(node.item.primaryGenre ?? "frequency"),
        progress: node.progress,
      })),
    [nodes],
  );
  const gradientStops = useMemo(
    () => buildGradientStops(gradientEntries),
    [gradientEntries],
  );
  const railAPath = useMemo(() => buildHorizontalWavePath(0, waveConfig), [waveConfig]);
  const railBPath = useMemo(
    () => buildHorizontalWavePath(Math.PI, waveConfig),
    [waveConfig],
  );
  const crossingProgresses = useMemo(
    () =>
      buildWaveCrossingProgresses(waveConfig.cycles, {
        endPadding: 0.94,
        startPadding: 0.06,
      }),
    [waveConfig.cycles],
  );
  const leadingColor = gradientStops[0]?.color ?? "#8bb9d8";
  const trailingColor = gradientStops[gradientStops.length - 1]?.color ?? leadingColor;

  return (
    <div className={cn("space-y-3", className)}>
      {startLabel || endLabel ? (
        <div
          className={cn(
            "flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)]",
            startLabel && endLabel ? "justify-between" : "justify-start",
          )}
        >
          {startLabel ? <span>{startLabel}</span> : null}
          {endLabel ? <span>{endLabel}</span> : null}
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        className={cn(
          "overflow-x-auto pb-3 transition-opacity duration-150 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isInitialPositioned ? "opacity-100" : "opacity-0",
        )}
        style={{ overflowAnchor: "none" }}
      >
        <div
          ref={contentRef}
          className="relative min-w-full"
          style={{ height: `${viewBoxHeight}px`, width: `${contentWidth}px` }}
        >
          <div
            className={cn(
              "pointer-events-none absolute left-6 top-1/2 h-28 w-40 -translate-y-1/2 rounded-full blur-3xl",
              compact ? "opacity-60" : "opacity-80",
            )}
            style={{
              background: `radial-gradient(circle, ${withAlpha(leadingColor, 0.16)}, transparent 74%)`,
            }}
          />
          <div
            className={cn(
              "pointer-events-none absolute right-6 top-1/2 h-28 w-40 -translate-y-1/2 rounded-full blur-3xl",
              compact ? "opacity-60" : "opacity-80",
            )}
            style={{
              background: `radial-gradient(circle, ${withAlpha(trailingColor, 0.16)}, transparent 74%)`,
            }}
          />
          {!compact ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[84px] opacity-80"
              style={{
                background: `radial-gradient(circle, ${withAlpha(leadingColor, 0.12)} 0%, ${withAlpha(
                  trailingColor,
                  0.08,
                )} 44%, transparent 78%)`,
              }}
            />
          ) : null}

          <svg
            aria-hidden="true"
            className="absolute inset-0 block h-full w-full"
            shapeRendering="geometricPrecision"
            viewBox={`0 0 ${contentWidth} ${viewBoxHeight}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" x2="100%" y1="50%" y2="50%">
                {gradientStops.map((stop, index) => (
                  <stop
                    key={`${gradientId}-${index}-${stop.offset}`}
                    offset={stop.offset}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
              <filter id={glowId}>
                <feGaussianBlur result="blur" stdDeviation={compact ? 3 : 3.5} />
              </filter>
            </defs>

            {crossingProgresses.map((progress, index) => {
              const x = waveConfig.leftX + progress * (waveConfig.rightX - waveConfig.leftX);

              return (
                <path
                  key={`crossing-${index}`}
                  d={`M ${x.toFixed(2)} ${(waveConfig.centerY - (compact ? 8 : 10)).toFixed(2)} L ${x.toFixed(2)} ${(waveConfig.centerY + (compact ? 8 : 10)).toFixed(2)}`}
                  fill="none"
                  opacity="0.12"
                  stroke={`url(#${gradientId})`}
                  strokeLinecap="round"
                  strokeWidth="1"
                />
              );
            })}

            <path
              d={railAPath}
              fill="none"
              filter={`url(#${glowId})`}
              opacity="0.22"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 8.4 : 9.4}
            />
            <path
              d={railBPath}
              fill="none"
              filter={`url(#${glowId})`}
              opacity="0.22"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 8.4 : 9.4}
            />
            <path
              d={railAPath}
              fill="none"
              opacity="0.92"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 4.6 : 5.2}
            />
            <path
              d={railBPath}
              fill="none"
              opacity="0.92"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 4.6 : 5.2}
            />
            <path
              d={railAPath}
              fill="none"
              opacity="0.46"
              stroke="rgba(255,255,255,0.84)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 1.5 : 1.8}
            />
            <path
              className="frequency-lane-flow"
              d={railAPath}
              fill="none"
              opacity="0.94"
              stroke="rgba(255,255,255,0.96)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 0.95 : 1.1}
              style={{ mixBlendMode: "screen" }}
            />
            <path
              d={railBPath}
              fill="none"
              opacity="0.46"
              stroke="rgba(255,255,255,0.84)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 1.5 : 1.8}
            />
            <path
              className="frequency-lane-flow"
              d={railBPath}
              fill="none"
              opacity="0.94"
              stroke="rgba(255,255,255,0.96)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 0.95 : 1.1}
              style={{ animationDelay: "-2.2s", mixBlendMode: "screen" }}
            />
          </svg>

          {nodes.map((node) => {
            const accentColor = getGenreColor(node.item.primaryGenre ?? "frequency");
            const removable = canRemoveItem ? canRemoveItem(node.item) : Boolean(onRemoveItem);
            const removePending = removingItemId === node.item.id;

            return (
              <div key={node.item.id}>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute w-px"
                  style={{
                    background: `linear-gradient(180deg, ${withAlpha(accentColor, 0.84)}, ${withAlpha(accentColor, 0.12)})`,
                    height: `${node.connectorHeight}px`,
                    left: `${node.anchorX}px`,
                    opacity: 0.92,
                    top: `${node.connectorTop}px`,
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background: accentColor,
                    boxShadow: `0 0 0 4px ${withAlpha(accentColor, 0.18)}, 0 0 14px ${withAlpha(
                      accentColor,
                      0.42,
                    )}`,
                    left: `${node.anchorX}px`,
                    top: `${node.anchorY}px`,
                  }}
                />

                <div
                  className="absolute"
                  style={{
                    height: `${node.tagHeight}px`,
                    left: `${node.tagLeft}px`,
                    top: `${node.tagTop}px`,
                    width: `${node.tagWidth}px`,
                  }}
                >
                  {removable ? (
                    <button
                      aria-label={`Remove ${node.item.title}`}
                      className="absolute -right-2 -top-2 z-10 inline-flex size-6 items-center justify-center rounded-full border border-white/10 bg-[rgba(10,12,18,0.94)] text-[var(--text-faint)] transition hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
                      disabled={removePending}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveItem?.(node.item);
                      }}
                      type="button"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}

                  <div
                    aria-label={`${node.item.title} by ${node.item.artist}`}
                    className={cn(
                      "group relative flex h-full min-h-full w-full flex-col justify-center overflow-hidden rounded-[24px] border px-3.5 py-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:[filter:brightness(1.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      compact
                        ? socialDetailMode
                          ? "rounded-[22px] px-3 py-3"
                          : "rounded-[22px] px-3 py-2.5"
                        : "rounded-[26px] px-4 py-4",
                    )}
                    onClick={() => onSelectItem?.(node.item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectItem?.(node.item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      background: `linear-gradient(180deg, ${withAlpha(accentColor, 0.2)}, rgba(10,12,18,0.9) 76%)`,
                      borderColor: withAlpha(accentColor, 0.28),
                      boxShadow: `0 18px 34px rgba(0,0,0,0.24), inset 0 1px 0 ${withAlpha(
                        accentColor,
                        0.18,
                      )}`,
                    }}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${withAlpha(
                          accentColor,
                          0.84,
                        )}, transparent)`,
                      }}
                    />
                    <div
                      className={cn(
                        "min-w-0",
                        socialDetailMode || reactionMode ? "space-y-1.5" : "space-y-1",
                      )}
                    >
                      <div className={cn("min-w-0", reactionMode ? "space-y-1.5" : "space-y-1")}>
                        <p
                          className={cn(
                            "truncate text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]",
                            compact ? "text-[14px]" : "text-[16px]",
                          )}
                        >
                          {node.item.title}
                        </p>
                        <p
                          className={cn(
                            "truncate leading-5 text-[var(--text-soft)]",
                            compact ? "text-[11.5px]" : "text-[12px]",
                          )}
                        >
                          {node.item.artist}
                          <span className="px-1 text-[var(--text-faint)]">•</span>
                          <span className="text-[var(--text-faint)]">
                            {compact ? "by " : "uploaded by "}
                            {node.item.uploadedBy.displayName}
                          </span>
                        </p>
                      </div>
                      {socialDetailMode && node.item.comment ? (
                        <p className="line-clamp-1 text-[11px] leading-4 text-[var(--text-soft)]">
                          {node.item.comment}
                        </p>
                      ) : null}
                      {reactionMode ? (
                        <SongReactionRow
                          className="pt-1"
                          itemId={node.item.id}
                          onToggleReaction={(reaction) => onToggleReaction?.(node.item, reaction)}
                          pendingReactionKey={pendingReactionKey}
                          reactionUserId={reactionUserId}
                          reactions={node.item.reactions}
                          roomId={node.item.roomId}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!nodes.length ? (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="max-w-md text-center">
                <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  {emptyTitle}
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                  {emptyBody}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
