"use client";

import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import type { SongFrequencyTimelineNode } from "./song-frequency-lane-layout";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function selectArtworkNodes(
  nodes: SongFrequencyTimelineNode[],
  maxVisible: number,
) {
  const artworkNodes = nodes.filter((node) => Boolean(node.item.artworkUrl));

  if (artworkNodes.length <= maxVisible) {
    return artworkNodes;
  }

  const recentWindow = artworkNodes.slice(-Math.min(artworkNodes.length, maxVisible * 2));
  const selected: SongFrequencyTimelineNode[] = [];

  for (let index = 0; index < maxVisible; index += 1) {
    const candidateIndex =
      maxVisible === 1
        ? recentWindow.length - 1
        : Math.round((index * (recentWindow.length - 1)) / (maxVisible - 1));
    const candidate = recentWindow[candidateIndex];

    if (candidate && !selected.some((entry) => entry.item.id === candidate.item.id)) {
      selected.push(candidate);
    }
  }

  return selected;
}

export function TimelineArtAtmosphere({
  contentWidth,
  mobileHeroMode = false,
  nodes,
  compact = false,
  viewBoxHeight,
}: {
  contentWidth: number;
  mobileHeroMode?: boolean;
  nodes: SongFrequencyTimelineNode[];
  compact?: boolean;
  viewBoxHeight: number;
}) {
  const maxVisible = compact ? 2 : mobileHeroMode ? 2 : 4;
  const artworkNodes = selectArtworkNodes(nodes, maxVisible);

  if (!artworkNodes.length) {
    return null;
  }

  const baseSize = compact ? 56 : mobileHeroMode ? 68 : 88;
  const frameInset = compact ? 14 : mobileHeroMode ? 16 : 20;
  const streamGap = compact ? 124 : mobileHeroMode ? 148 : 188;
  const travelDistance =
    contentWidth + streamGap * artworkNodes.length + (compact ? 92 : mobileHeroMode ? 108 : 132);
  const baseDuration = compact ? 26 : mobileHeroMode ? 28 : 32;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {artworkNodes.map((node, index) => {
        const artworkUrl = node.item.artworkUrl;

        if (!artworkUrl) {
          return null;
        }

        const accentColor = getGenreColor(node.item.visualAccentKey);
        const size = baseSize + (index % 2 === 0 ? 0 : compact ? 4 : mobileHeroMode ? 6 : 10);
        const left = contentWidth + index * streamGap + (mobileHeroMode ? 28 : 36);
        const tagAlignedCenterY =
          node.tagTop + node.tagHeight * 0.5 + (node.side === "top" ? size * 0.08 : -size * 0.08);
        const top = clamp(
          tagAlignedCenterY - size / 2 + (index % 2 === 0 ? (compact ? -4 : -6) : compact ? 4 : 6),
          frameInset,
          viewBoxHeight - size - frameInset,
        );
        const duration = baseDuration + index * (compact ? 1.8 : 2.3);
        const opacity = compact ? 0.18 : mobileHeroMode ? 0.16 : 0.2;

        return (
          <div
            key={`${node.item.id}-artwork`}
            className="absolute"
            style={{
              animationDelay: `${-(duration / artworkNodes.length) * index}s`,
              animationDuration: `${duration}s`,
              animationIterationCount: "infinite",
              animationName: "frequency-timeline-art-stream",
              animationTimingFunction: "linear",
              height: `${size}px`,
              left: `${left}px`,
              opacity,
              top: `${top}px`,
              ["--stream-distance" as string]: `${travelDistance}px`,
              ["--stream-float" as string]: `${index % 2 === 0 ? (compact ? "-3px" : "-5px") : compact ? "3px" : "5px"}`,
              ["--stream-tilt" as string]: `${index % 2 === 0 ? "-0.4deg" : "0.45deg"}`,
              width: `${size}px`,
            }}
          >
            <div
              className="absolute inset-[-10%] rounded-[32px] blur-[28px]"
              style={{
                background: `radial-gradient(circle, ${withAlpha(accentColor, compact ? 0.22 : 0.28)}, transparent 72%)`,
              }}
            />
            <div
              className="absolute inset-0 overflow-hidden rounded-[22px] border border-white/8 shadow-[0_10px_22px_rgba(0,0,0,0.2)]"
              style={{
                background: `linear-gradient(180deg, ${withAlpha(accentColor, 0.16)}, rgba(8,10,16,0.22) 88%)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
                loading="lazy"
                src={artworkUrl}
                style={{
                  filter: compact ? "blur(0.75px) saturate(0.94)" : "blur(1.15px) saturate(0.96)",
                  transform: "scale(1.06)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(5,7,11,0.18), rgba(5,7,11,0.52) 56%, rgba(5,7,11,0.82) 100%)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
