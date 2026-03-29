"use client";

import { useId, useMemo } from "react";

import { buildOrderedGenreColors, withAlpha } from "@/lib/frequency/genre-colors";
import { cn } from "@/lib/utils";
import {
  buildVerticalWavePath,
  buildWaveCrossingProgresses,
  getVerticalWavePairAtProgress,
} from "./helix-wave";

const VIEWBOX_WIDTH = 244;
const VIEWBOX_HEIGHT = 248;
const HELIX_CENTER_X = VIEWBOX_WIDTH / 2;
const HELIX_TOP = 24;
const HELIX_BOTTOM = 224;
const HELIX_AMPLITUDE = 31;
const HELIX_WAVE_CYCLES = 1.76;
const HELIX_POINTS = 128;
const HELIX_HALO_STROKE_WIDTH = 10;
const HELIX_BODY_STROKE_WIDTH = 5.4;
const HELIX_CORE_STROKE_WIDTH = 2.4;
const HELIX_CROSSING_WIDTH = 14;
const HELIX_WAVE_CONFIG = {
  amplitude: HELIX_AMPLITUDE,
  bottomY: HELIX_BOTTOM,
  centerX: HELIX_CENTER_X,
  cycles: HELIX_WAVE_CYCLES,
  edgeTaper: 0.05,
  sampleCount: HELIX_POINTS,
  topY: HELIX_TOP,
} as const;

export function RoomHeroHelix({
  genres,
  className,
  embedded = false,
}: {
  genres: string[];
  className?: string;
  embedded?: boolean;
}) {
  const gradientId = useId();
  const glowId = useId();
  const orderedGenreColors = useMemo(() => buildOrderedGenreColors(genres), [genres]);
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
  const gradientStops = orderedGenreColors.length
    ? orderedGenreColors.map((entry, index) => ({
        color: entry.color,
        offset:
          orderedGenreColors.length === 1
            ? "0%"
            : `${((index / (orderedGenreColors.length - 1)) * 100).toFixed(2)}%`,
      }))
    : [
        { color: "#d99a63", offset: "0%" },
        { color: "#8bb9d8", offset: "100%" },
      ];
  const topAccent = gradientStops[0]?.color ?? "#d99a63";
  const bottomAccent = gradientStops[gradientStops.length - 1]?.color ?? "#8bb9d8";

  return (
    <div
      className={cn(
        embedded
          ? "group relative overflow-visible p-0"
          : "relative overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,27,0.98),rgba(7,9,14,0.98))] p-4 shadow-[0_28px_72px_rgba(0,0,0,0.34)] sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "absolute h-16 rounded-full blur-2xl transition duration-300 group-hover:opacity-100",
          embedded ? "inset-x-6 top-0 opacity-90" : "inset-x-10 top-4 opacity-100",
        )}
        style={{
          background: `radial-gradient(circle, ${withAlpha(topAccent, 0.1)}, transparent 74%)`,
        }}
      />
      <div
        className={cn(
          "absolute left-1/2 h-16 w-24 -translate-x-1/2 rounded-full blur-2xl transition duration-300 group-hover:opacity-100",
          embedded ? "bottom-0 opacity-80" : "bottom-2 opacity-100",
        )}
        style={{
          background: `radial-gradient(circle, ${withAlpha(bottomAccent, 0.09)}, transparent 74%)`,
        }}
      />

      <svg
        aria-hidden="true"
        className={cn(
          "relative mx-auto block h-auto w-full max-w-[320px] transition duration-300 ease-out",
          embedded
            ? "group-hover:[filter:brightness(1.06)]"
            : "",
        )}
        shapeRendering="geometricPrecision"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="50%" x2="50%" y1="0%" y2="100%">
            {gradientStops.map((stop) => (
              <stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur result="blur" stdDeviation="4.2" />
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
              key={index}
              d={`M ${(crossingPoint.x - HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)} L ${(crossingPoint.x + HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)}`}
              fill="none"
              opacity="0.16"
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
          opacity="0.27"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={HELIX_HALO_STROKE_WIDTH}
        />
        <path
          d={railBPath}
          fill="none"
          filter={`url(#${glowId})`}
          opacity="0.27"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={HELIX_HALO_STROKE_WIDTH}
        />
        <path
          d={railAPath}
          fill="none"
          opacity="0.88"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={HELIX_BODY_STROKE_WIDTH}
        />
        <path
          d={railBPath}
          fill="none"
          opacity="0.88"
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
          className={embedded ? "frequency-room-helix-flow" : undefined}
          d={railAPath}
          fill="none"
          opacity="0.9"
          stroke="rgba(255,255,255,0.88)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={HELIX_CORE_STROKE_WIDTH * 0.68}
          style={embedded ? { mixBlendMode: "screen" } : undefined}
        />
        <path
          className={embedded ? "frequency-room-helix-flow" : undefined}
          d={railBPath}
          fill="none"
          opacity="0.9"
          stroke="rgba(255,255,255,0.88)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={HELIX_CORE_STROKE_WIDTH * 0.68}
          style={embedded ? { mixBlendMode: "screen" } : undefined}
        />
      </svg>
    </div>
  );
}
