"use client";

import type { CSSProperties, MutableRefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { type HorizontalWaveConfig, buildHorizontalWavePath } from "./helix-wave";

const VIEWBOX_WIDTH = 1320;
const VIEWBOX_HEIGHT = 620;
const DEFAULT_AMPLITUDE = 88;
const DEFAULT_PHASE_SPEED = 0.72;
const DEFAULT_LINE_WIDTH = 18;
const MIN_AMPLITUDE = 34;
const MAX_AMPLITUDE = 240;
const MIN_PHASE_SPEED = 0.18;
const MAX_PHASE_SPEED = 5;
const MIN_LINE_WIDTH = 10;
const MAX_LINE_WIDTH = 28;
const BASE_WAVE_CONFIG = {
  amplitude: DEFAULT_AMPLITUDE,
  centerY: VIEWBOX_HEIGHT / 2,
  cycles: 2.22,
  edgeTaper: 0.12,
  leftX: 42,
  rightX: VIEWBOX_WIDTH - 42,
  sampleCount: 240,
} satisfies HorizontalWaveConfig;
const GRADIENT_SPAN = 1320;
const GRADIENT_CENTER_X = VIEWBOX_WIDTH / 2;
const GRADIENT_CENTER_Y = VIEWBOX_HEIGHT / 2;

const amplitudeSliderStyle: CSSProperties = {
  ["--purpose-slider-accent" as string]: "#ff9a3d",
};

const orangeSliderStyle: CSSProperties = {
  ["--purpose-slider-accent" as string]: "#f2b173",
};

const purpleSliderStyle: CSSProperties = {
  ["--purpose-slider-accent" as string]: "#b09be6",
};

const greenSliderStyle: CSSProperties = {
  ["--purpose-slider-accent" as string]: "#88d2ab",
};

const phaseSliderStyle: CSSProperties = {
  ["--purpose-slider-accent" as string]: "#35b7ff",
};

const lineWidthSliderStyle: CSSProperties = {
  ["--purpose-slider-accent" as string]: "#9c5cff",
};

type FrameState = {
  bandAPath: string;
  bandBPath: string;
};

type PathKey =
  | "bandABackdrop"
  | "bandAGlow"
  | "bandABody"
  | "bandBBackdrop"
  | "bandBGlow"
  | "bandBBody";

type PathRefMap = Record<PathKey, SVGPathElement | null>;

type GradientKey = "bandAGlow" | "bandABody" | "bandBGlow" | "bandBBody";

type GradientRefMap = Record<GradientKey, SVGLinearGradientElement | null>;

const BODY_NEUTRAL_COLOR = "#ddd8d0";
const GLOW_NEUTRAL_COLOR = "#d7ddd6";
const ORANGE_HEX = "#f2b173";
const PURPLE_HEX = "#b09be6";
const GREEN_HEX = "#88d2ab";
const BODY_GRADIENT_OFFSETS = ["0%", "26%", "52%", "78%", "100%"] as const;
const GLOW_GRADIENT_BASE_ALPHA = [0.2, 0.26, 0.32, 0.26, 0.2] as const;

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;
  const value = Number.parseInt(expanded, 16);

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

const ORANGE_RGB = hexToRgb(ORANGE_HEX);
const PURPLE_RGB = hexToRgb(PURPLE_HEX);
const GREEN_RGB = hexToRgb(GREEN_HEX);
const WHITE_RGB = hexToRgb("#ffffff");
const BODY_NEUTRAL_RGB = hexToRgb(BODY_NEUTRAL_COLOR);
const GLOW_NEUTRAL_RGB = hexToRgb(GLOW_NEUTRAL_COLOR);
const SHADOW_RGB = hexToRgb("#080808");

function blendRgb(base: RgbColor, target: RgbColor, amountPercent: number) {
  const amount = clamp(amountPercent, 0, 100) / 100;

  return {
    b: target.b + (base.b - target.b) * amount,
    g: target.g + (base.g - target.g) * amount,
    r: target.r + (base.r - target.r) * amount,
  } satisfies RgbColor;
}

function rgbToCss(color: RgbColor) {
  return `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;
}

function rgbaToCss(color: RgbColor, alpha: number) {
  return `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},${alpha.toFixed(3)})`;
}

function buildBandColor(
  orangeAmount: number,
  purpleAmount: number,
  greenAmount: number,
  fallbackColor: RgbColor,
) {
  const weights = [
    { color: ORANGE_RGB, weight: clamp(orangeAmount, 0, 100) },
    { color: PURPLE_RGB, weight: clamp(purpleAmount, 0, 100) },
    { color: GREEN_RGB, weight: clamp(greenAmount, 0, 100) },
  ];
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return fallbackColor;
  }

  return {
    b: weights.reduce((sum, entry) => sum + entry.color.b * entry.weight, 0) / totalWeight,
    g: weights.reduce((sum, entry) => sum + entry.color.g * entry.weight, 0) / totalWeight,
    r: weights.reduce((sum, entry) => sum + entry.color.r * entry.weight, 0) / totalWeight,
  } satisfies RgbColor;
}

type GradientStop = {
  color: string;
  offset: string;
};

function buildBodyGradientStops(bandColor: RgbColor) {
  return [
    { color: rgbToCss(blendRgb(bandColor, SHADOW_RGB, 76)), offset: BODY_GRADIENT_OFFSETS[0] },
    { color: rgbToCss(blendRgb(bandColor, WHITE_RGB, 88)), offset: BODY_GRADIENT_OFFSETS[1] },
    { color: rgbToCss(blendRgb(bandColor, WHITE_RGB, 94)), offset: BODY_GRADIENT_OFFSETS[2] },
    { color: rgbToCss(blendRgb(bandColor, WHITE_RGB, 88)), offset: BODY_GRADIENT_OFFSETS[3] },
    { color: rgbToCss(blendRgb(bandColor, SHADOW_RGB, 76)), offset: BODY_GRADIENT_OFFSETS[4] },
  ] satisfies GradientStop[];
}

function buildGlowGradientStops(glowColor: RgbColor) {
  return [
    {
      color: rgbaToCss(blendRgb(glowColor, WHITE_RGB, 84), GLOW_GRADIENT_BASE_ALPHA[0]),
      offset: BODY_GRADIENT_OFFSETS[0],
    },
    {
      color: rgbaToCss(blendRgb(glowColor, WHITE_RGB, 88), GLOW_GRADIENT_BASE_ALPHA[1]),
      offset: BODY_GRADIENT_OFFSETS[1],
    },
    {
      color: rgbaToCss(blendRgb(glowColor, WHITE_RGB, 92), GLOW_GRADIENT_BASE_ALPHA[2]),
      offset: BODY_GRADIENT_OFFSETS[2],
    },
    {
      color: rgbaToCss(blendRgb(glowColor, WHITE_RGB, 88), GLOW_GRADIENT_BASE_ALPHA[3]),
      offset: BODY_GRADIENT_OFFSETS[3],
    },
    {
      color: rgbaToCss(blendRgb(glowColor, WHITE_RGB, 84), GLOW_GRADIENT_BASE_ALPHA[4]),
      offset: BODY_GRADIENT_OFFSETS[4],
    },
  ] satisfies GradientStop[];
}

function lerp(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

function setPathRef(pathRefs: MutableRefObject<PathRefMap>, key: PathKey) {
  return (node: SVGPathElement | null) => {
    pathRefs.current[key] = node;
  };
}

function setGradientRef(gradientRefs: MutableRefObject<GradientRefMap>, key: GradientKey) {
  return (node: SVGLinearGradientElement | null) => {
    gradientRefs.current[key] = node;
  };
}

function buildGradientTransform(translateX: number, rotation: number) {
  return `translate(${translateX.toFixed(2)} 0) rotate(${rotation.toFixed(2)} ${GRADIENT_CENTER_X} ${GRADIENT_CENTER_Y})`;
}

function buildFrameState(timeSeconds: number, amplitude: number, phaseSpeed: number) {
  // Keep both strands on the same animated wave so the silhouette stays balanced.
  // The only separation should come from the exact opposing phase, not mismatched configs.
  const centerDrift = Math.sin(timeSeconds * 0.17) * 5;
  const phaseBias = Math.sin(timeSeconds * 0.21 + 0.45) * 0.08;
  const commonPhase = timeSeconds * phaseSpeed * 0.92 + phaseBias;
  const sharedConfig = {
    ...BASE_WAVE_CONFIG,
    amplitude: amplitude * (1 + Math.sin(timeSeconds * 0.38 + 0.3) * 0.04),
    centerY: BASE_WAVE_CONFIG.centerY + centerDrift,
    cycles: BASE_WAVE_CONFIG.cycles + Math.sin(timeSeconds * 0.08 + 0.2) * 0.02,
  } satisfies HorizontalWaveConfig;
  const phaseA = commonPhase;
  const phaseB = commonPhase + Math.PI;

  return {
    bandAPath: buildHorizontalWavePath(phaseA, sharedConfig),
    bandBPath: buildHorizontalWavePath(phaseB, sharedConfig),
  } satisfies FrameState;
}

const INITIAL_FRAME = buildFrameState(0, DEFAULT_AMPLITUDE, DEFAULT_PHASE_SPEED);

export function PurposeHero() {
  const [amplitude, setAmplitude] = useState(DEFAULT_AMPLITUDE);
  const [greenAmount, setGreenAmount] = useState(100);
  const [phaseSpeed, setPhaseSpeed] = useState(DEFAULT_PHASE_SPEED);
  const [lineWidth, setLineWidth] = useState(DEFAULT_LINE_WIDTH);
  const [orangeAmount, setOrangeAmount] = useState(100);
  const [purpleAmount, setPurpleAmount] = useState(100);
  const amplitudeTargetRef = useRef(amplitude);
  const phaseSpeedTargetRef = useRef(phaseSpeed);
  const motionStateRef = useRef({
    amplitude,
    phaseSpeed,
  });
  const gradientRefs = useRef<GradientRefMap>({
    bandAGlow: null,
    bandABody: null,
    bandBGlow: null,
    bandBBody: null,
  });
  const pathRefs = useRef<PathRefMap>({
    bandABackdrop: null,
    bandAGlow: null,
    bandABody: null,
    bandBBackdrop: null,
    bandBGlow: null,
    bandBBody: null,
  });
  const stageIds = {
    bandABody: useId(),
    bandAGlow: useId(),
    bandBBody: useId(),
    bandBGlow: useId(),
    ambientGlow: useId(),
    tightGlow: useId(),
  };
  const backdropStrokeWidth = lineWidth + 36;
  const glowStrokeWidth = lineWidth + 6;
  const bodyBandColor = buildBandColor(orangeAmount, purpleAmount, greenAmount, BODY_NEUTRAL_RGB);
  const glowBandColor = buildBandColor(orangeAmount, purpleAmount, greenAmount, GLOW_NEUTRAL_RGB);
  const bodyGradientStops = buildBodyGradientStops(bodyBandColor);
  const glowGradientStops = buildGlowGradientStops(glowBandColor);

  useEffect(() => {
    amplitudeTargetRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    phaseSpeedTargetRef.current = phaseSpeed;
  }, [phaseSpeed]);

  useEffect(() => {
    const applyFrame = (frame: FrameState, timeSeconds: number, activePhaseSpeed: number) => {
      const nextPaths: Array<[PathKey, string]> = [
        ["bandABackdrop", frame.bandAPath],
        ["bandAGlow", frame.bandAPath],
        ["bandABody", frame.bandAPath],
        ["bandBBackdrop", frame.bandBPath],
        ["bandBGlow", frame.bandBPath],
        ["bandBBody", frame.bandBPath],
      ];

      nextPaths.forEach(([key, path]) => {
        pathRefs.current[key]?.setAttribute("d", path);
      });

      const sharedGlowTransform = buildGradientTransform(
        -timeSeconds * activePhaseSpeed * 68,
        0,
      );
      const sharedBodyTransform = buildGradientTransform(
        -timeSeconds * activePhaseSpeed * 96,
        0,
      );
      const gradientTransforms: Array<[GradientKey, string]> = [
        ["bandAGlow", sharedGlowTransform],
        ["bandABody", sharedBodyTransform],
        ["bandBGlow", sharedGlowTransform],
        ["bandBBody", sharedBodyTransform],
      ];

      gradientTransforms.forEach(([key, transform]) => {
        gradientRefs.current[key]?.setAttribute("gradientTransform", transform);
      });
    };

    const reducedMotionQuery =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    let frameId = 0;
    let startTime = 0;

    const tick = (now: number) => {
      if (!startTime) {
        startTime = now;
      }

      const timeSeconds = (now - startTime) / 1000;

      motionStateRef.current.amplitude = lerp(
        motionStateRef.current.amplitude,
        amplitudeTargetRef.current,
        0.08,
      );
      motionStateRef.current.phaseSpeed = lerp(
        motionStateRef.current.phaseSpeed,
        phaseSpeedTargetRef.current,
        0.08,
      );

      applyFrame(
        buildFrameState(
          timeSeconds,
          motionStateRef.current.amplitude,
          motionStateRef.current.phaseSpeed,
        ),
        timeSeconds,
        motionStateRef.current.phaseSpeed,
      );

      if (!reducedMotionQuery?.matches) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    applyFrame(INITIAL_FRAME, 0, DEFAULT_PHASE_SPEED);

    if (!reducedMotionQuery?.matches && typeof window !== "undefined") {
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#00ff00] text-[var(--text)]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 pb-32 pt-6 sm:px-8 lg:px-12 lg:pb-36 lg:pt-8">
        <section className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[1180px] lg:w-[68vw]">
            <svg
              aria-hidden="true"
              className="relative h-auto w-full overflow-visible"
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            >
              <defs>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id={stageIds.bandAGlow}
                  ref={setGradientRef(gradientRefs, "bandAGlow")}
                  spreadMethod="repeat"
                  x1="0"
                  x2={String(GRADIENT_SPAN)}
                  y1="0"
                  y2="0"
                >
                  {glowGradientStops.map((stop) => (
                    <stop key={`${stageIds.bandAGlow}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id={stageIds.bandABody}
                  ref={setGradientRef(gradientRefs, "bandABody")}
                  spreadMethod="repeat"
                  x1="0"
                  x2={String(GRADIENT_SPAN)}
                  y1="0"
                  y2="0"
                >
                  {bodyGradientStops.map((stop) => (
                    <stop key={`${stageIds.bandABody}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id={stageIds.bandBGlow}
                  ref={setGradientRef(gradientRefs, "bandBGlow")}
                  spreadMethod="repeat"
                  x1="0"
                  x2={String(GRADIENT_SPAN)}
                  y1="0"
                  y2="0"
                >
                  {glowGradientStops.map((stop) => (
                    <stop key={`${stageIds.bandBGlow}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id={stageIds.bandBBody}
                  ref={setGradientRef(gradientRefs, "bandBBody")}
                  spreadMethod="repeat"
                  x1="0"
                  x2={String(GRADIENT_SPAN)}
                  y1="0"
                  y2="0"
                >
                  {bodyGradientStops.map((stop) => (
                    <stop key={`${stageIds.bandBBody}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
                <filter
                  colorInterpolationFilters="sRGB"
                  height="240%"
                  id={stageIds.ambientGlow}
                  width="220%"
                  x="-60%"
                  y="-70%"
                >
                  <feGaussianBlur in="SourceGraphic" result="ambientBlur" stdDeviation="22" />
                  <feColorMatrix
                    in="ambientBlur"
                    type="matrix"
                    values="
                      1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 1.25 0
                    "
                  />
                </filter>
                <filter id={stageIds.tightGlow}>
                  <feGaussianBlur stdDeviation="4.5" />
                </filter>
              </defs>

              <path
                d={INITIAL_FRAME.bandAPath}
                fill="none"
                filter={`url(#${stageIds.ambientGlow})`}
                ref={setPathRef(pathRefs, "bandABackdrop")}
                stroke={`url(#${stageIds.bandAGlow})`}
                strokeLinecap="round"
                strokeOpacity="0.46"
                strokeWidth={backdropStrokeWidth}
              />
              <path
                d={INITIAL_FRAME.bandBPath}
                fill="none"
                filter={`url(#${stageIds.ambientGlow})`}
                ref={setPathRef(pathRefs, "bandBBackdrop")}
                stroke={`url(#${stageIds.bandBGlow})`}
                strokeLinecap="round"
                strokeOpacity="0.46"
                strokeWidth={backdropStrokeWidth}
              />

              <path
                d={INITIAL_FRAME.bandAPath}
                fill="none"
                filter={`url(#${stageIds.tightGlow})`}
                ref={setPathRef(pathRefs, "bandAGlow")}
                stroke={`url(#${stageIds.bandAGlow})`}
                strokeLinecap="round"
                strokeOpacity="0.94"
                strokeWidth={glowStrokeWidth}
              />
              <path
                d={INITIAL_FRAME.bandBPath}
                fill="none"
                filter={`url(#${stageIds.tightGlow})`}
                ref={setPathRef(pathRefs, "bandBGlow")}
                stroke={`url(#${stageIds.bandBGlow})`}
                strokeLinecap="round"
                strokeOpacity="0.94"
                strokeWidth={glowStrokeWidth}
              />

              <path
                d={INITIAL_FRAME.bandAPath}
                fill="none"
                ref={setPathRef(pathRefs, "bandABody")}
                stroke={`url(#${stageIds.bandABody})`}
                strokeLinecap="round"
                strokeWidth={lineWidth}
              />
              <path
                d={INITIAL_FRAME.bandBPath}
                fill="none"
                ref={setPathRef(pathRefs, "bandBBody")}
                stroke={`url(#${stageIds.bandBBody})`}
                strokeLinecap="round"
                strokeWidth={lineWidth}
              />
            </svg>
          </div>
        </section>

        <section className="mt-auto flex justify-center pt-6 lg:pt-8">
          <div className="flex w-full max-w-[1140px] flex-wrap items-center justify-center gap-3 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.84)] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.34)] backdrop-blur-md sm:px-5">
            <label className="flex min-w-[150px] flex-1 basis-[150px] items-center gap-3">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#ff9a3d]" />
              <span className="sr-only">Amplitude</span>
              <input
                aria-label="Amplitude"
                className="purpose-slider"
                max={MAX_AMPLITUDE}
                min={MIN_AMPLITUDE}
                onChange={(event) => setAmplitude(Number(event.currentTarget.value))}
                step={1}
                style={amplitudeSliderStyle}
                type="range"
                value={amplitude}
              />
            </label>

            <label className="flex min-w-[150px] flex-1 basis-[150px] items-center gap-3">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#f2b173]" />
              <span className="sr-only">Orange intensity</span>
              <input
                aria-label="Orange intensity"
                className="purpose-slider"
                max={100}
                min={0}
                onChange={(event) => setOrangeAmount(Number(event.currentTarget.value))}
                step={1}
                style={orangeSliderStyle}
                type="range"
                value={orangeAmount}
              />
            </label>

            <label className="flex min-w-[150px] flex-1 basis-[150px] items-center gap-3">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#b09be6]" />
              <span className="sr-only">Purple intensity</span>
              <input
                aria-label="Purple intensity"
                className="purpose-slider"
                max={100}
                min={0}
                onChange={(event) => setPurpleAmount(Number(event.currentTarget.value))}
                step={1}
                style={purpleSliderStyle}
                type="range"
                value={purpleAmount}
              />
            </label>

            <label className="flex min-w-[150px] flex-1 basis-[150px] items-center gap-3">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#88d2ab]" />
              <span className="sr-only">Green intensity</span>
              <input
                aria-label="Green intensity"
                className="purpose-slider"
                max={100}
                min={0}
                onChange={(event) => setGreenAmount(Number(event.currentTarget.value))}
                step={1}
                style={greenSliderStyle}
                type="range"
                value={greenAmount}
              />
            </label>

            <label className="flex min-w-[150px] flex-1 basis-[150px] items-center gap-3">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#9c5cff]" />
              <span className="sr-only">Line width</span>
              <input
                aria-label="Line width"
                className="purpose-slider"
                max={MAX_LINE_WIDTH}
                min={MIN_LINE_WIDTH}
                onChange={(event) => setLineWidth(Number(event.currentTarget.value))}
                step={0.5}
                style={lineWidthSliderStyle}
                type="range"
                value={lineWidth}
              />
            </label>

            <label className="flex min-w-[150px] flex-1 basis-[150px] items-center gap-3">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#35b7ff]" />
              <span className="sr-only">Phase speed</span>
              <input
                aria-label="Phase shift speed"
                className="purpose-slider"
                max={MAX_PHASE_SPEED}
                min={MIN_PHASE_SPEED}
                onChange={(event) => setPhaseSpeed(Number(event.currentTarget.value))}
                step={0.01}
                style={phaseSliderStyle}
                type="range"
                value={phaseSpeed}
              />
            </label>
          </div>
        </section>
      </div>
    </main>
  );
}
