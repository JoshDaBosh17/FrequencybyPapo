"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  buildGenreColorMap,
  buildOrderedGenreColors,
  getGenreColor,
  normalizeGenre,
  withAlpha,
} from "@/lib/frequency/genre-colors";
import { cn, titleCase } from "@/lib/utils";
import {
  buildVerticalWavePath,
  buildWaveCrossingProgresses,
  getVerticalWavePairAtProgress,
} from "./helix-wave";
import { layoutHelixLabels } from "./taste-helix-layout";

export type TasteHelixTag = {
  label: string;
  artists?: string[];
  weight?: number;
  side?: "left" | "right";
};

type TasteHelixProps = {
  helixTags?: TasteHelixTag[];
  helixColors?: string[];
  overviewText?: string;
  labelText?: string;
  className?: string;
  onExpand?: () => void;
  useSampleFallback?: boolean;
  surface?: "panel" | "bare";
};

const SAMPLE_HELIX_TAGS: TasteHelixTag[] = [
  { label: "alt pop", artists: ["The Japanese House", "Maggie Rogers"], weight: 94, side: "left" },
  { label: "afro house", artists: ["Shimza", "Black Coffee"], weight: 88, side: "right" },
  { label: "neo soul", artists: ["Ravyn Lenae", "Snoh Aalegra"], weight: 78, side: "left" },
  { label: "indie electronic", artists: ["Four Tet", "Caribou"], weight: 72, side: "right" },
  { label: "r&b", artists: ["SZA", "Brent Faiyaz"], weight: 66, side: "left" },
  { label: "late-night dance", artists: ["Overmono"], weight: 58, side: "right" },
];

// These geometry values set the overall silhouette. Adjust them to make the helix
// taller, tighter, or more dramatic without rewriting the rendering logic.
const VIEWBOX_WIDTH = 360;
const BASE_VIEWBOX_HEIGHT = 520;
// Tune this to compress or relax the hero without weakening the rail weight or label sizing.
const HELIX_HEIGHT_FACTOR = 0.66;
const VIEWBOX_HEIGHT = Math.round(BASE_VIEWBOX_HEIGHT * HELIX_HEIGHT_FACTOR);
const HELIX_TOP = Math.round(42 * HELIX_HEIGHT_FACTOR);
const HELIX_BOTTOM = Math.round(478 * HELIX_HEIGHT_FACTOR);
const HELIX_CENTER_X = VIEWBOX_WIDTH / 2;
const HELIX_AMPLITUDE = 58;
const HELIX_WAVE_CYCLES = 2.08;
const HELIX_POINTS = 164;
const DEFAULT_CONTAINER_WIDTH = 280;
const MAX_HELIX_TAGS = 10;
const HELIX_STAGE_ASPECT_RATIO = `${VIEWBOX_WIDTH} / ${VIEWBOX_HEIGHT}`;
const HELIX_HALO_STROKE_WIDTH = 12;
const HELIX_BODY_STROKE_WIDTH = 6.4;
const HELIX_CORE_STROKE_WIDTH = 2.8;
const HELIX_NODE_HALO_RADIUS = 5.2;
const HELIX_NODE_HALO_ACTIVE_RADIUS = 7.4;
const HELIX_NODE_CORE_RADIUS = 2.2;
const HELIX_NODE_CORE_ACTIVE_RADIUS = 3;
const HELIX_CROSSING_WIDTH = 18;
// This is the simplest place to rebalance where tags attach along the helix.
const TAG_PROGRESS_STOPS = [0.1, 0.25, 0.41, 0.57, 0.74, 0.89] as const;
const HELIX_WAVE_CONFIG = {
  amplitude: HELIX_AMPLITUDE,
  bottomY: HELIX_BOTTOM,
  centerX: HELIX_CENTER_X,
  cycles: HELIX_WAVE_CYCLES,
  edgeTaper: 0.06,
  sampleCount: HELIX_POINTS,
  topY: HELIX_TOP,
} as const;

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

function getChipIntensity(weight: number, strongestWeight: number) {
  if (!strongestWeight) {
    return 0.72;
  }

  return 0.58 + (weight / strongestWeight) * 0.42;
}

export function TasteHelix({
  helixTags = SAMPLE_HELIX_TAGS,
  helixColors,
  overviewText = "Your taste is taking shape.",
  labelText = "Your frequency",
  className,
  onExpand,
  useSampleFallback = true,
  surface = "panel",
}: TasteHelixProps) {
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(0);
  const [containerWidthPx, setContainerWidthPx] = useState(DEFAULT_CONTAINER_WIDTH);
  const gradientId = useId();
  const glowId = useId();
  const nodeGlowId = useId();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const resolvedTags = useMemo(
    () =>
      helixTags.length
        ? helixTags.slice(0, MAX_HELIX_TAGS)
        : useSampleFallback
          ? SAMPLE_HELIX_TAGS
          : [],
    [helixTags, useSampleFallback],
  );
  const orderedGenreColors = useMemo(() => {
    return buildOrderedGenreColors(
      resolvedTags.map((tag) => tag.label),
      helixColors,
    );
  }, [helixColors, resolvedTags]);
  const genreColorMap = useMemo(
    () => buildGenreColorMap(resolvedTags.map((tag) => tag.label), helixColors),
    [helixColors, resolvedTags],
  );
  const strongestWeight = Math.max(...resolvedTags.map((tag) => tag.weight ?? 0), 0);
  const railAPath = useMemo(
    () => buildVerticalWavePath(0, HELIX_WAVE_CONFIG),
    [],
  );
  const railBPath = useMemo(
    () => buildVerticalWavePath(Math.PI, HELIX_WAVE_CONFIG),
    [],
  );
  const crossingProgresses = useMemo(
    () => buildWaveCrossingProgresses(HELIX_WAVE_CYCLES, { endPadding: 0.92, startPadding: 0.08 }),
    [],
  );
  const anchors = useMemo(
    () =>
      resolvedTags.map((tag, index) => {
        // Anchor chips to a small set of stable progress stops so the composition stays
        // readable on mobile and desktop even before we wire in real personalization rules.
        const progress = TAG_PROGRESS_STOPS[index] ?? (index + 1) / (resolvedTags.length + 1);
        const { leftPoint, rightPoint } = getVerticalWavePairAtProgress(progress, HELIX_WAVE_CONFIG);
        const side = tag.side ?? (index % 2 === 0 ? "left" : "right");
        const anchorPoint = side === "left" ? leftPoint : rightPoint;

        return {
          ...tag,
          id: `${tag.label}-${index}`,
          intensity: getChipIntensity(tag.weight ?? 0, strongestWeight),
          progress,
          side,
          anchorPoint,
          glowColor: genreColorMap.get(normalizeGenre(tag.label)) ?? getGenreColor(tag.label),
        };
      }),
    [genreColorMap, resolvedTags, strongestWeight],
  );
  const activeGradientEntries = useMemo(
    () =>
      orderedGenreColors.map((entry) => {
        const matchingAnchor = anchors.find(
          (anchor) => normalizeGenre(anchor.label) === normalizeGenre(entry.genre),
        );

        return {
          color: entry.color,
          progress: matchingAnchor?.progress ?? 0,
        };
      }),
    [anchors, orderedGenreColors],
  );
  const gradientStops = useMemo(
    () => buildGradientStops(activeGradientEntries),
    [activeGradientEntries],
  );
  const labelLayouts = useMemo(
    () =>
      layoutHelixLabels(
        anchors.map((anchor) => ({
          anchorPoint: anchor.anchorPoint,
          artists: anchor.artists,
          id: anchor.id,
          label: anchor.label,
          side: anchor.side,
        })),
        {
          containerWidthPx,
          viewBoxHeight: VIEWBOX_HEIGHT,
          viewBoxWidth: VIEWBOX_WIDTH,
        },
      ),
    [anchors, containerWidthPx],
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

  return (
    <div
      className={cn(
        surface === "panel"
          ? "section-haze-strong relative overflow-hidden rounded-[30px] px-3 py-4 text-white sm:px-4 sm:py-5"
          : "relative overflow-hidden px-0 py-0 text-white",
        className,
      )}
    >
      <div
        className="absolute inset-x-12 top-1 h-20 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${withAlpha(topAccentColor, 0.11)}, transparent 72%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-[35%] h-16 w-28 -translate-x-1/2 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${withAlpha(middleAccentColor, 0.08)}, transparent 74%)`,
        }}
      />
      <div
        className="absolute -bottom-7 left-1/2 h-20 w-36 -translate-x-1/2 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${withAlpha(bottomAccentColor, 0.09)}, transparent 74%)`,
        }}
      />

      <div className="relative">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
              {labelText}
            </p>
            <p className="max-w-[22rem] text-[16px] font-medium leading-7 text-white sm:text-[17px]">
              {overviewText}
            </p>
          </div>
        </div>

        <div
          ref={stageRef}
          className="relative mt-5 w-full"
          style={{ aspectRatio: HELIX_STAGE_ASPECT_RATIO }}
        >
          <div
            aria-label={onExpand ? "Open the full taste timeline" : undefined}
            className={cn(
              "absolute inset-0 transition duration-300",
              onExpand
                ? "cursor-pointer hover:[filter:brightness(1.05)] focus:outline-none focus-visible:[filter:brightness(1.05)]"
                : "",
            )}
            onClick={onExpand}
            onKeyDown={(event) => {
              if (!onExpand) {
                return;
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onExpand();
              }
            }}
            role={onExpand ? "button" : undefined}
            tabIndex={onExpand ? 0 : undefined}
          >
            <svg
              aria-hidden="true"
              className="size-full overflow-visible"
              shapeRendering="geometricPrecision"
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            >
              <defs>
                <linearGradient id={gradientId} x1="50%" x2="50%" y1="0%" y2="100%">
                  {gradientStops.map((stop) => (
                    <stop key={`${gradientId}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <filter id={glowId}>
                  <feGaussianBlur result="blur" stdDeviation="4.6" />
                </filter>
                <filter id={nodeGlowId}>
                  <feGaussianBlur result="blur" stdDeviation="2.2" />
                </filter>
              </defs>

              {crossingProgresses.map((progress, index) => {
                const { pointA, pointB } = getVerticalWavePairAtProgress(progress, HELIX_WAVE_CONFIG);
                const crossingPoint = {
                  x: (pointA.x + pointB.x) / 2,
                  y: (pointA.y + pointB.y) / 2,
                };
                return (
                  <path
                    key={`connector-${index}`}
                    d={`M ${(crossingPoint.x - HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)} L ${(crossingPoint.x + HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)}`}
                    fill="none"
                  opacity="0.2"
                  stroke={`url(#${gradientId})`}
                  strokeLinecap="round"
                  strokeWidth="1.2"
                  />
                );
              })}

              <path
                d={railAPath}
                fill="none"
                filter={`url(#${glowId})`}
                opacity="0.3"
                stroke={`url(#${gradientId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={HELIX_HALO_STROKE_WIDTH}
              />
              <path
                d={railBPath}
                fill="none"
                filter={`url(#${glowId})`}
                opacity="0.3"
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
                    ? Math.max(layout.connectorEndX + 9, anchor.anchorPoint.x - 14)
                    : Math.min(layout.connectorEndX - 9, anchor.anchorPoint.x + 14);

                return (
                  <path
                    key={`${anchor.id}-connector`}
                    d={`M ${anchor.anchorPoint.x.toFixed(2)} ${anchor.anchorPoint.y.toFixed(2)} C ${connectorControlX.toFixed(2)} ${anchor.anchorPoint.y.toFixed(2)}, ${connectorControlX.toFixed(2)} ${layout.connectorEndY.toFixed(2)}, ${layout.connectorEndX.toFixed(2)} ${layout.connectorEndY.toFixed(2)}`}
                    fill="none"
                    opacity="0.24"
                    stroke="rgba(255,255,255,0.16)"
                    strokeLinecap="round"
                    strokeWidth="1.35"
                  />
                );
              })}

              {anchors.map((anchor, index) => {
                const isActive = activeTagIndex === index;

                return (
                  <g key={anchor.label}>
                    <circle
                      cx={anchor.anchorPoint.x}
                      cy={anchor.anchorPoint.y}
                      fill={anchor.glowColor}
                      filter={`url(#${nodeGlowId})`}
                      opacity={isActive ? 0.72 : 0.34}
                      r={isActive ? HELIX_NODE_HALO_ACTIVE_RADIUS : HELIX_NODE_HALO_RADIUS}
                    />
                    <circle
                      cx={anchor.anchorPoint.x}
                      cy={anchor.anchorPoint.y}
                      fill={anchor.glowColor}
                      opacity={0.94}
                      r={isActive ? HELIX_NODE_CORE_ACTIVE_RADIUS : HELIX_NODE_CORE_RADIUS}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <span className="px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/34">
              Recent taste
            </span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/24">
              Earlier roots
            </span>
          </div>

          {anchors.map((anchor, index) => {
            const isActive = activeTagIndex === index;
            const layout = labelLayoutsById.get(anchor.id);

            if (!layout) {
              return null;
            }

            return (
              <div
                key={`${anchor.label}-chip`}
                className={cn(
                  "absolute z-10",
                  anchor.side === "left" ? "text-right" : "text-left",
                )}
                onMouseEnter={() => setActiveTagIndex(index)}
                onMouseLeave={() => setActiveTagIndex(null)}
                style={{
                  left: `${(layout.blockX / VIEWBOX_WIDTH) * 100}%`,
                  top: `${(layout.blockTop / VIEWBOX_HEIGHT) * 100}%`,
                  opacity: anchor.intensity,
                  width: `${(layout.blockWidth / VIEWBOX_WIDTH) * 100}%`,
                }}
              >
                <button
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-left backdrop-blur-md transition duration-300",
                    anchor.side === "left" ? "ml-auto" : "mr-auto",
                    isActive ? "text-white shadow-[0_14px_28px_rgba(5,6,10,0.32)]" : "text-white/78",
                  )}
                  onBlur={() => setActiveTagIndex(null)}
                  onClick={() => setActiveTagIndex(index)}
                  onFocus={() => setActiveTagIndex(index)}
                  style={{
                    background: isActive
                      ? withAlpha(anchor.glowColor, 0.16)
                      : withAlpha(anchor.glowColor, 0.08),
                    borderColor: isActive
                      ? withAlpha(anchor.glowColor, 0.42)
                      : withAlpha(anchor.glowColor, 0.2),
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
                      {titleCase(anchor.label)}
                    </span>
                  </span>
                </button>

                {anchor.artists?.length ? (
                  <div
                    className={cn(
                      "mt-2 space-y-0.5 text-[9.5px] leading-[1rem] text-white/42",
                      anchor.side === "left" ? "pr-1" : "pl-1",
                    )}
                  >
                    {anchor.artists.slice(0, 4).map((artistName) => (
                      <p key={`${anchor.label}-${artistName}`} className="break-words">
                        {artistName}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
