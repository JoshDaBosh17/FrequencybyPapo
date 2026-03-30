"use client";

import { useMemo, useState } from "react";

import type { GuidedRecommendationIntent } from "@/lib/types";
import { cn } from "@/lib/utils";

const DISCOVERY_LABELS: Record<GuidedRecommendationIntent["discoveryMode"], string> = {
  familiar: "Familiar",
  blend: "Blend",
  explore: "Explore",
};

type GuidedLane = "artist" | "genre" | null;
type GuidedStage = 0 | 1 | 3 | 4;

function ChipButton({
  active,
  children,
  disabled,
  fullWidth,
  large,
  onClick,
  tone = "neutral",
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  large?: boolean;
  onClick: () => void;
  tone?: "artist" | "genre" | "neutral";
}) {
  const tones = {
    artist: active
      ? "border-[#2f3e52] bg-[#2f3e52] text-white shadow-[0_8px_18px_rgba(47,62,82,0.18)]"
      : "border-[#3c4d63] bg-[rgba(26,38,52,0.78)] text-[#d6dfeb] hover:border-[#4d627d] hover:bg-[rgba(31,45,62,0.92)]",
    genre: active
      ? "border-[#67523d] bg-[#67523d] text-white shadow-[0_8px_18px_rgba(103,82,61,0.18)]"
      : "border-[#735a42] bg-[rgba(63,47,34,0.78)] text-[#ead8c4] hover:border-[#8b6d4f] hover:bg-[rgba(73,56,40,0.92)]",
    neutral: active
      ? "border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(42,51,69,0.98),rgba(20,26,38,0.98))] text-[var(--text)] shadow-[0_10px_22px_rgba(0,0,0,0.26)]"
      : "border border-[var(--line)] bg-[var(--surface-inline)] text-[var(--text-soft)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-inline-strong)] hover:text-[var(--text)]",
  } as const;

  return (
    <button
      className={`${large ? "min-h-[50px] rounded-[20px] px-4 text-[14px]" : "min-h-[34px] rounded-full px-3 text-[13px]"} font-medium leading-none transition ${
        fullWidth ? "flex w-full items-center justify-center text-center" : ""
      } ${tones[tone]} ${
        disabled
          ? "cursor-not-allowed border-[var(--line)] bg-[rgba(31,36,48,0.54)] text-[var(--text-faint)] shadow-none hover:border-[var(--line)] hover:bg-[rgba(31,36,48,0.54)]"
          : ""
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function FlowSection({
  children,
  show,
}: {
  children: React.ReactNode;
  show: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        show
          ? "mt-3 max-h-[20rem] translate-y-0 opacity-100"
          : "mt-0 max-h-0 -translate-y-2 opacity-0 pointer-events-none",
      )}
    >
      {children}
    </div>
  );
}

function SummaryPill({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: () => void;
}) {
  return (
    <div className="surface-pill flex items-center gap-2 rounded-full px-3 py-1.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
          {label}
        </p>
        <p className="truncate text-[12px] font-medium text-[var(--text)]">{value}</p>
      </div>
      <button
        className="shrink-0 text-[11px] font-medium text-[var(--text-soft)] transition hover:text-[var(--text)]"
        onClick={onChange}
        type="button"
      >
        Change
      </button>
    </div>
  );
}

function deriveLane(intent: GuidedRecommendationIntent): GuidedLane {
  if (intent.artistSeed) {
    return "artist";
  }

  if (intent.genreSeed) {
    return "genre";
  }

  return null;
}

export function GuidedSongControls({
  artistOptions,
  correlatedGenreOptions,
  genreOptions,
  genreHelperCopy,
  intent,
  pending,
  buttonLabel,
  onIntentChange,
  onConfirm,
}: {
  artistOptions: string[];
  correlatedGenreOptions?: string[];
  genreOptions: string[];
  genreHelperCopy?: string | null;
  intent: GuidedRecommendationIntent;
  pending: boolean;
  buttonLabel: string;
  onIntentChange: (intent: GuidedRecommendationIntent) => void;
  onConfirm: () => void;
}) {
  const [selectedLane, setSelectedLane] = useState<GuidedLane>(() => deriveLane(intent));
  const selectedArtist = intent.artistSeed;
  const selectedGenre = intent.genreSeed;
  const [selectedMode, setSelectedMode] = useState<GuidedRecommendationIntent["discoveryMode"] | null>(null);
  const [currentStage, setCurrentStage] = useState<GuidedStage>(() =>
    deriveLane(intent) ? 3 : 0,
  );

  const resolvedStage =
    !selectedLane
      ? 0
      : currentStage <= 1 || (!selectedArtist && !selectedGenre)
        ? 1
        : currentStage <= 3 || !selectedMode
          ? 3
          : 4;

  const visibleGenreOptions = useMemo(
    () =>
      selectedLane === "artist"
        ? (correlatedGenreOptions?.length ? correlatedGenreOptions : genreOptions)
        : genreOptions,
    [correlatedGenreOptions, genreOptions, selectedLane],
  );

  function updateIntent(nextArtist: string | null, nextGenre: string | null, nextMode?: GuidedRecommendationIntent["discoveryMode"]) {
    onIntentChange({
      ...intent,
      artistSeed: nextArtist,
      genreSeed: nextGenre,
      discoveryMode: nextMode ?? intent.discoveryMode,
    });
  }

  function handleLaneSelect(nextLane: Exclude<GuidedLane, null>) {
    if (selectedLane === nextLane && resolvedStage === 1) {
      return;
    }

    setSelectedLane(nextLane);
    setSelectedMode(null);
    setCurrentStage(1);
    updateIntent(null, null);
  }

  function handleArtistSelect(artist: string) {
    setSelectedLane("artist");
    setSelectedMode(null);
    setCurrentStage(3);
    updateIntent(artist, null);
  }

  function handleGenreSelect(genre: string) {
    setSelectedLane("genre");
    setSelectedMode(null);
    setCurrentStage(3);
    updateIntent(null, genre);
  }

  function handleModeSelect(mode: GuidedRecommendationIntent["discoveryMode"]) {
    setSelectedMode(mode);
    setCurrentStage(4);
    updateIntent(selectedArtist, selectedGenre, mode);
  }

  function handleBack() {
    if (resolvedStage === 4) {
      setSelectedMode(null);
      setCurrentStage(3);
      return;
    }

    if (resolvedStage === 3) {
      setSelectedMode(null);
      setCurrentStage(1);
      updateIntent(null, null);
      return;
    }

    setSelectedLane(null);
    setSelectedMode(null);
    setCurrentStage(0);
    updateIntent(null, null);
  }

  return (
    <div className="rounded-[20px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(18,22,32,0.96),rgba(9,11,17,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
            Pick a lane
          </p>
          <p className="text-[13px] leading-5 text-[var(--text-soft)]">
            Pick a lane for your next drop.
          </p>
        </div>
        {resolvedStage > 0 ? (
          <button
            className="shrink-0 text-[12px] font-medium text-[var(--text-soft)] transition hover:text-[var(--text)]"
            onClick={handleBack}
            type="button"
          >
            Back
          </button>
        ) : null}
      </div>

      <FlowSection show={Boolean(selectedLane || selectedArtist || selectedGenre || selectedMode)}>
        <div className="flex flex-wrap gap-2">
          {selectedLane && (selectedArtist || selectedGenre) ? (
            <SummaryPill
              label={selectedLane === "artist" ? "Artist" : "Vibe"}
              onChange={() => {
                setSelectedMode(null);
                setCurrentStage(1);
                updateIntent(null, null);
              }}
              value={selectedArtist ?? selectedGenre ?? ""}
            />
          ) : null}
          {selectedMode ? (
            <SummaryPill
              label="Mode"
              onChange={() => {
                setSelectedMode(null);
                setCurrentStage(3);
              }}
              value={DISCOVERY_LABELS[selectedMode]}
            />
          ) : null}
        </div>
      </FlowSection>

      <FlowSection show={resolvedStage === 0}>
        <div className="grid grid-cols-2 gap-2">
          <ChipButton
            active={selectedLane === "artist"}
            disabled={!artistOptions.length}
            fullWidth
            large
            onClick={() => handleLaneSelect("artist")}
            tone="artist"
          >
            Artist
          </ChipButton>
          <ChipButton
            active={selectedLane === "genre"}
            disabled={!genreOptions.length}
            fullWidth
            large
            onClick={() => handleLaneSelect("genre")}
            tone="genre"
          >
            Vibe
          </ChipButton>
        </div>
      </FlowSection>

      <FlowSection show={resolvedStage === 1 && selectedLane === "artist"}>
        <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(22,27,38,0.78)] p-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
              Pick an artist
            </p>
            <p className="text-[12px] leading-5 text-[var(--text-soft)]">
              Use one artist to anchor the first move.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {artistOptions.map((artist) => (
              <ChipButton
                key={artist}
                active={selectedArtist === artist}
                onClick={() => handleArtistSelect(artist)}
                tone="artist"
              >
                {artist}
              </ChipButton>
            ))}
          </div>
        </div>
      </FlowSection>

      <FlowSection show={resolvedStage === 1 && selectedLane === "genre"}>
        <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(22,27,38,0.78)] p-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
              Pick a vibe
            </p>
            <p className="text-[12px] leading-5 text-[var(--text-soft)]">
              {genreHelperCopy ?? "Choose the mood you want the first pick to follow."}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleGenreOptions.map((genre) => (
              <ChipButton
                key={genre}
                active={selectedGenre === genre}
                onClick={() => handleGenreSelect(genre)}
                tone="genre"
              >
                {genre}
              </ChipButton>
            ))}
          </div>
        </div>
      </FlowSection>

      <FlowSection show={resolvedStage >= 3 && Boolean(selectedLane) && Boolean(selectedArtist || selectedGenre)}>
        <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(22,27,38,0.78)] p-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
              Choose a mode
            </p>
            <p className="text-[12px] leading-5 text-[var(--text-soft)]">
              Stay close, blend it, or wander a little wider.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["familiar", "blend", "explore"] as const).map((mode) => (
              <ChipButton
                key={mode}
                active={selectedMode === mode}
                onClick={() => handleModeSelect(mode)}
                tone="neutral"
              >
                {DISCOVERY_LABELS[mode]}
              </ChipButton>
            ))}
          </div>
        </div>
      </FlowSection>

      <FlowSection show={resolvedStage === 4 && Boolean(selectedMode)}>
        <button
          className="button-primary min-h-12 w-full rounded-full px-5 text-[14px] font-medium active:scale-[0.99] disabled:opacity-70"
          disabled={pending}
          onClick={onConfirm}
          type="button"
        >
          {pending ? "Generating pick" : buttonLabel}
        </button>
      </FlowSection>
    </div>
  );
}
