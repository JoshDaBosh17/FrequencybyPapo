type HelixPoint = {
  x: number;
  y: number;
};

type HelixLabelSide = "left" | "right";

export type HelixLabelAnchor = {
  id: string;
  label: string;
  artists?: string[];
  anchorPoint: HelixPoint;
  side: HelixLabelSide;
};

export type HelixLabelLayout = {
  id: string;
  side: HelixLabelSide;
  anchorPoint: HelixPoint;
  blockTop: number;
  blockX: number;
  blockWidth: number;
  blockHeight: number;
  chipWidth: number;
  chipHeight: number;
  chipCenterY: number;
  chipX: number;
  connectorEndX: number;
  connectorEndY: number;
};

type LayoutOptions = {
  containerWidthPx: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
};

const MOBILE_BREAKPOINT_PX = 420;
const INNER_PADDING_PX = 12;
const TOP_PADDING_PX = 22;
const BOTTOM_PADDING_PX = 28;
const MOBILE_HELIX_SAFE_ZONE_PX = 28;
const DESKTOP_HELIX_SAFE_ZONE_PX = 36;
const MOBILE_LABEL_ORBIT_OFFSET_PX = 10;
const DESKTOP_LABEL_ORBIT_OFFSET_PX = 20;
const MOBILE_TARGET_CENTER_DISTANCE_PX = 56;
const DESKTOP_TARGET_CENTER_DISTANCE_PX = 100;
const MOBILE_CENTER_PROXIMITY_BOOST_CAP_PX = 24;
const DESKTOP_CENTER_PROXIMITY_BOOST_CAP_PX = 28;
const MAX_OFFSET_PX = 72;
const MOBILE_COLLISION_PADDING_PX = 8;
const DESKTOP_COLLISION_PADDING_PX = 10;
const MOBILE_CHIP_HEIGHT_PX = 32;
const DESKTOP_CHIP_HEIGHT_PX = 34;
const MOBILE_CHIP_MAX_WIDTH_PX = 132;
const DESKTOP_CHIP_MAX_WIDTH_PX = 156;
const MOBILE_BLOCK_MAX_WIDTH_PX = 126;
const DESKTOP_BLOCK_MAX_WIDTH_PX = 152;
const MOBILE_ARTIST_LINE_HEIGHT_PX = 11;
const DESKTOP_ARTIST_LINE_HEIGHT_PX = 12;
const MOBILE_ARTIST_GAP_PX = 6;
const DESKTOP_ARTIST_GAP_PX = 8;
// These constants are the main tuning surface for how close labels stay to the helix,
// how much separation collision resolution preserves, and how compact the mobile layout feels.

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function estimateChipWidthPx(label: string, compact: boolean) {
  const maxWidth = compact ? MOBILE_CHIP_MAX_WIDTH_PX : DESKTOP_CHIP_MAX_WIDTH_PX;
  const estimatedWidth = label.trim().length * (compact ? 6.7 : 7.2) + 44;

  return clamp(estimatedWidth, 82, maxWidth);
}

function estimateBlockMetrics(label: string, artists: string[] | undefined, compact: boolean) {
  const chipWidth = estimateChipWidthPx(label, compact);
  const chipHeight = compact ? MOBILE_CHIP_HEIGHT_PX : DESKTOP_CHIP_HEIGHT_PX;
  const visibleArtists = artists?.slice(0, 4) ?? [];
  const lineHeight = compact ? MOBILE_ARTIST_LINE_HEIGHT_PX : DESKTOP_ARTIST_LINE_HEIGHT_PX;
  const artistGap = visibleArtists.length ? (compact ? MOBILE_ARTIST_GAP_PX : DESKTOP_ARTIST_GAP_PX) : 0;
  const artistCharWidth = compact ? 5.4 : 5.8;
  const longestArtist = visibleArtists.reduce((longest, artist) => Math.max(longest, artist.length), 0);
  const blockMaxWidth = compact ? MOBILE_BLOCK_MAX_WIDTH_PX : DESKTOP_BLOCK_MAX_WIDTH_PX;
  const metadataWidth = clamp(longestArtist * artistCharWidth + 18, chipWidth, blockMaxWidth);
  const metadataLineCount = visibleArtists.reduce(
    (total, artist) =>
      total +
      Math.max(1, Math.ceil((artist.length * artistCharWidth + 18) / Math.max(metadataWidth, 1))),
    0,
  );
  const blockWidth = Math.max(chipWidth, metadataWidth);
  const blockHeight = chipHeight + artistGap + metadataLineCount * lineHeight;

  return {
    artistCount: visibleArtists.length,
    blockHeight,
    blockWidth,
    chipHeight,
    chipWidth,
  };
}

function resolveSideCollisions(
  layouts: HelixLabelLayout[],
  topBoundary: number,
  bottomBoundary: number,
  collisionPadding: number,
) {
  if (!layouts.length) {
    return layouts;
  }

  const sorted = [...layouts].sort((left, right) => left.anchorPoint.y - right.anchorPoint.y);

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const clampedTop = clamp(current.blockTop, topBoundary, bottomBoundary - current.blockHeight);
    current.blockTop = clampedTop;

    if (index === 0) {
      continue;
    }

    const previous = sorted[index - 1];
    const minimumTop = previous.blockTop + previous.blockHeight + collisionPadding;
    if (current.blockTop < minimumTop) {
      current.blockTop = minimumTop;
    }
  }

  const last = sorted[sorted.length - 1];
  const overflow = last.blockTop + last.blockHeight - bottomBoundary;
  if (overflow > 0) {
    for (const layout of sorted) {
      layout.blockTop -= overflow;
    }
  }

  sorted[0].blockTop = Math.max(sorted[0].blockTop, topBoundary);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const minimumTop = previous.blockTop + previous.blockHeight + collisionPadding;
    if (current.blockTop < minimumTop) {
      current.blockTop = minimumTop;
    }
  }

  for (let index = sorted.length - 2; index >= 0; index -= 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    const maximumTop = next.blockTop - collisionPadding - current.blockHeight;
    current.blockTop = Math.min(current.blockTop, maximumTop);
    current.blockTop = Math.max(current.blockTop, topBoundary);
  }

  return sorted;
}

export function layoutHelixLabels(
  anchors: HelixLabelAnchor[],
  options: LayoutOptions,
) {
  // Position every label from its real helix anchor first, then run a minimal side-specific
  // collision pass so tags stay attached to their segment instead of drifting into free space.
  const compact = options.containerWidthPx <= MOBILE_BREAKPOINT_PX;
  const unitsPerPx = options.viewBoxWidth / Math.max(options.containerWidthPx, 1);
  const innerPadding = INNER_PADDING_PX * unitsPerPx;
  const topBoundary = TOP_PADDING_PX * unitsPerPx;
  const bottomBoundary = options.viewBoxHeight - BOTTOM_PADDING_PX * unitsPerPx;
  const collisionPadding = (compact ? MOBILE_COLLISION_PADDING_PX : DESKTOP_COLLISION_PADDING_PX) * unitsPerPx;

  const initialLayouts = anchors.map((anchor) => {
    const metrics = estimateBlockMetrics(anchor.label, anchor.artists, compact);
    const blockWidth = metrics.blockWidth * unitsPerPx;
    const chipWidth = metrics.chipWidth * unitsPerPx;
    const chipHeight = metrics.chipHeight * unitsPerPx;
    const blockHeight = metrics.blockHeight * unitsPerPx;
    const centerDistancePx =
      Math.abs(anchor.anchorPoint.x - options.viewBoxWidth / 2) / Math.max(unitsPerPx, 0.0001);
    const upperHalfBias = clamp(1.08 - anchor.anchorPoint.y / options.viewBoxHeight, 0.28, 1);
    const targetCenterDistancePx = compact
      ? MOBILE_TARGET_CENTER_DISTANCE_PX
      : DESKTOP_TARGET_CENTER_DISTANCE_PX;
    const centerProximityBoostCapPx = compact
      ? MOBILE_CENTER_PROXIMITY_BOOST_CAP_PX
      : DESKTOP_CENTER_PROXIMITY_BOOST_CAP_PX;
    const baseOffsetPx =
      (compact ? MOBILE_HELIX_SAFE_ZONE_PX : DESKTOP_HELIX_SAFE_ZONE_PX) +
      (compact ? MOBILE_LABEL_ORBIT_OFFSET_PX : DESKTOP_LABEL_ORBIT_OFFSET_PX);
    // Keep labels orbiting just outside the helix aura. Longer metadata can push the block
    // outward a touch, but every chip still inherits a larger shared base offset first.
    const metadataOffsetPx = Math.max(0, (metrics.blockWidth - metrics.chipWidth) * 0.06);
    const centerProximityBoostPx = Math.min(
      Math.max(0, targetCenterDistancePx - centerDistancePx) * upperHalfBias,
      centerProximityBoostCapPx,
    );
    const dynamicOffsetPx = baseOffsetPx + metadataOffsetPx + centerProximityBoostPx;
    const constrainedOffset = Math.min(dynamicOffsetPx, MAX_OFFSET_PX) * unitsPerPx;
    const idealBlockTop = anchor.anchorPoint.y - chipHeight / 2;
    // Anchor the chip itself to the helix, then allow the artist metadata block to expand
    // around it. That keeps longer or shorter metadata from changing the chip's distance.
    const chipX =
      anchor.side === "left"
        ? clamp(
            anchor.anchorPoint.x - constrainedOffset - chipWidth,
            innerPadding + blockWidth - chipWidth,
            options.viewBoxWidth - innerPadding - chipWidth,
          )
        : clamp(
            anchor.anchorPoint.x + constrainedOffset,
            innerPadding,
            options.viewBoxWidth - innerPadding - blockWidth,
          );
    const blockX = anchor.side === "left" ? chipX + chipWidth - blockWidth : chipX;

    return {
      id: anchor.id,
      side: anchor.side,
      anchorPoint: anchor.anchorPoint,
      blockTop: idealBlockTop,
      blockX,
      blockWidth,
      blockHeight,
      chipWidth,
      chipHeight,
      chipCenterY: idealBlockTop + chipHeight / 2,
      chipX,
      connectorEndX: anchor.side === "left" ? chipX + chipWidth : chipX,
      connectorEndY: idealBlockTop + chipHeight / 2,
    } satisfies HelixLabelLayout;
  });

  const leftLayouts = resolveSideCollisions(
    initialLayouts.filter((layout) => layout.side === "left"),
    topBoundary,
    bottomBoundary,
    collisionPadding,
  );
  const rightLayouts = resolveSideCollisions(
    initialLayouts.filter((layout) => layout.side === "right"),
    topBoundary,
    bottomBoundary,
    collisionPadding,
  );

  return [...leftLayouts, ...rightLayouts]
    .map((layout) => ({
      ...layout,
      chipCenterY: layout.blockTop + layout.chipHeight / 2,
      connectorEndY: layout.blockTop + layout.chipHeight / 2,
    }))
    .sort((left, right) => anchors.findIndex((anchor) => anchor.id === left.id) - anchors.findIndex((anchor) => anchor.id === right.id));
}
