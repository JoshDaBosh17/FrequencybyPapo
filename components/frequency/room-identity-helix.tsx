"use client";

import { useId, useMemo } from "react";

import { buildOrderedGenreColors } from "@/lib/frequency/genre-colors";
import { cn } from "@/lib/utils";
import {
  buildVerticalWavePath,
  buildWaveCrossingProgresses,
  getVerticalWavePoint,
} from "./helix-wave";

const VIEWBOX_WIDTH = 176;
const VIEWBOX_HEIGHT = 132;
const HELIX_CENTER_X = VIEWBOX_WIDTH / 2;
const HELIX_TOP = 16;
const HELIX_BOTTOM = 116;
const HELIX_AMPLITUDE = 22;
const HELIX_WAVE_CYCLES = 1.5;
const HELIX_POINTS = 108;
const HELIX_HALO_STROKE_WIDTH = 5.8;
const HELIX_BODY_STROKE_WIDTH = 2.5;
const HELIX_CROSSING_WIDTH = 10;
const HELIX_WAVE_CONFIG = {
  amplitude: HELIX_AMPLITUDE,
  bottomY: HELIX_BOTTOM,
  centerX: HELIX_CENTER_X,
  cycles: HELIX_WAVE_CYCLES,
  edgeTaper: 0.06,
  sampleCount: HELIX_POINTS,
  topY: HELIX_TOP,
} as const;

export function RoomIdentityHelix({
  genres,
  className,
}: {
  genres: string[];
  className?: string;
}) {
  const gradientId = useId();
  const glowId = useId();
  const orderedGenreColors = useMemo(() => buildOrderedGenreColors(genres), [genres]);
  const railAPath = useMemo(() => buildVerticalWavePath(0, HELIX_WAVE_CONFIG), []);
  const railBPath = useMemo(() => buildVerticalWavePath(Math.PI, HELIX_WAVE_CONFIG), []);
  const crossingProgresses = useMemo(
    () => buildWaveCrossingProgresses(HELIX_WAVE_CYCLES, { endPadding: 0.9, startPadding: 0.1 }),
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

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] p-1.5",
        className,
      )}
    >
      <div className="absolute inset-x-5 top-3 h-8 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04),transparent_74%)] blur-lg" />
      <svg
        aria-hidden="true"
        className="relative h-auto w-full"
        shapeRendering="geometricPrecision"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            {gradientStops.map((stop) => (
              <stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur result="blur" stdDeviation="2.6" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={railAPath}
          fill="none"
          filter={`url(#${glowId})`}
          opacity="0.26"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={HELIX_HALO_STROKE_WIDTH}
        />
        <path
          d={railBPath}
          fill="none"
          filter={`url(#${glowId})`}
          opacity="0.26"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={HELIX_HALO_STROKE_WIDTH}
        />
        <path
          d={railAPath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={HELIX_BODY_STROKE_WIDTH}
        />
        <path
          d={railBPath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={HELIX_BODY_STROKE_WIDTH}
        />

        {crossingProgresses.map((progress) => {
          const crossingPoint = getVerticalWavePoint(progress, 0, HELIX_WAVE_CONFIG);

          return (
            <path
              key={progress}
              d={`M ${(crossingPoint.x - HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)} L ${(crossingPoint.x + HELIX_CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)}`}
              fill="none"
              opacity="0.18"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeWidth="0.9"
            />
          );
        })}
      </svg>
    </div>
  );
}
