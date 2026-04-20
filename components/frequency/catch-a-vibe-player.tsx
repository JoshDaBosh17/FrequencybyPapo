"use client";

import Image from "next/image";
import { useState } from "react";
import { Music4, Sparkles, X } from "lucide-react";

import { CONTINUE_LISTENING_PLAY_ICON_SRC } from "@/lib/frequency/button-icons";
import type { GuidedRecommendationIntent } from "@/lib/types";
import { GuidedSongControls } from "./guided-song-controls";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

type CatchAVibePlayerProps = {
  artistOptions: string[];
  correlatedGenreOptions?: string[];
  genreHelperCopy?: string | null;
  genreOptions: string[];
  intent: GuidedRecommendationIntent;
  onGenerate: () => Promise<void> | void;
  onIntentChange: (intent: GuidedRecommendationIntent) => void;
  onOpenArtists?: () => void;
  onPlay?: () => void;
  playback: {
    artist: string;
    thumbnail: string | null;
    title: string;
  } | null;
  pending: boolean;
  recommendationError?: string | null;
};

function CatchAVibeModal({
  artistOptions,
  correlatedGenreOptions,
  genreHelperCopy,
  genreOptions,
  intent,
  onClose,
  onConfirm,
  onIntentChange,
  pending,
}: {
  artistOptions: string[];
  correlatedGenreOptions?: string[];
  genreHelperCopy?: string | null;
  genreOptions: string[];
  intent: GuidedRecommendationIntent;
  onClose: () => void;
  onConfirm: () => void;
  onIntentChange: (intent: GuidedRecommendationIntent) => void;
  pending: boolean;
}) {
  useModalLock({
    onClose,
    open: true,
  });

  return (
    <ModalFrame className="max-w-xl" closeOnBackdrop onClose={onClose}>
      <div className="shrink-0 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Catch a vibe
            </p>
            <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)]">
              Activate your player
            </h2>
          </div>

          <button
            aria-label="Close catch a vibe"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ModalBody>
        <GuidedSongControls
          artistOptions={artistOptions}
          buttonLabel="Give me one"
          correlatedGenreOptions={correlatedGenreOptions}
          genreHelperCopy={genreHelperCopy}
          genreOptions={genreOptions}
          intent={intent}
          onConfirm={onConfirm}
          onIntentChange={onIntentChange}
          pending={pending}
        />
      </ModalBody>
    </ModalFrame>
  );
}

export function CatchAVibePlayer({
  artistOptions,
  correlatedGenreOptions,
  genreHelperCopy,
  genreOptions,
  intent,
  onGenerate,
  onIntentChange,
  onOpenArtists,
  onPlay,
  playback,
  pending,
  recommendationError,
}: CatchAVibePlayerProps) {
  const [open, setOpen] = useState(false);
  const hasLaneOptions = Boolean(artistOptions.length || genreOptions.length);

  const handleGenerate = () => {
    setOpen(false);
    void onGenerate();
  };

  return (
    <>
      <section className="space-y-5 px-1">
        <div className="space-y-1.5">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            Catch a vibe
          </h2>
          <p className="max-w-[28rem] text-[13px] leading-5 text-[var(--text-soft)]">
            Start the player with one lane, then let it hand you a song.
          </p>
        </div>

        {playback ? (
          <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,18,26,0.96),rgba(9,11,17,0.98))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:p-5">
            <div className="flex items-start gap-4">
              {playback.thumbnail ? (
                <div className="overflow-hidden rounded-[20px] border border-[var(--line)]">
                  <Image
                    alt={playback.title}
                    className="size-[72px] object-cover sm:size-[84px]"
                    height={84}
                    src={playback.thumbnail}
                    unoptimized
                    width={84}
                  />
                </div>
              ) : (
                <div className="surface-inline-card grid size-[72px] place-items-center rounded-[20px] text-[var(--text-soft)] sm:size-[84px]">
                  <Music4 className="size-6" />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Player live
                </p>
                <div className="space-y-1.5">
                  <p className="line-clamp-2 text-[20px] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--text)]">
                    {playback.title}
                  </p>
                  <p className="line-clamp-1 text-[14px] text-[var(--text-soft)]">
                    {playback.artist}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="button-primary inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium"
                onClick={onPlay}
                type="button"
              >
                <Image alt="Play" height={20} src={CONTINUE_LISTENING_PLAY_ICON_SRC} width={20} />
                Play
              </button>
              <button
                className="button-secondary min-h-11 rounded-full px-4 text-sm font-medium"
                onClick={() => setOpen(true)}
                type="button"
              >
                Change lane
              </button>
            </div>
          </div>
        ) : (
          <button
            className="w-full rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,18,26,0.96),rgba(9,11,17,0.98))] p-4 text-left shadow-[0_18px_44px_rgba(0,0,0,0.24)] transition hover:border-[var(--line-strong)] hover:bg-[linear-gradient(180deg,rgba(18,22,30,0.98),rgba(11,13,20,0.98))] sm:p-5"
            disabled={pending}
            onClick={() => {
              if (hasLaneOptions) {
                setOpen(true);
              } else {
                onOpenArtists?.();
              }
            }}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Empty player
                </p>
                <div className="space-y-1.5">
                  <p className="text-[20px] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--text)]">
                    {pending ? "Building your next pick" : "Tap to start a new drop"}
                  </p>
                  <p className="max-w-[28rem] text-[14px] leading-6 text-[var(--text-soft)]">
                    {pending
                      ? "Frequency is searching for the next song now."
                      : hasLaneOptions
                        ? "Choose Artist or Vibe, then let the player wake up."
                        : "Add a few artists first, then come back and catch a vibe."}
                  </p>
                </div>
              </div>

              <span className="surface-inline-card grid size-12 shrink-0 place-items-center rounded-[18px] text-[var(--text-soft)]">
                <Sparkles className="size-5" />
              </span>
            </div>

            <div className="mt-6 overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]">
              <div className="h-2 w-[38%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.16),rgba(255,255,255,0.52),rgba(255,255,255,0.16))]" />
            </div>

            {recommendationError ? (
              <p className="mt-3 text-[12px] leading-5 text-[#d7a0a0]">
                {recommendationError}
              </p>
            ) : null}
          </button>
        )}
      </section>

      {open ? (
        <CatchAVibeModal
          artistOptions={artistOptions}
          correlatedGenreOptions={correlatedGenreOptions}
          genreHelperCopy={genreHelperCopy}
          genreOptions={genreOptions}
          intent={intent}
          onClose={() => setOpen(false)}
          onConfirm={handleGenerate}
          onIntentChange={onIntentChange}
          pending={pending}
        />
      ) : null}
    </>
  );
}
