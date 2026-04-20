import type { SongActivityItem } from "@/lib/frequency/song-activity";

import type { HorizontalWaveConfig } from "./helix-wave";
import { getHorizontalWavePairAtProgress } from "./helix-wave";

export type SongFrequencyTimelineNode = {
  anchorX: number;
  anchorY: number;
  connectorHeight: number;
  connectorTop: number;
  item: SongActivityItem;
  progress: number;
  side: "top" | "bottom";
  tagHeight: number;
  tagLeft: number;
  tagTop: number;
  tagWidth: number;
};

type BuildSongFrequencyTimelineLayoutParams = {
  compact?: boolean;
  dateMarkerMode?: boolean;
  items: SongActivityItem[];
  mobileHeroMode?: boolean;
  reactionMode?: boolean;
  socialDetailMode?: boolean;
  waveConfig: HorizontalWaveConfig;
};

const HERO_MIN_TAG_WIDTH = 164;
const HERO_MAX_TAG_WIDTH = 236;
const MOBILE_HERO_MIN_TAG_WIDTH = 144;
const MOBILE_HERO_MAX_TAG_WIDTH = 212;
const COMPACT_MIN_TAG_WIDTH = 140;
const COMPACT_MAX_TAG_WIDTH = 196;
const HERO_TAG_HEIGHT = 86;
const HERO_REACTION_TAG_HEIGHT = 112;
const MOBILE_HERO_TAG_HEIGHT = 78;
const MOBILE_HERO_REACTION_TAG_HEIGHT = 104;
const COMPACT_TAG_HEIGHT = 66;
const COMPACT_REACTION_TAG_HEIGHT = 90;
const COMPACT_SOCIAL_TAG_HEIGHT = 110;
const HERO_TAG_GAP = 34;
const HERO_REACTION_TAG_GAP = 38;
const MOBILE_HERO_TAG_GAP = 26;
const MOBILE_HERO_REACTION_TAG_GAP = 32;
const HERO_DATE_MARKER_TAG_GAP = 46;
const MOBILE_HERO_DATE_MARKER_TAG_GAP = 44;
const COMPACT_TAG_GAP = 20;
const COMPACT_REACTION_TAG_GAP = 23;
const COMPACT_SOCIAL_TAG_GAP = 26;
const HERO_HORIZONTAL_GAP = 34;
const MOBILE_HERO_HORIZONTAL_GAP = 24;
const COMPACT_HORIZONTAL_GAP = 22;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function normalizeTimestampMs(value: unknown) {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = (value as { seconds?: number }).seconds ?? 0;
    return seconds * 1000;
  }

  return 0;
}

export function estimateSongTimelineTagWidth(
  item: SongActivityItem,
  compact = false,
  mobileHeroMode = false,
  reactionMode = false,
) {
  const minWidth = compact
    ? COMPACT_MIN_TAG_WIDTH
    : mobileHeroMode
      ? MOBILE_HERO_MIN_TAG_WIDTH
      : HERO_MIN_TAG_WIDTH;
  const maxWidth = compact
    ? COMPACT_MAX_TAG_WIDTH
    : mobileHeroMode
      ? MOBILE_HERO_MAX_TAG_WIDTH
      : HERO_MAX_TAG_WIDTH;
  const titleWeight = Math.min(item.title.trim().length, 30);
  const metadataWeight = Math.min(
    `${item.artist} ${item.uploadedBy.displayName}`.trim().length,
    34,
  );
  const estimatedWidth =
    minWidth +
    Math.max(titleWeight, metadataWeight * 0.82) *
      (compact ? 2.45 : mobileHeroMode ? 2.35 : 2.85);
  const reactionFloor = reactionMode
    ? compact
      ? 148
      : mobileHeroMode
        ? 156
        : 176
    : minWidth;

  return clamp(Math.max(estimatedWidth, reactionFloor), minWidth, maxWidth);
}

export function buildSongFrequencyTimelineWidth(
  items: SongActivityItem[],
  compact = false,
  mobileHeroMode = false,
  reactionMode = false,
) {
  const horizontalGap = compact
    ? COMPACT_HORIZONTAL_GAP
    : mobileHeroMode
      ? MOBILE_HERO_HORIZONTAL_GAP
      : HERO_HORIZONTAL_GAP;
  const leftRightPadding = compact ? 88 : mobileHeroMode ? 92 : 112;
  const minimumWidth = compact ? 620 : mobileHeroMode ? 720 : 860;
  const totalTagWidth = items.reduce(
    (sum, item) =>
      sum + estimateSongTimelineTagWidth(item, compact, mobileHeroMode, reactionMode),
    0,
  );
  const totalGapWidth = Math.max(0, items.length - 1) * horizontalGap;

  return Math.max(minimumWidth, totalTagWidth + totalGapWidth + leftRightPadding * 2);
}

export function buildSongFrequencyTimelineLayout({
  compact = false,
  dateMarkerMode = false,
  items,
  mobileHeroMode = false,
  reactionMode = false,
  socialDetailMode = false,
  waveConfig,
}: BuildSongFrequencyTimelineLayoutParams): SongFrequencyTimelineNode[] {
  const orderedItems = [...items].sort(
    (left, right) => normalizeTimestampMs(left.createdAt) - normalizeTimestampMs(right.createdAt),
  );
  const tagHeight = compact
    ? socialDetailMode
      ? COMPACT_SOCIAL_TAG_HEIGHT
      : reactionMode
        ? COMPACT_REACTION_TAG_HEIGHT
        : COMPACT_TAG_HEIGHT
    : mobileHeroMode
      ? reactionMode
        ? MOBILE_HERO_REACTION_TAG_HEIGHT
        : MOBILE_HERO_TAG_HEIGHT
    : reactionMode
      ? HERO_REACTION_TAG_HEIGHT
      : HERO_TAG_HEIGHT;
  let tagGap = HERO_TAG_GAP;

  if (compact) {
    tagGap = socialDetailMode
      ? COMPACT_SOCIAL_TAG_GAP
      : reactionMode
        ? COMPACT_REACTION_TAG_GAP
        : COMPACT_TAG_GAP;
  } else if (mobileHeroMode) {
    tagGap = dateMarkerMode
      ? MOBILE_HERO_DATE_MARKER_TAG_GAP
      : reactionMode
        ? MOBILE_HERO_REACTION_TAG_GAP
        : MOBILE_HERO_TAG_GAP;
  } else {
    tagGap = dateMarkerMode
      ? HERO_DATE_MARKER_TAG_GAP
      : reactionMode
        ? HERO_REACTION_TAG_GAP
        : HERO_TAG_GAP;
  }
  const horizontalGap = compact
    ? COMPACT_HORIZONTAL_GAP
    : mobileHeroMode
      ? MOBILE_HERO_HORIZONTAL_GAP
      : HERO_HORIZONTAL_GAP;
  const tagWidths = orderedItems.map((item) =>
    estimateSongTimelineTagWidth(item, compact, mobileHeroMode, reactionMode),
  );
  const totalContentSpan = tagWidths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, orderedItems.length - 1) * horizontalGap;
  const firstCenter = tagWidths[0] ? waveConfig.leftX + tagWidths[0] / 2 : waveConfig.leftX;
  const lastTagWidth = tagWidths[tagWidths.length - 1] ?? 0;
  const lastCenter = lastTagWidth
    ? waveConfig.rightX - lastTagWidth / 2
    : waveConfig.rightX;
  const availableCenterSpan = Math.max(1, lastCenter - firstCenter);
  const naturalFirstCenter = tagWidths[0] ? tagWidths[0] / 2 : 0;
  const naturalLastCenter = lastTagWidth ? totalContentSpan - lastTagWidth / 2 : totalContentSpan;
  const naturalCenterSpan = Math.max(1, naturalLastCenter - naturalFirstCenter);

  // Width-driven spacing doubles as our lightweight collision pass: tags claim horizontal
  // room based on their content before we anchor them back onto the frequency lane.
  // We then map that width-aware layout across the full lane span so the newest song
  // always lands at the recent edge, even when the room only has a few songs.
  let naturalCursor = 0;

  return orderedItems.map((item, index) => {
    const tagWidth =
      tagWidths[index] ??
      estimateSongTimelineTagWidth(item, compact, mobileHeroMode, reactionMode);
    const naturalCenter = naturalCursor + tagWidth / 2;
    const normalizedCenter =
      orderedItems.length === 1 || naturalCenterSpan <= 1
        ? 1
        : (naturalCenter - naturalFirstCenter) / naturalCenterSpan;
    const tagCenterX =
      orderedItems.length === 1
        ? lastCenter
        : firstCenter + normalizedCenter * availableCenterSpan;
    const progress =
      clamp((tagCenterX - waveConfig.leftX) / (waveConfig.rightX - waveConfig.leftX), 0, 1);
    const { pointA, pointB } = getHorizontalWavePairAtProgress(progress, waveConfig);
    const anchorX = (pointA.x + pointB.x) / 2;
    const anchorY = (pointA.y + pointB.y) / 2;
    const side = index % 2 === 0 ? "top" : "bottom";
    const tagTop =
      side === "top" ? anchorY - tagGap - tagHeight : anchorY + tagGap;
    const connectorTop = side === "top" ? tagTop + tagHeight - 1 : anchorY;
    const connectorHeight =
      side === "top"
        ? Math.max(10, anchorY - connectorTop)
        : Math.max(10, tagTop - anchorY);

    naturalCursor += tagWidth + horizontalGap;

    return {
      anchorX,
      anchorY,
      connectorHeight,
      connectorTop,
      item,
      progress,
      side,
      tagHeight,
      tagLeft: anchorX - tagWidth / 2,
      tagTop,
      tagWidth,
    } satisfies SongFrequencyTimelineNode;
  });
}
