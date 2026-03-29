"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  buildGenreColorMap,
  buildOrderedGenreColors,
  getGenreColor,
  normalizeGenre,
  withAlpha,
} from "@/lib/frequency/genre-colors";
import type { HelixTimelineEntry } from "@/lib/frequency/helix-timeline";
import { cn, titleCase } from "@/lib/utils";
import {
  buildVerticalWavePath,
  buildWaveCrossingProgresses,
  getVerticalWavePairAtProgress,
} from "./helix-wave";
import { layoutHelixLabels } from "./taste-helix-layout";

type HelixTimelineProps = {
  entries: HelixTimelineEntry[];
  className?: string;
};

const VIEWBOX_WIDTH = 420;
const DEFAULT_CONTAINER_WIDTH = 360;
const TIMELINE_TOP = 54;
const TIMELINE_BOTTOM = 68;
const MIN_VISIBLE_ROWS = 6;
// These constants are the main tuning surface for how long the expanded helix feels,
// how much room each timeline row gets, and how dramatic the strand shape reads.
const TIMELINE_ROW_GAP = 98;
const HELIX_AMPLITUDE = 72;
const HELIX_POINTS_PER_ROW = 34;
const MIN_HELIX_WAVE_CYCLES = 2.3;
const HELIX_WAVE_CYCLES_PER_ROW = 0.34;
const HELIX_HALO_STROKE_WIDTH = 12;
const HELIX_BODY_STROKE_WIDTH = 6.2;
const HELIX_CORE_STROKE_WIDTH = 2.7;
const HELIX_NODE_HALO_RADIUS = 4.8;
const HELIX_NODE_CORE_RADIUS = 2.5;
const HELIX_CROSSING_WIDTH = 18;
function buildGradientStops(
  entries: Array<{ color: string; progress: number }>,
) {
  if (!entries.length) {
    return [{ color: "#8bb9d8", offset: "0%" }, { color: "#8bb9d8", offset: "100%" }];
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

function getTimelineProgress(index: number, entryCount: number) {
  if (entryCount <= 1) {
    return 0.12;
  }

  return index / (entryCount - 1);
}

export function HelixTimeline({ entries, className }: HelixTimelineProps) {
  const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(0);
  const [containerWidthPx, setContainerWidthPx] = useState(DEFAULT_CONTAINER_WIDTH);
  const gradientId = useId();
  const glowId = useId();
  const nodeGlowId = useId();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rowCount = Math.max(entries.length, MIN_VISIBLE_ROWS);
  const viewBoxHeight = TIMELINE_TOP + TIMELINE_BOTTOM + (rowCount - 1) * TIMELINE_ROW_GAP;
  const helixBottom = viewBoxHeight - TIMELINE_BOTTOM;
  const centerX = VIEWBOX_WIDTH / 2;
  const totalCycles = Math.max(MIN_HELIX_WAVE_CYCLES, rowCount * HELIX_WAVE_CYCLES_PER_ROW);
  const railPointCount = Math.max(180, rowCount * HELIX_POINTS_PER_ROW);
  const stageHeightPx = (viewBoxHeight / VIEWBOX_WIDTH) * containerWidthPx;
  const waveConfig = useMemo(
    () => ({
      amplitude: HELIX_AMPLITUDE,
      bottomY: helixBottom,
      centerX,
      cycles: totalCycles,
      edgeTaper: 0.05,
      sampleCount: railPointCount,
      topY: TIMELINE_TOP,
    }),
    [centerX, helixBottom, railPointCount, totalCycles],
  );
  const railAPath = useMemo(
    () => buildVerticalWavePath(0, waveConfig),
    [waveConfig],
  );
  const railBPath = useMemo(
    () => buildVerticalWavePath(Math.PI, waveConfig),
    [waveConfig],
  );
  const crossingProgresses = useMemo(
    () => buildWaveCrossingProgresses(totalCycles, { endPadding: 0.96, startPadding: 0.04 }),
    [totalCycles],
  );
  const orderedGenreColors = useMemo(
    () => buildOrderedGenreColors(entries.map((entry) => entry.genre)),
    [entries],
  );
  const genreColorMap = useMemo(
    () => buildGenreColorMap(entries.map((entry) => entry.genre)),
    [entries],
  );
  const anchors = useMemo(
    () =>
      entries.map((entry, index) => {
        const progress = getTimelineProgress(index, entries.length);
        const { leftPoint, rightPoint } = getVerticalWavePairAtProgress(progress, waveConfig);
        const side = entry.side ?? (index % 2 === 0 ? "left" : "right");

        return {
          ...entry,
          anchorPoint: side === "left" ? leftPoint : rightPoint,
          glowColor: genreColorMap.get(normalizeGenre(entry.genre)) ?? getGenreColor(entry.genre),
          leftPoint,
          progress,
          rightPoint,
          side,
        };
      }),
    [entries, genreColorMap, waveConfig],
  );
  const gradientStops = useMemo(
    () =>
      buildGradientStops(
        anchors.map((anchor) => ({
          color: anchor.glowColor,
          progress: anchor.progress,
        })),
      ),
    [anchors],
  );
  const labelLayouts = useMemo(
    () =>
      layoutHelixLabels(
        anchors.map((anchor) => ({
          anchorPoint: anchor.anchorPoint,
          artists: anchor.metadataLines,
          id: anchor.id,
          label: anchor.genre,
          side: anchor.side,
        })),
        {
          containerWidthPx,
          viewBoxHeight,
          viewBoxWidth: VIEWBOX_WIDTH,
        },
      ),
    [anchors, containerWidthPx, viewBoxHeight],
  );
  const labelLayoutsById = useMemo(
    () => new Map(labelLayouts.map((layout) => [layout.id, layout])),
    [labelLayouts],
  );
  const topAccentColor = orderedGenreColors[0]?.color ?? "#8bb9d8";
  const middleAccentColor =
    orderedGenreColors[Math.floor(orderedGenreColors.length / 2)]?.color ?? topAccentColor;
  const bottomAccentColor =
    orderedGenreColors[orderedGenreColors.length - 1]?.color ?? topAccentColor;

  useEffect(() => {
    const nextStage = stageRef.current;
    if (!nextStage) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = nextStage.getBoundingClientRect().width;
      if (nextWidth) {
        setContainerWidthPx(nextWidth);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(nextStage);
    return () => observer.disconnect();
  }, []);

  if (!entries.length) {
    return (
      <div className="flex min-h-[360px] items-center justify-center px-4 py-12 text-center">
        <p className="max-w-sm text-[15px] leading-7 text-[var(--text-soft)]">
          This helix will start stretching downward once more genres and drops build a longer history.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="absolute inset-x-12 top-1 h-20 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${withAlpha(topAccentColor, 0.11)}, transparent 74%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-[38%] h-16 w-32 -translate-x-1/2 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${withAlpha(middleAccentColor, 0.08)}, transparent 74%)`,
        }}
      />
      <div
        className="absolute -bottom-6 left-1/2 h-20 w-36 -translate-x-1/2 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${withAlpha(bottomAccentColor, 0.09)}, transparent 74%)`,
        }}
      />

      <div
        ref={stageRef}
        className="relative mx-auto w-full max-w-[820px]"
        style={{ height: stageHeightPx }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <span className="rounded-full border border-white/8 bg-black/18 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/36">
            Right now
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="rounded-full border border-white/8 bg-black/18 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/24">
            Earlier roots
          </span>
        </div>

        <div className="absolute inset-0">
          <svg
            aria-hidden="true"
            className="size-full overflow-visible"
            shapeRendering="geometricPrecision"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${viewBoxHeight}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="50%" x2="50%" y1="0%" y2="100%">
                {gradientStops.map((stop) => (
                  <stop key={`${gradientId}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
              <filter id={glowId}>
                <feGaussianBlur result="blur" stdDeviation="4.8" />
              </filter>
              <filter id={nodeGlowId}>
                <feGaussianBlur result="blur" stdDeviation="2.2" />
              </filter>
            </defs>

            {crossingProgresses.map((progress, index) => {
              const { pointA, pointB } = getVerticalWavePairAtProgress(progress, waveConfig);
              const crossingPoint = {
                x: (pointA.x + pointB.x) / 2,
                y: (pointA.y + pointB.y) / 2,
              };

              return (
                <path
                  key={`crossing-${index}`}
                  d={`M ${(crossingPoint.x - HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)} L ${(crossingPoint.x + HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)}`}
                  fill="none"
                  opacity="0.18"
                  stroke={`url(#${gradientId})`}
                  strokeLinecap="round"
                  strokeWidth="1.1"
                />
              );
            })}

            <path
              d={railAPath}
              fill="none"
              filter={`url(#${glowId})`}
              opacity="0.29"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_HALO_STROKE_WIDTH}
            />
            <path
              d={railBPath}
              fill="none"
              filter={`url(#${glowId})`}
              opacity="0.29"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_HALO_STROKE_WIDTH}
            />
            <path
              d={railAPath}
              fill="none"
              opacity="0.86"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_BODY_STROKE_WIDTH}
            />
            <path
              d={railBPath}
              fill="none"
              opacity="0.86"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_BODY_STROKE_WIDTH}
            />
            <path
              d={railAPath}
              fill="none"
              opacity="0.56"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_CORE_STROKE_WIDTH}
            />
            <path
              d={railBPath}
              fill="none"
              opacity="0.56"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_CORE_STROKE_WIDTH}
            />
            <path
              className="frequency-helix-flow"
              d={railAPath}
              fill="none"
              opacity="0.92"
              stroke="rgba(255,255,255,0.9)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_CORE_STROKE_WIDTH * 0.68}
              style={{ mixBlendMode: "screen" }}
            />
            <path
              className="frequency-helix-flow"
              d={railBPath}
              fill="none"
              opacity="0.92"
              stroke="rgba(255,255,255,0.9)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={HELIX_CORE_STROKE_WIDTH * 0.68}
              style={{ mixBlendMode: "screen" }}
            />

            {anchors.map((anchor) => {
              const layout = labelLayoutsById.get(anchor.id);
              if (!layout) {
                return null;
              }

              const connectorControlX =
                anchor.side === "left"
                  ? Math.max(layout.connectorEndX + 10, anchor.anchorPoint.x - 16)
                  : Math.min(layout.connectorEndX - 10, anchor.anchorPoint.x + 16);

              return (
                <path
                  key={`${anchor.id}-connector`}
                  d={`M ${anchor.anchorPoint.x.toFixed(2)} ${anchor.anchorPoint.y.toFixed(2)} C ${connectorControlX.toFixed(2)} ${anchor.anchorPoint.y.toFixed(2)}, ${connectorControlX.toFixed(2)} ${layout.connectorEndY.toFixed(2)}, ${layout.connectorEndX.toFixed(2)} ${layout.connectorEndY.toFixed(2)}`}
                  fill="none"
                  opacity="0.24"
                  stroke={withAlpha(anchor.glowColor, 0.34)}
                  strokeLinecap="round"
                  strokeWidth="1.7"
                />
              );
            })}

            {anchors.map((anchor, index) => {
              const isActive = activeEntryIndex === index;

              return (
                <g key={`${anchor.id}-anchor`}>
                  <circle
                    cx={anchor.anchorPoint.x}
                    cy={anchor.anchorPoint.y}
                    fill={anchor.glowColor}
                    filter={`url(#${nodeGlowId})`}
                    opacity={isActive ? 0.66 : 0.28}
                    r={isActive ? HELIX_NODE_HALO_RADIUS + 1.2 : HELIX_NODE_HALO_RADIUS}
                  />
                  <circle
                    cx={anchor.anchorPoint.x}
                    cy={anchor.anchorPoint.y}
                    fill={anchor.glowColor}
                    opacity="0.94"
                    r={isActive ? HELIX_NODE_CORE_RADIUS + 0.5 : HELIX_NODE_CORE_RADIUS}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {anchors.map((anchor, index) => {
          const isActive = activeEntryIndex === index;
          const layout = labelLayoutsById.get(anchor.id);

          if (!layout) {
            return null;
          }

          return (
            <div
              key={`${anchor.id}-chip`}
              className={cn(
                "absolute z-10",
                anchor.side === "left" ? "text-right" : "text-left",
              )}
              onMouseEnter={() => setActiveEntryIndex(index)}
              onMouseLeave={() => setActiveEntryIndex(null)}
              style={{
                left: `${(layout.blockX / VIEWBOX_WIDTH) * 100}%`,
                opacity: isActive ? 1 : 0.92,
                top: `${(layout.blockTop / viewBoxHeight) * 100}%`,
                width: `${(layout.blockWidth / VIEWBOX_WIDTH) * 100}%`,
              }}
            >
              <button
                aria-pressed={isActive}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-left backdrop-blur-md transition duration-300",
                  anchor.side === "left" ? "ml-auto" : "mr-auto",
                  isActive ? "text-white shadow-[0_16px_32px_rgba(4,6,10,0.32)]" : "text-white/80",
                )}
                onBlur={() => setActiveEntryIndex(null)}
                onClick={() => setActiveEntryIndex(index)}
                onFocus={() => setActiveEntryIndex(index)}
                style={{
                  background: isActive
                    ? withAlpha(anchor.glowColor, 0.17)
                    : withAlpha(anchor.glowColor, 0.08),
                  borderColor: isActive
                    ? withAlpha(anchor.glowColor, 0.42)
                    : withAlpha(anchor.glowColor, 0.22),
                  width: `${(layout.chipWidth / layout.blockWidth) * 100}%`,
                }}
                type="button"
              >
                <span
                  className={cn(
                    "frequency-helix-chip-shell inline-flex items-center gap-2",
                    anchor.side === "left" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <span
                    className="shrink-0 rounded-full"
                    style={{
                      backgroundColor: anchor.glowColor,
                      boxShadow: `0 0 18px ${anchor.glowColor}`,
                      height: isActive ? "9px" : "7px",
                      width: isActive ? "9px" : "7px",
                    }}
                  />
                  <span className="whitespace-nowrap text-[12px] font-medium tracking-[0.01em]">
                    {titleCase(anchor.genre)}
                  </span>
                </span>
              </button>

              {anchor.metadataLines?.length ? (
                <div
                  className={cn(
                    "mt-2 space-y-0.5 text-[10px] leading-[1.05rem] text-white/46",
                    anchor.side === "left" ? "pr-1" : "pl-1",
                  )}
                >
                  {anchor.metadataLines.slice(0, 2).map((line, metadataIndex) => (
                    <p key={`${anchor.id}-${metadataIndex}`} className="break-words">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
