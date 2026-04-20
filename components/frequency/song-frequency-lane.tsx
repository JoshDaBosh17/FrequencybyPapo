"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";

import { IS_FREQUENCY_DEMO_MODE } from "@/lib/frequency/demo-mode";
import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import type { SongActivityItem } from "@/lib/frequency/song-activity";
import type { RoomShareReactionKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SongReactionRow } from "./song-reaction-row";
import {
  buildHorizontalWavePath,
  getHorizontalWavePairAtProgress,
  buildWaveCrossingProgresses,
} from "./helix-wave";
import {
  buildSongFrequencyTimelineLayout,
  buildSongFrequencyTimelineWidth,
} from "./song-frequency-lane-layout";
import { TimelineArtAtmosphere } from "./timeline-art-atmosphere";
import { useInitialHorizontalEdgeScroll } from "./use-initial-horizontal-edge-scroll";

type SongFrequencyLaneProps = {
  items: SongActivityItem[];
  className?: string;
  compact?: boolean;
  spaciousMobile?: boolean;
  startLabel?: string | null;
  endLabel?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  hideVisualizationWhenEmpty?: boolean;
  showDateMarkers?: boolean;
  onSelectItem?: (item: SongActivityItem) => void;
  onEditItem?: (item: SongActivityItem) => void;
  canEditItem?: (item: SongActivityItem) => boolean;
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
const MOBILE_HERO_VIEWBOX_HEIGHT = 320;
const MOBILE_HERO_REACTION_VIEWBOX_HEIGHT = 352;
const SPACIOUS_MOBILE_HERO_VIEWBOX_HEIGHT = 392;
const SPACIOUS_MOBILE_HERO_REACTION_VIEWBOX_HEIGHT = 430;
const COMPACT_VIEWBOX_HEIGHT = 246;
const COMPACT_REACTION_VIEWBOX_HEIGHT = 278;
const COMPACT_SOCIAL_VIEWBOX_HEIGHT = 308;

function useIsMobileTimelineViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const handleChange = () => {
      setIsMobile(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
}

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

function getDayMarkerKey(value: unknown) {
  const timestampMs = normalizeTimestampMs(value);

  if (!timestampMs) {
    return "undated";
  }

  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimelineDateLabel(value: unknown) {
  const timestampMs = normalizeTimestampMs(value);

  if (!timestampMs) {
    return "Undated";
  }

  const date = new Date(timestampMs);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(date);
}

function getNearestCrossingProgress(progress: number, crossings: number[]) {
  if (!crossings.length) {
    return progress;
  }

  const nearest = crossings.reduce((best, crossing) =>
    Math.abs(crossing - progress) < Math.abs(best - progress) ? crossing : best,
  );

  return Math.abs(nearest - progress) <= 0.075 ? nearest : progress;
}

export function SongFrequencyLane({
  items,
  className,
  compact = false,
  spaciousMobile = false,
  startLabel = "Earlier uploads",
  endLabel = "Recent uploads",
  emptyTitle = "No songs on this frequency yet",
  emptyBody = "Add music to start the lane.",
  hideVisualizationWhenEmpty = false,
  showDateMarkers = false,
  onSelectItem,
  onEditItem,
  canEditItem,
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
  const isMobileTimelineViewport = useIsMobileTimelineViewport();
  const mobileHeroMode = !compact && isMobileTimelineViewport;
  const spaciousMobileMode = mobileHeroMode && spaciousMobile;
  const { contentRef, isInitialPositioned, scrollerRef } =
    useInitialHorizontalEdgeScroll({
      debugLabel: compact
        ? "song_frequency_lane_compact"
        : mobileHeroMode
          ? "song_frequency_lane_mobile"
          : "song_frequency_lane",
      enabled: defaultToRecent,
    });
  const reactionMode = showReactions || showSocialDetail;
  const socialDetailMode = compact && showSocialDetail;
  const dateMarkerMode = showDateMarkers && !compact;
  const viewBoxHeight = compact
    ? socialDetailMode
      ? COMPACT_SOCIAL_VIEWBOX_HEIGHT
      : reactionMode
        ? COMPACT_REACTION_VIEWBOX_HEIGHT
        : COMPACT_VIEWBOX_HEIGHT
    : mobileHeroMode
      ? reactionMode
        ? spaciousMobileMode
          ? SPACIOUS_MOBILE_HERO_REACTION_VIEWBOX_HEIGHT
          : MOBILE_HERO_REACTION_VIEWBOX_HEIGHT
        : spaciousMobileMode
          ? SPACIOUS_MOBILE_HERO_VIEWBOX_HEIGHT
          : MOBILE_HERO_VIEWBOX_HEIGHT
      : reactionMode
        ? HERO_REACTION_VIEWBOX_HEIGHT
        : HERO_VIEWBOX_HEIGHT;
  const contentWidth = useMemo(
    () => buildSongFrequencyTimelineWidth(items, compact, mobileHeroMode, reactionMode),
    [compact, items, mobileHeroMode, reactionMode],
  );
  const waveConfig = useMemo(
    () => ({
      amplitude: compact ? 20 : mobileHeroMode ? 34 : 30,
      centerY: viewBoxHeight / 2,
      cycles: getTimelineCycles(items.length, compact),
      edgeTaper: 0.05,
      leftX: compact ? 84 : mobileHeroMode ? 96 : 120,
      rightX: contentWidth - (compact ? 84 : mobileHeroMode ? 96 : 120),
      sampleCount: Math.max(compact ? 240 : mobileHeroMode ? 280 : 320, Math.round(contentWidth / 4)),
    }),
    [compact, contentWidth, items.length, mobileHeroMode, viewBoxHeight],
  );
  const nodes = useMemo(
    () =>
      buildSongFrequencyTimelineLayout({
        compact,
        dateMarkerMode,
        items,
        mobileHeroMode,
        reactionMode,
        socialDetailMode,
        waveConfig,
      }),
    [compact, dateMarkerMode, items, mobileHeroMode, reactionMode, socialDetailMode, waveConfig],
  );
  const gradientEntries = useMemo(
    () =>
      nodes.map((node) => ({
        color: getGenreColor(node.item.visualAccentKey),
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
  const dateMarkers = useMemo(() => {
    if (!showDateMarkers || compact || nodes.length === 0) {
      return [];
    }

    const markers: Array<{
      key: string;
      label: string;
      x: number;
      y: number;
    }> = [];
    let previousDayKey: string | null = null;

    nodes.forEach((node, index) => {
      const dayKey = getDayMarkerKey(node.item.createdAt);

      if (dayKey === previousDayKey) {
        return;
      }

      const previousNode = nodes[index - 1];
      const breakProgress = previousNode
        ? (previousNode.progress + node.progress) / 2
        : Math.max(0.03, node.progress - 0.045);
      const markerProgress = getNearestCrossingProgress(breakProgress, crossingProgresses);
      const { pointA, pointB } = getHorizontalWavePairAtProgress(markerProgress, waveConfig);

      markers.push({
        key: `${dayKey}-${index}`,
        label: formatTimelineDateLabel(node.item.createdAt),
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2,
      });
      previousDayKey = dayKey;
    });

    return markers;
  }, [compact, crossingProgresses, nodes, showDateMarkers, waveConfig]);
  const leadingColor = gradientStops[0]?.color ?? "#8bb9d8";
  const trailingColor = gradientStops[gradientStops.length - 1]?.color ?? leadingColor;
  const isEmpty = nodes.length === 0;
  const showEmptyVisualization = isEmpty && !hideVisualizationWhenEmpty;
  const demoPresentationMode = IS_FREQUENCY_DEMO_MODE && !compact;
  const railGlowOpacity = showEmptyVisualization ? 0.34 : demoPresentationMode ? 0.32 : 0.22;
  const railBodyOpacity = showEmptyVisualization ? 0.98 : demoPresentationMode ? 1 : 0.92;
  const railCoreOpacity = showEmptyVisualization ? 0.72 : demoPresentationMode ? 0.7 : 0.46;
  const railFlowOpacity = showEmptyVisualization ? 1 : demoPresentationMode ? 1 : 0.94;
  const shouldShowLane = demoPresentationMode || isInitialPositioned || mobileHeroMode;

  useEffect(() => {
    if (!mobileHeroMode) {
      return;
    }

    const scroller = scrollerRef.current;
    console.log("[frequency][timeline-mobile-layout]", {
      clientHeight: scroller?.clientHeight ?? null,
      clientWidth: scroller?.clientWidth ?? null,
      contentWidth,
      debugLabel: "song_frequency_lane_mobile",
      itemCount: items.length,
      scrollWidth: scroller?.scrollWidth ?? null,
      tagCount: nodes.length,
      viewBoxHeight,
    });
  }, [contentRef, contentWidth, items.length, mobileHeroMode, nodes.length, scrollerRef, viewBoxHeight]);

  if (isEmpty && hideVisualizationWhenEmpty) {
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

        <div className="flex min-h-[120px] items-center justify-center px-4 py-4 text-center sm:min-h-[132px]">
          <p className="text-[15px] font-medium leading-6 text-[var(--text-soft)]">
            {emptyBody}
          </p>
        </div>
      </div>
    );
  }

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
          spaciousMobileMode
            ? "min-h-[430px] sm:min-h-0"
            : mobileHeroMode
              ? "min-h-[352px] sm:min-h-0"
              : null,
          shouldShowLane ? "opacity-100" : "opacity-0",
        )}
        style={{ overflowAnchor: "none" }}
      >
        <div
          ref={contentRef}
          className="relative min-w-full"
          style={{ height: `${viewBoxHeight}px`, width: `${contentWidth}px` }}
        >
          {demoPresentationMode ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[8%] top-1/2 z-0 h-32 -translate-y-1/2 rounded-full blur-[74px]"
              style={{
                background: `radial-gradient(circle, rgba(255,255,255,0.08) 0%, ${withAlpha(
                  leadingColor,
                  0.12,
                )} 34%, ${withAlpha(trailingColor, 0.08)} 58%, transparent 78%)`,
              }}
            />
          ) : null}
          <div
            className={cn(
              "pointer-events-none absolute left-6 top-1/2 z-0 h-28 w-40 -translate-y-1/2 rounded-full blur-3xl",
              compact ? "opacity-60" : mobileHeroMode ? "opacity-88" : "opacity-80",
            )}
            style={{
              background: `radial-gradient(circle, ${withAlpha(leadingColor, 0.16)}, transparent 74%)`,
            }}
          />
          <div
            className={cn(
              "pointer-events-none absolute right-6 top-1/2 z-0 h-28 w-40 -translate-y-1/2 rounded-full blur-3xl",
              compact ? "opacity-60" : mobileHeroMode ? "opacity-88" : "opacity-80",
            )}
            style={{
              background: `radial-gradient(circle, ${withAlpha(trailingColor, 0.16)}, transparent 74%)`,
            }}
          />
          {!compact ? (
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[84px]",
                mobileHeroMode ? "h-52 w-[68%] opacity-88" : "h-48 w-[58%] opacity-80",
              )}
              style={{
                background: `radial-gradient(circle, ${withAlpha(leadingColor, 0.12)} 0%, ${withAlpha(
                  trailingColor,
                  0.08,
                )} 44%, transparent 78%)`,
              }}
            />
          ) : null}

          <TimelineArtAtmosphere
            compact={compact}
            contentWidth={contentWidth}
            mobileHeroMode={mobileHeroMode}
            nodes={nodes}
            viewBoxHeight={viewBoxHeight}
          />

          <svg
            aria-hidden="true"
            className="absolute inset-0 z-10 block h-full w-full"
            shapeRendering="geometricPrecision"
            style={{
              filter: demoPresentationMode
                ? "drop-shadow(0 0 14px rgba(255,255,255,0.12)) drop-shadow(0 0 26px rgba(139,185,216,0.12))"
                : undefined,
            }}
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
              opacity={railGlowOpacity}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 8.4 : 9.4}
            />
            <path
              d={railBPath}
              fill="none"
              filter={`url(#${glowId})`}
              opacity={railGlowOpacity}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 8.4 : 9.4}
            />
            {demoPresentationMode ? (
              <>
                <path
                  d={railAPath}
                  fill="none"
                  opacity="0.16"
                  stroke="rgba(255,255,255,0.48)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="11.2"
                />
                <path
                  d={railBPath}
                  fill="none"
                  opacity="0.16"
                  stroke="rgba(255,255,255,0.48)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="11.2"
                />
              </>
            ) : null}
            <path
              d={railAPath}
              fill="none"
              opacity={railBodyOpacity}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 4.6 : 5.2}
            />
            <path
              d={railBPath}
              fill="none"
              opacity={railBodyOpacity}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 4.6 : 5.2}
            />
            <path
              d={railAPath}
              fill="none"
              opacity={railCoreOpacity}
              stroke="rgba(255,255,255,0.84)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 1.5 : 1.8}
            />
            <path
              className="frequency-lane-flow"
              d={railAPath}
              fill="none"
              opacity={railFlowOpacity}
              stroke="rgba(255,255,255,0.96)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 0.95 : 1.1}
              style={{ mixBlendMode: "screen" }}
            />
            <path
              d={railBPath}
              fill="none"
              opacity={railCoreOpacity}
              stroke="rgba(255,255,255,0.84)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 1.5 : 1.8}
            />
            <path
              className="frequency-lane-flow"
              d={railBPath}
              fill="none"
              opacity={railFlowOpacity}
              stroke="rgba(255,255,255,0.96)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 0.95 : 1.1}
              style={{ animationDelay: "-2.2s", mixBlendMode: "screen" }}
            />
          </svg>

          {dateMarkers.map((marker) => (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-[25]"
              key={marker.key}
              style={{
                left: `${marker.x}px`,
                top: `${marker.y}px`,
              }}
            >
              <div className="absolute left-1/2 top-1/2 h-9 w-px -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.34),transparent)]" />
              <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-[rgba(244,241,234,0.92)] shadow-[0_0_0_5px_rgba(255,255,255,0.08),0_0_18px_rgba(255,255,255,0.18)]" />
              <div className="absolute left-1/2 top-[-8px] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-white/10 bg-[rgba(5,7,11,0.76)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] shadow-[0_10px_26px_rgba(0,0,0,0.24)] backdrop-blur-md">
                {marker.label}
              </div>
            </div>
          ))}

          {nodes.map((node) => {
            const accentColor = getGenreColor(node.item.visualAccentKey);
            const editable = canEditItem ? canEditItem(node.item) : Boolean(onEditItem);
            const removable = canRemoveItem ? canRemoveItem(node.item) : Boolean(onRemoveItem);
            const removePending = removingItemId === node.item.id;

            return (
              <div key={node.item.id}>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute z-20 w-px"
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
                  className="pointer-events-none absolute z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
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
                  className="absolute z-30"
                  style={{
                    height: `${node.tagHeight}px`,
                    left: `${node.tagLeft}px`,
                    top: `${node.tagTop}px`,
                    width: `${node.tagWidth}px`,
                  }}
                >
                  {editable || removable ? (
                    <div className="absolute -right-2 -top-2 z-10 flex items-center gap-1">
                      {editable ? (
                        <button
                          aria-label={`Edit ${node.item.title}`}
                          className="inline-flex size-6 items-center justify-center rounded-full border border-white/10 bg-[rgba(10,12,18,0.94)] text-[var(--text-faint)] transition hover:text-[var(--text)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditItem?.(node.item);
                          }}
                          type="button"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      ) : null}
                      {removable ? (
                        <button
                          aria-label={`Remove ${node.item.title}`}
                          className="inline-flex size-6 items-center justify-center rounded-full border border-white/10 bg-[rgba(10,12,18,0.94)] text-[var(--text-faint)] transition hover:text-[var(--text)] disabled:cursor-wait disabled:opacity-45"
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
                    </div>
                  ) : null}

                  <div
                    aria-label={`${node.item.title} by ${node.item.artist}`}
                    className={cn(
                      "group relative flex h-full min-h-full w-full flex-col justify-center overflow-hidden rounded-[24px] border px-3.5 py-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:[filter:brightness(1.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      compact
                        ? socialDetailMode
                          ? "rounded-[22px] px-3 py-3"
                          : "rounded-[22px] px-3 py-2.5"
                        : mobileHeroMode
                          ? "rounded-[24px] px-3.5 py-3"
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
                            compact ? "text-[14px]" : mobileHeroMode ? "text-[15px]" : "text-[16px]",
                          )}
                        >
                          {node.item.title}
                        </p>
                        <p
                          className={cn(
                            "truncate leading-5 text-[var(--text-soft)]",
                            compact ? "text-[11.5px]" : mobileHeroMode ? "text-[11.5px]" : "text-[12px]",
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
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-6 sm:bottom-5">
              <div className="max-w-md rounded-full border border-white/10 bg-[rgba(5,7,11,0.72)] px-4 py-2.5 text-center shadow-[0_10px_32px_rgba(0,0,0,0.22)] backdrop-blur-md">
                <p className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  {emptyTitle}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[var(--text-soft)]">
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
