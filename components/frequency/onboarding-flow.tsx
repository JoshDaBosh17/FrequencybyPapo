"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { triggerUserEnrichment } from "@/lib/client/enrichment";
import { useAuth } from "@/components/providers/auth-provider";
import { IS_CLIENT_TEST_MODE } from "@/lib/env/client";
import { resolveArtistEntry } from "@/lib/frequency/artist-entry";
import { logArtistCorrectionEvent } from "@/lib/frequency/artist-correction-log";
import { completeOnboarding } from "@/lib/firebase/firestore";
import { useMountedRef } from "@/lib/use-mounted-ref";
import { ArtistCorrectionModal } from "./artist-correction-modal";
import { GlassCard } from "./glass-card";
import { StatPill } from "./stat-pill";

const steps = ["Welcome", "Artists", "Finish"] as const;

export function OnboardingFlow() {
  const router = useRouter();
  const { signIn, user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [artistInput, setArtistInput] = useState("");
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>(
    profile?.favoriteArtists ?? [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [correction, setCorrection] = useState<{
    open: boolean;
    originalArtist: string;
    canonicalArtist: string;
  } | null>(null);
  const mountedRef = useMountedRef();

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6">
        <GlassCard strong className="w-full rounded-[36px] p-6 sm:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                Welcome to Frequency
              </p>
              <h1 className="text-[36px] font-semibold tracking-[-0.06em] text-[var(--text)]">
                Sign in to start onboarding
              </h1>
              <p className="max-w-2xl text-[17px] leading-8 text-[var(--text-soft)]">
                We ask for Google sign-in first so your favorite artists and onboarding state can be saved to your account from the beginning.
              </p>
            </div>
            <button
              className="button-primary inline-flex min-h-13 items-center justify-center rounded-full px-6 text-[15px] font-medium"
              onClick={() => void signIn()}
              type="button"
            >
              Continue with Google
            </button>
          </div>
        </GlassCard>
      </main>
    );
  }

  async function addArtist() {
    await resolveArtistEntry({
      value: artistInput,
      existingArtists: favoriteArtists,
      onAddArtist: (artist) => {
        if (!mountedRef.current) {
          return;
        }
        setFavoriteArtists((current) => [artist, ...current]);
      },
      onSetInput: (value) => {
        if (!mountedRef.current) {
          return;
        }
        setArtistInput(value);
      },
      onSetCorrection: (value) => {
        if (!mountedRef.current) {
          return;
        }
        setCorrection(value);
      },
      onSetValidationError: (value) => {
        if (!mountedRef.current) {
          return;
        }
        setInputError(value);
      },
    });
  }

  async function finishOnboarding() {
    if (!user) {
      return;
    }

    setPending(true);
    setError(null);
    logArtistCorrectionEvent("artist_submit_firebase_write_started", {
      uid: user.uid,
      artistCount: favoriteArtists.length,
      source: "onboarding_finish",
    });

    try {
      await completeOnboarding(user.uid, favoriteArtists);
      logArtistCorrectionEvent("artist_submit_firebase_write_completed", {
        uid: user.uid,
        artistCount: favoriteArtists.length,
        source: "onboarding_finish",
      });
      if (favoriteArtists.length && !IS_CLIENT_TEST_MODE) {
        void triggerUserEnrichment(user.uid).catch(() => {
          // Background genre enrichment is non-blocking for onboarding completion.
        });
      }
      if (mountedRef.current) {
        router.push("/home");
      }
    } catch {
      if (mountedRef.current) {
        setError("We could not finish setup. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setPending(false);
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6">
      <GlassCard strong className="w-full rounded-[36px] p-6 sm:p-8">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                Welcome to Frequency
              </p>
              <StatPill>
                Step {step + 1} of {steps.length}
              </StatPill>
            </div>
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--genre-amber),var(--genre-sky))]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {step === 0 ? (
            <section className="space-y-4">
              <h1 className="text-[36px] font-semibold tracking-[-0.06em] text-[var(--text)]">
                Welcome to Frequency
              </h1>
              <p className="max-w-2xl text-[17px] leading-8 text-[var(--text-soft)]">
                Frequency turns music into a social object. Build rooms, bring people in, and let shared taste shape the room together.
              </p>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-[32px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                  Start with a few favorite artists
                </h2>
                <p className="text-[16px] leading-7 text-[var(--text-soft)]">
                  You can skip this, but three artists is enough to make the app feel more like you.
                </p>
              </div>

              <div className="flex gap-3">
                <input
                  className="field-surface min-h-12 flex-1 rounded-full px-4 text-[15px]"
                  onChange={(event) => {
                    setArtistInput(event.target.value);
                    setInputError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addArtist();
                    }
                  }}
                  placeholder="Add an artist you love"
                  value={artistInput}
                />
                <button
                  className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium"
                  onClick={() => void addArtist()}
                  type="button"
                >
                  Add
                </button>
              </div>

              {inputError ? <p className="text-[13px] text-[#aa5c5c]">{inputError}</p> : null}

              <div className="flex flex-wrap gap-3">
                {favoriteArtists.length ? (
                  favoriteArtists.map((artist) => (
                    <button
                      key={artist}
                      className="surface-pill rounded-full px-4 py-2 text-[14px] text-[var(--text-soft)]"
                      onClick={() =>
                        setFavoriteArtists((current) => current.filter((entry) => entry !== artist))
                      }
                      type="button"
                    >
                      {artist} ×
                    </button>
                  ))
                ) : (
                  <p className="text-[14px] text-[var(--text-faint)]">
                    Nothing added yet. You can still continue.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <h2 className="text-[32px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                You&apos;re ready.
              </h2>
              <p className="max-w-2xl text-[16px] leading-7 text-[var(--text-soft)]">
                We&apos;ll save your taste, mark onboarding complete, and drop you into your Frequency home. Room creation now lives after onboarding so the first-run flow stays lighter.
              </p>
              <div className="flex flex-wrap gap-3">
                <StatPill>{favoriteArtists.length || 0} artists added</StatPill>
                <StatPill>Room creation comes next</StatPill>
              </div>
            </section>
          ) : null}

          {error ? <p className="text-[13px] text-[#aa5c5c]">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            {step > 0 ? (
              <button
                className="button-secondary min-h-12 rounded-full px-5 text-[15px] font-medium"
                onClick={() => setStep((current) => current - 1)}
                type="button"
              >
                Back
              </button>
            ) : null}

            {step < steps.length - 1 ? (
              <button
                className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium"
                onClick={() => setStep((current) => current + 1)}
                type="button"
              >
                Continue
              </button>
            ) : (
              <button
                className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium disabled:opacity-70"
                disabled={pending}
                onClick={() => void finishOnboarding()}
                type="button"
              >
                {pending ? "Finishing setup" : "Finish"}
              </button>
            )}
          </div>
        </div>
      </GlassCard>
      <ArtistCorrectionModal
        canonicalArtist={correction?.canonicalArtist ?? ""}
        onConfirm={() => {
          if (!correction) {
            return;
          }

          setFavoriteArtists((current) => [...current, correction.canonicalArtist]);
          setArtistInput("");
          setInputError(null);
          logArtistCorrectionEvent("artist_correction_confirmed", {
            originalArtist: correction.originalArtist,
            canonicalArtist: correction.canonicalArtist,
          });
          logArtistCorrectionEvent("artist_submit_correction_confirmed", {
            originalArtist: correction.originalArtist,
            canonicalArtist: correction.canonicalArtist,
          });
          logArtistCorrectionEvent("artist_correction_saved_canonical", {
            originalArtist: correction.originalArtist,
            canonicalArtist: correction.canonicalArtist,
          });
          logArtistCorrectionEvent("artist_submit_local_ui_added", {
            artist: correction.originalArtist,
            canonicalArtist: correction.canonicalArtist,
            reason: "confirmed_correction",
          });
          setCorrection(null);
        }}
        onReject={() => {
          if (!correction) {
            return;
          }

          setArtistInput(correction.originalArtist);
          setInputError(null);
          logArtistCorrectionEvent("artist_correction_rejected", {
            originalArtist: correction.originalArtist,
            canonicalArtist: correction.canonicalArtist,
          });
          setCorrection(null);
        }}
        open={Boolean(correction?.open)}
        pending={pending}
        originalArtist={correction?.originalArtist ?? ""}
      />
    </main>
  );
}
