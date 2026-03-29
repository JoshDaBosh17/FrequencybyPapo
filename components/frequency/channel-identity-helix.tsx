"use client";

import { useId, useMemo } from "react";

import { buildOrderedGenreColors } from "@/lib/frequency/genre-colors";
import { cn } from "@/lib/utils";
import {
  buildVerticalWavePath,
  buildWaveCrossingProgresses,
  getVerticalWavePoint,
} from "./helix-wave";

const VIEWBOX_WIDTH = 64;
const VIEWBOX_HEIGHT = 40;
const WAVE_CONFIG = {
  amplitude: 18,
  bottomY: 34,
  centerX: 32,
  cycles: 1.18,
  edgeTaper: 0.04,
  sampleCount: 44,
  topY: 6,
} as const;
const CROSSING_WIDTH = 5.5;

export function ChannelIdentityHelix({
  genres,
  className,
}: {
  genres: string[];
  className?: string;
}) {
  const gradientId = useId();
  const colors = useMemo(() => buildOrderedGenreColors(genres), [genres]);
  const pathA = useMemo(() => buildVerticalWavePath(0, WAVE_CONFIG), []);
  const pathB = useMemo(() => buildVerticalWavePath(Math.PI, WAVE_CONFIG), []);
  const crossingProgresses = useMemo(
    () => buildWaveCrossingProgresses(WAVE_CONFIG.cycles, { endPadding: 0.88, startPadding: 0.12 }),
    [],
  );
  const gradientStops = colors.length
    ? colors.map((entry, index) => ({
        color: entry.color,
        offset:
          colors.length === 1 ? "0%" : `${((index / (colors.length - 1)) * 100).toFixed(2)}%`,
      }))
    : [
        { color: "#d9a85e", offset: "0%" },
        { color: "#8bb9d8", offset: "100%" },
      ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-1.5",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="block h-auto w-full"
        shapeRendering="geometricPrecision"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            {gradientStops.map((stop) => (
              <stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        <path
          d={pathA}
          fill="none"
          opacity="0.22"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth="4.2"
        />
        <path
          d={pathB}
          fill="none"
          opacity="0.22"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth="4.2"
        />
        <path
          d={pathA}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth="1.6"
        />
        <path
          d={pathB}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth="1.6"
        />
        {crossingProgresses.map((progress) => {
          const crossingPoint = getVerticalWavePoint(progress, 0, WAVE_CONFIG);

          return (
            <path
              key={progress}
              d={`M ${(crossingPoint.x - CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)} L ${(crossingPoint.x + CROSSING_WIDTH / 2).toFixed(2)} ${crossingPoint.y.toFixed(2)}`}
              fill="none"
              opacity="0.2"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeWidth="0.7"
            />
          );
        })}
      </svg>
    </div>
  );
}
