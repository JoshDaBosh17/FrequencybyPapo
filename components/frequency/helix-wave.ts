export type HelixPoint = {
  x: number;
  y: number;
};

export type VerticalWaveConfig = {
  centerX: number;
  topY: number;
  bottomY: number;
  amplitude: number;
  cycles: number;
  sampleCount: number;
  phaseOffset?: number;
  edgeTaper?: number;
};

export type VerticalWaveMotionOptions = {
  phaseSpeed?: number;
  phaseDrift?: number;
  amplitudeVariance?: number;
  curvatureVariance?: number;
  asymmetryAmount?: number;
  edgeTaperVariance?: number;
};

export type VerticalWaveStrandState = {
  phase: number;
  amplitude: number;
  cycles: number;
  edgeTaper: number;
};

export type VerticalWaveMotionPair = {
  left: VerticalWaveStrandState;
  right: VerticalWaveStrandState;
  averageCycles: number;
};

const DEFAULT_PHASE_OFFSET = Math.PI;
const DEFAULT_EDGE_TAPER = 0.08;
const DEFAULT_MOTION_OPTIONS = {
  amplitudeVariance: 0.05,
  asymmetryAmount: 0.16,
  curvatureVariance: 0.035,
  edgeTaperVariance: 0.012,
  phaseDrift: 0.18,
  phaseSpeed: 0.16,
} satisfies Required<VerticalWaveMotionOptions>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getAmplitudeScale(progress: number, edgeTaper: number) {
  const normalizedTaper = clamp(edgeTaper, 0, 0.35);

  if (normalizedTaper === 0) {
    return 1;
  }

  return 1 - normalizedTaper + Math.sin(progress * Math.PI) * normalizedTaper;
}

function buildSmoothPath(points: HelixPoint[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[Math.min(points.length - 1, index + 2)];
    const controlPoint1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlPoint2 = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };

    path += ` C ${controlPoint1.x.toFixed(2)} ${controlPoint1.y.toFixed(2)}, ${controlPoint2.x.toFixed(2)} ${controlPoint2.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }

  return path;
}

function resolveStrandConfig(
  config: VerticalWaveConfig,
  strand: VerticalWaveStrandState,
) {
  return {
    ...config,
    amplitude: strand.amplitude,
    cycles: strand.cycles,
    edgeTaper: strand.edgeTaper,
  } satisfies VerticalWaveConfig;
}

function getAnimatedStrandOffset(
  progress: number,
  strand: VerticalWaveStrandState,
  config: VerticalWaveConfig,
  direction: 1 | -1,
) {
  const strandConfig = resolveStrandConfig(config, strand);
  const point = getVerticalWavePoint(progress, strand.phase, strandConfig);
  const centeredOffset = (point.x - config.centerX) * direction;

  return {
    offsetX: centeredOffset,
    y: point.y,
  };
}

export function getVerticalWavePoint(
  progress: number,
  phase: number,
  config: VerticalWaveConfig,
) {
  const edgeTaper = config.edgeTaper ?? DEFAULT_EDGE_TAPER;
  const amplitudeScale = getAmplitudeScale(progress, edgeTaper);
  const theta = progress * Math.PI * 2 * config.cycles + phase;

  return {
    x: config.centerX + Math.sin(theta) * config.amplitude * amplitudeScale,
    y: config.topY + progress * (config.bottomY - config.topY),
  } satisfies HelixPoint;
}

export function getVerticalWavePairAtProgress(
  progress: number,
  config: VerticalWaveConfig,
) {
  const phaseOffset = config.phaseOffset ?? DEFAULT_PHASE_OFFSET;
  const pointA = getVerticalWavePoint(progress, 0, config);
  const pointB = getVerticalWavePoint(progress, phaseOffset, config);
  const leftPoint = pointA.x <= pointB.x ? pointA : pointB;
  const rightPoint = pointA.x <= pointB.x ? pointB : pointA;

  return {
    leftPoint,
    pointA,
    pointB,
    rightPoint,
  };
}

export function buildVerticalWavePath(
  phase: number,
  config: VerticalWaveConfig,
) {
  const sampleCount = Math.max(config.sampleCount, 2);
  const points = Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / (sampleCount - 1);
    return getVerticalWavePoint(progress, phase, config);
  });

  return buildSmoothPath(points);
}

export function resolveVerticalWaveMotionPair(
  config: VerticalWaveConfig,
  timeSeconds: number,
  options: VerticalWaveMotionOptions = {},
) {
  const motion = { ...DEFAULT_MOTION_OPTIONS, ...options };
  const baseEdgeTaper = config.edgeTaper ?? DEFAULT_EDGE_TAPER;
  const opposingPhase = timeSeconds * motion.phaseSpeed;
  const sharedPhaseBias =
    Math.sin(timeSeconds * 0.11 + 0.4) * motion.phaseDrift * 0.16;
  const microPhaseOffset = motion.asymmetryAmount * 0.035;
  const amplitudeBreath =
    Math.sin(timeSeconds * 0.16 + 0.55) * motion.amplitudeVariance * 0.72;
  const amplitudeBias = motion.asymmetryAmount * 0.02;
  const sharedCycles =
    config.cycles +
    Math.sin(timeSeconds * 0.09 + 0.65) * motion.curvatureVariance * 0.24;
  const edgeTaperBreath =
    Math.sin(timeSeconds * 0.12 + 0.4) * motion.edgeTaperVariance * 0.32;

  return {
    averageCycles: sharedCycles,
    left: {
      amplitude: config.amplitude * (1 + amplitudeBreath + amplitudeBias),
      cycles: sharedCycles,
      edgeTaper: baseEdgeTaper + edgeTaperBreath,
      phase: sharedPhaseBias + opposingPhase + microPhaseOffset,
    },
    right: {
      amplitude: config.amplitude * (1 - amplitudeBreath - amplitudeBias),
      cycles: sharedCycles,
      edgeTaper: baseEdgeTaper - edgeTaperBreath,
      phase: DEFAULT_PHASE_OFFSET + sharedPhaseBias - opposingPhase - microPhaseOffset,
    },
  } satisfies VerticalWaveMotionPair;
}

export function getAnimatedVerticalWavePoint(
  progress: number,
  strand: VerticalWaveStrandState,
  config: VerticalWaveConfig,
) {
  return getVerticalWavePoint(progress, strand.phase, resolveStrandConfig(config, strand));
}

export function getAnimatedVerticalWavePairAtProgress(
  progress: number,
  motionPair: VerticalWaveMotionPair,
  config: VerticalWaveConfig,
) {
  const leftStrand = getAnimatedStrandOffset(progress, motionPair.left, config, 1);
  const rightStrand = getAnimatedStrandOffset(progress, motionPair.right, config, -1);
  const midpointOffset = (leftStrand.offsetX + rightStrand.offsetX) / 2;
  const pointA = {
    x: config.centerX + leftStrand.offsetX - midpointOffset,
    y: leftStrand.y,
  } satisfies HelixPoint;
  const pointB = {
    x: config.centerX + rightStrand.offsetX - midpointOffset,
    y: rightStrand.y,
  } satisfies HelixPoint;
  const leftPoint = pointA.x <= pointB.x ? pointA : pointB;
  const rightPoint = pointA.x <= pointB.x ? pointB : pointA;

  return {
    leftPoint,
    pointA,
    pointB,
    rightPoint,
  };
}

export function buildAnimatedVerticalWavePairPaths(
  motionPair: VerticalWaveMotionPair,
  config: VerticalWaveConfig,
) {
  const sampleCount = Math.max(config.sampleCount, 2);
  const leftPoints: HelixPoint[] = [];
  const rightPoints: HelixPoint[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / (sampleCount - 1);
    const { pointA, pointB } = getAnimatedVerticalWavePairAtProgress(
      progress,
      motionPair,
      config,
    );

    leftPoints.push(pointA);
    rightPoints.push(pointB);
  }

  return {
    leftPath: buildSmoothPath(leftPoints),
    rightPath: buildSmoothPath(rightPoints),
  };
}

export function buildAnimatedWaveCrossingProgresses(
  motionPair: VerticalWaveMotionPair,
  options?: Parameters<typeof buildWaveCrossingProgresses>[1],
) {
  return buildWaveCrossingProgresses(motionPair.averageCycles, options);
}

export function buildWaveCrossingProgresses(
  cycles: number,
  {
    startPadding = 0.06,
    endPadding = 0.94,
  }: {
    startPadding?: number;
    endPadding?: number;
  } = {},
) {
  const halfWaveCount = Math.max(1, Math.floor(cycles * 2));
  const progressStops = Array.from(
    { length: halfWaveCount },
    (_, index) => (index + 1) / (cycles * 2),
  );

  return progressStops.filter((progress) => progress > startPadding && progress < endPadding);
}
