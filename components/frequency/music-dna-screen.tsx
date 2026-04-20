"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Disc3,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./avatar-stack";
import { GlassCard } from "./glass-card";
import {
  type HorizontalWaveConfig,
  buildHorizontalWavePath,
  getHorizontalWavePairAtProgress,
} from "./helix-wave";
import {
  MUSIC_DNA_INSIGHTS,
  MUSIC_DNA_MOMENTS,
} from "./music-dna-demo-data";
import { StatPill } from "./stat-pill";

const RAIL_VIEWBOX_WIDTH = 1180;
const RAIL_VIEWBOX_HEIGHT = 144;
const RAIL_WAVE_CONFIG = {
  amplitude: 24,
  centerY: 72,
  cycles: 3.85,
  edgeTaper: 0.1,
  leftX: 54,
  rightX: RAIL_VIEWBOX_WIDTH - 54,
  sampleCount: 220,
} satisfies HorizontalWaveConfig;
const CARD_WAVE_VIEWBOX_WIDTH = 360;
const CARD_WAVE_VIEWBOX_HEIGHT = 72;
const CARD_WAVE_CONFIG = {
  amplitude: 12,
  centerY: 36,
  cycles: 1.65,
  edgeTaper: 0.14,
  leftX: 12,
  rightX: CARD_WAVE_VIEWBOX_WIDTH - 12,
  sampleCount: 120,
} satisfies HorizontalWaveConfig;
const RAIL_PATH_A = buildHorizontalWavePath(0, RAIL_WAVE_CONFIG);
const RAIL_PATH_B = buildHorizontalWavePath(Math.PI, RAIL_WAVE_CONFIG);
const CARD_PATH_A = buildHorizontalWavePath(0, CARD_WAVE_CONFIG);
const CARD_PATH_B = buildHorizontalWavePath(Math.PI, CARD_WAVE_CONFIG);

function buildGradientStops(entries: Array<{ color: string; progress: number }>) {
  if (!entries.length) {
    return [
      { color: "#8bb9d8", offset: "0%" },
      { color: "#8bb9d8", offset: "100%" },
    ];
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

function buildPanelBackground() {
  return {
    background: [
      "radial-gradient(circle at top left, rgba(255,255,255,0.055), transparent 34%)",
      "radial-gradient(circle at 82% 16%, rgba(255,255,255,0.028), transparent 24%)",
      "linear-gradient(180deg, rgba(18,24,35,0.9), rgba(9,12,18,0.96))",
    ].join(", "),
  };
}

function buildCardBackground() {
  return {
    background: [
      "radial-gradient(circle at top left, rgba(255,255,255,0.05), transparent 34%)",
      "radial-gradient(circle at 80% 14%, rgba(255,255,255,0.024), transparent 24%)",
      "linear-gradient(180deg, rgba(17,21,31,0.96), rgba(8,11,17,0.98))",
    ].join(", "),
    boxShadow: "0 22px 58px rgba(0,0,0,0.22)",
  };
}

function scrollCardIntoView(node: HTMLElement | null) {
  node?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
}

export function MusicDnaScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const gradientId = useId();
  const railGlowId = useId();
  const railBackdropId = useId();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const activeMoment = MUSIC_DNA_MOMENTS[activeIndex] ?? MUSIC_DNA_MOMENTS[0];
  const activeAccent = getGenreColor(activeMoment.topGenre);
  const railStops = useMemo(
    () =>
      buildGradientStops(
        MUSIC_DNA_MOMENTS.map((moment, index) => ({
          color: getGenreColor(moment.topGenre),
          progress:
            MUSIC_DNA_MOMENTS.length <= 1
              ? 0
              : index / (MUSIC_DNA_MOMENTS.length - 1),
        })),
      ),
    [],
  );
  const railNodes = useMemo(
    () =>
      MUSIC_DNA_MOMENTS.map((moment, index) => {
        const progress =
          MUSIC_DNA_MOMENTS.length <= 1 ? 0 : index / (MUSIC_DNA_MOMENTS.length - 1);
        const wavePair = getHorizontalWavePairAtProgress(progress, RAIL_WAVE_CONFIG);
        const anchorPoint = index % 2 === 0 ? wavePair.upperPoint : wavePair.lowerPoint;

        return {
          accent: getGenreColor(moment.topGenre),
          id: moment.id,
          x: anchorPoint.x,
          y: anchorPoint.y,
        };
      }),
    [],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    let frameId = 0;

    const updateActiveIndex = () => {
      const scrollerCenter = scroller.scrollLeft + scroller.clientWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cardRefs.current.forEach((card, index) => {
        if (!card) {
          return;
        }

        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const distance = Math.abs(cardCenter - scrollerCenter);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActiveIndex((current) => (current === nearestIndex ? current : nearestIndex));
    };

    const handleScroll = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(updateActiveIndex);
    };

    updateActiveIndex();
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateActiveIndex);

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateActiveIndex);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const goToIndex = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, MUSIC_DNA_MOMENTS.length - 1));
    setActiveIndex(boundedIndex);
    scrollCardIntoView(cardRefs.current[boundedIndex]);
  };

  return (
    <div className="page-atmosphere space-y-6 sm:space-y-7">
      <section className="relative isolate overflow-hidden rounded-[36px] border border-[rgba(255,255,255,0.08)] p-5 shadow-[0_22px_56px_rgba(0,0,0,0.24)] sm:p-6 lg:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={buildPanelBackground()}
        />
        <div
          aria-hidden="true"
          className="absolute -left-12 top-8 h-44 w-44 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.045), transparent 72%)" }}
        />
        <div
          aria-hidden="true"
          className="absolute right-[-6%] top-14 h-52 w-52 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.03), transparent 74%)" }}
        />

        <div className="relative flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] xl:items-start">
          <div className="space-y-4">
            <StatPill className="bg-[rgba(255,255,255,0.05)] text-[var(--text)]">
              Demo capsule
            </StatPill>
            <div className="space-y-3">
              <h1 className="text-[clamp(2.4rem,7vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[var(--text)]">
                Music DNA
              </h1>
              <p className="max-w-2xl text-[15px] leading-7 text-[var(--text-soft)] sm:text-[16px]">
                Swipe through a polished demo timeline of how shared songs became memory,
                social gravity, and a taste identity that keeps mutating over time.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <StatPill>{MUSIC_DNA_MOMENTS.length} eras</StatPill>
              <StatPill>{MUSIC_DNA_INSIGHTS[0]?.value}</StatPill>
              <StatPill>{MUSIC_DNA_INSIGHTS[5]?.value}</StatPill>
            </div>
          </div>

          <GlassCard
            strong
            className="relative overflow-hidden rounded-[30px] p-5 sm:p-6"
            style={buildCardBackground()}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-5 top-5 h-20 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.035), transparent 72%)" }}
            />

            <div className="relative space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                    Active era
                  </p>
                  <p className="text-[26px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                    {activeMoment.title}
                  </p>
                  <p className="text-[13px] text-[var(--text-soft)]">{activeMoment.timestamp}</p>
                </div>
                <span
                  className="inline-flex min-h-10 items-center rounded-full border px-3 text-[12px] font-medium text-[var(--text)]"
                  style={{
                    backgroundColor: withAlpha(activeAccent, 0.14),
                    borderColor: withAlpha(activeAccent, 0.22),
                  }}
                >
                  {activeMoment.topGenre}
                </span>
              </div>

              <p className="text-[15px] leading-7 text-[var(--text-soft)]">
                {activeMoment.vibeSummary}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="surface-inline-soft rounded-[22px] p-3.5">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-faint)]">
                    <Users className="size-3.5" />
                    Top contributor
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="grid size-11 place-items-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: activeMoment.topContributor.color }}
                    >
                      {activeMoment.topContributor.initials}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--text)]">
                        {activeMoment.topContributor.name}
                      </p>
                      <p className="text-[12px] text-[var(--text-soft)]">
                        {activeMoment.statLabel}: {activeMoment.statValue}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="surface-inline-soft rounded-[22px] p-3.5">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-faint)]">
                    <Sparkles className="size-3.5" />
                    Shift cue
                  </div>
                  <p className="mt-3 text-[14px] font-medium text-[var(--text)]">
                    {activeMoment.shiftFrom}
                    {" -> "}
                    {activeMoment.shiftTo}
                  </p>
                  <p className="mt-1 text-[12px] leading-6 text-[var(--text-soft)]">
                    {activeMoment.memoryTag}
                  </p>
                </div>
              </div>

              <div className="surface-inline-soft rounded-[22px] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-faint)]">
                      Social context
                    </p>
                    <p className="mt-1 text-[14px] leading-6 text-[var(--text-soft)]">
                      {activeMoment.contributorNote}
                    </p>
                  </div>
                  <AvatarStack people={activeMoment.contributors} size="sm" />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      <section className="relative isolate overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.06)] bg-[rgba(9,12,18,0.78)] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:p-5">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-28"
          style={{
            background: "radial-gradient(circle at top center, rgba(255,255,255,0.035), transparent 72%)",
          }}
        />

        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
              Taste rail
            </p>
            <p className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-[var(--text)]">
              From Spring &#39;24 to Puerto Rico &#39;26
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous era"
              className="inline-flex size-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text)] transition hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={activeIndex === 0}
              onClick={() => goToIndex(activeIndex - 1)}
              type="button"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              aria-label="Next era"
              className="inline-flex size-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text)] transition hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={activeIndex === MUSIC_DNA_MOMENTS.length - 1}
              onClick={() => goToIndex(activeIndex + 1)}
              type="button"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-4 overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-3 py-4 sm:px-5">
          <svg
            aria-hidden="true"
            className="h-auto w-full overflow-visible"
            viewBox={`0 0 ${RAIL_VIEWBOX_WIDTH} ${RAIL_VIEWBOX_HEIGHT}`}
          >
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id={gradientId}
                x1="0"
                x2={String(RAIL_VIEWBOX_WIDTH)}
                y1="0"
                y2="0"
              >
                {railStops.map((stop) => (
                  <stop
                    key={`${gradientId}-${stop.offset}`}
                    offset={stop.offset}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
              <filter id={railGlowId}>
                <feGaussianBlur stdDeviation="4.2" />
              </filter>
              <filter id={railBackdropId}>
                <feGaussianBlur stdDeviation="14" />
              </filter>
            </defs>

            <path
              d={RAIL_PATH_A}
              fill="none"
              filter={`url(#${railBackdropId})`}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeOpacity="0.25"
              strokeWidth="18"
            />
            <path
              d={RAIL_PATH_B}
              fill="none"
              filter={`url(#${railBackdropId})`}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeOpacity="0.25"
              strokeWidth="18"
            />
            <path
              d={RAIL_PATH_A}
              fill="none"
              filter={`url(#${railGlowId})`}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeOpacity="0.82"
              strokeWidth="7"
            />
            <path
              d={RAIL_PATH_B}
              fill="none"
              filter={`url(#${railGlowId})`}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeOpacity="0.82"
              strokeWidth="7"
            />
            <path
              d={RAIL_PATH_A}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d={RAIL_PATH_B}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeWidth="3"
            />

            {railNodes.map((node, index) => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  fill={node.accent}
                  opacity={index === activeIndex ? 0.3 : 0.16}
                  r={index === activeIndex ? 20 : 12}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  fill={node.accent}
                  r={index === activeIndex ? 6.5 : 4.5}
                  stroke="rgba(255,255,255,0.78)"
                  strokeWidth={index === activeIndex ? 2.2 : 1.6}
                />
              </g>
            ))}
          </svg>
        </div>

        <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[14px] font-semibold text-[var(--text)]">
              {activeMoment.title}
            </p>
            <p className="text-[13px] text-[var(--text-soft)]">
              {activeMoment.timestamp} • {activeMoment.topGenre}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {MUSIC_DNA_MOMENTS.map((moment, index) => (
              <button
                key={moment.id}
                aria-label={`Go to ${moment.title}`}
                className={cn(
                  "h-2.5 rounded-full transition",
                  index === activeIndex ? "w-8" : "w-2.5 hover:w-4",
                )}
                onClick={() => goToIndex(index)}
                style={{
                  backgroundColor:
                    index === activeIndex
                      ? getGenreColor(moment.topGenre)
                      : "rgba(255,255,255,0.18)",
                }}
                type="button"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
              Swipe timeline
            </p>
            <p className="text-[20px] font-semibold tracking-[-0.04em] text-[var(--text)]">
              Memory capsules with songs, contributors, and mood shifts
            </p>
          </div>
          <p className="text-[12px] text-[var(--text-soft)]">
            {activeIndex + 1}/{MUSIC_DNA_MOMENTS.length}
          </p>
        </div>

        <div
          className="music-dna-scroll -mx-4 flex overflow-x-auto px-4 pb-2 sm:-mx-5 sm:px-5 lg:-mx-2 lg:px-2"
          ref={scrollerRef}
        >
          <div className="flex gap-4 lg:gap-5">
            {MUSIC_DNA_MOMENTS.map((moment, index) => {
              const accent = getGenreColor(moment.topGenre);
              const isActive = index === activeIndex;

              return (
                <article
                  key={moment.id}
                  className={cn(
                    "relative min-h-[690px] w-[86vw] max-w-[430px] snap-center overflow-hidden rounded-[32px] border p-5 transition duration-300 sm:min-h-[720px] sm:p-6",
                    isActive
                      ? "translate-y-[-4px] border-[rgba(255,255,255,0.1)]"
                      : "border-[rgba(255,255,255,0.06)] opacity-90",
                  )}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  style={buildCardBackground()}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-6 top-5 h-24 rounded-full blur-3xl"
                    style={{ background: "radial-gradient(circle, rgba(255,255,255,0.035), transparent 72%)" }}
                  />

                  <div className="relative flex h-full flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                          {moment.timestamp}
                        </p>
                        <div>
                          <h2 className="text-[30px] font-semibold leading-[0.95] tracking-[-0.05em] text-[var(--text)]">
                            {moment.title}
                          </h2>
                          <p className="mt-2 text-[15px] leading-7 text-[var(--text-soft)]">
                            {moment.vibeSummary}
                          </p>
                        </div>
                      </div>

                      <span
                        className="inline-flex min-h-10 items-center rounded-full border px-3 text-[12px] font-medium text-[var(--text)]"
                        style={{
                          backgroundColor: withAlpha(accent, 0.14),
                          borderColor: withAlpha(accent, 0.22),
                        }}
                      >
                        {moment.topGenre}
                      </span>
                    </div>

                    <svg
                      aria-hidden="true"
                      className="h-[58px] w-full"
                      viewBox={`0 0 ${CARD_WAVE_VIEWBOX_WIDTH} ${CARD_WAVE_VIEWBOX_HEIGHT}`}
                    >
                      <path
                        d={CARD_PATH_A}
                        fill="none"
                        stroke={withAlpha(accent, 0.26)}
                        strokeLinecap="round"
                        strokeWidth="14"
                      />
                      <path
                        d={CARD_PATH_B}
                        fill="none"
                        stroke={withAlpha(accent, 0.18)}
                        strokeLinecap="round"
                        strokeWidth="14"
                      />
                      <path
                        d={CARD_PATH_A}
                        fill="none"
                        stroke={withAlpha(accent, 0.92)}
                        strokeLinecap="round"
                        strokeWidth="4.5"
                      />
                      <path
                        d={CARD_PATH_B}
                        fill="none"
                        stroke={withAlpha(accent, 0.74)}
                        strokeLinecap="round"
                        strokeWidth="4.5"
                      />
                    </svg>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="surface-inline-soft rounded-[22px] p-3.5">
                        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-faint)]">
                          <TrendingUp className="size-3.5" />
                          Stat highlight
                        </div>
                        <p className="mt-3 text-[15px] font-semibold text-[var(--text)]">
                          {moment.statValue}
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--text-soft)]">
                          {moment.statLabel}
                        </p>
                      </div>

                      <div className="surface-inline-soft rounded-[22px] p-3.5">
                        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-faint)]">
                          <Clock3 className="size-3.5" />
                          Evolution cue
                        </div>
                        <p className="mt-3 text-[14px] font-medium text-[var(--text)]">
                          {moment.shiftFrom}
                          {" -> "}
                          {moment.shiftTo}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                        <Disc3 className="size-3.5" />
                        Representative songs
                      </div>
                      <div className="grid gap-2.5">
                        {moment.representativeSongs.map((song, songIndex) => (
                          <div
                            key={`${moment.id}-${song.title}`}
                            className="surface-inline-soft flex items-center gap-3 rounded-[18px] px-3 py-2.5"
                          >
                            <div
                              className="grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-[var(--text)]"
                              style={{ backgroundColor: withAlpha(accent, 0.18) }}
                            >
                              {songIndex + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-medium text-[var(--text)]">
                                {song.title}
                              </p>
                              <p className="truncate text-[12px] text-[var(--text-soft)]">
                                {song.artist}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                        Representative artists
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {moment.representativeArtists.map((artist) => (
                          <span
                            key={`${moment.id}-${artist}`}
                            className="surface-pill inline-flex min-h-9 items-center rounded-full px-3 text-[12px] font-medium text-[var(--text)]"
                          >
                            {artist}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="surface-inline-soft mt-auto space-y-3 rounded-[24px] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-medium text-[var(--text-faint)]">
                            Top contributor
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">
                            {moment.topContributor.name}
                          </p>
                        </div>
                        <AvatarStack people={moment.contributors} size="sm" />
                      </div>

                      <p className="text-[13px] leading-6 text-[var(--text-soft)]">
                        {moment.contributorNote}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {moment.reactions.map((reaction) => (
                          <span
                            key={`${moment.id}-${reaction.label}`}
                            className="surface-pill inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[12px] font-medium text-[var(--text)]"
                          >
                            <span aria-hidden="true">{reaction.emoji}</span>
                            {reaction.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
                      <p className="text-[13px] leading-6 text-[var(--text-soft)]">
                        {moment.story}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
            DNA summary
          </p>
          <p className="text-[20px] font-semibold tracking-[-0.04em] text-[var(--text)]">
            Prebuilt insights across the whole arc
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MUSIC_DNA_INSIGHTS.map((insight) => (
            <GlassCard
              key={insight.label}
              className="rounded-[26px] p-4 sm:p-5"
              style={buildCardBackground()}
            >
              <div className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  {insight.label}
                </p>
                <p className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                  {insight.value}
                </p>
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  {insight.detail}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
