"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { completeOnboarding } from "@/lib/firebase/firestore";
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
              className="inline-flex min-h-13 items-center justify-center rounded-full bg-[var(--text)] px-6 text-[15px] font-medium text-white"
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

  function addArtist() {
    const nextArtist = artistInput.trim();
    if (!nextArtist || favoriteArtists.includes(nextArtist)) {
      return;
    }

    setFavoriteArtists((current) => [...current, nextArtist]);
    setArtistInput("");
  }

  async function finishOnboarding() {
    if (!user) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await completeOnboarding(user.uid, favoriteArtists);
      router.push("/home");
    } catch {
      setError("We could not finish setup. Please try again.");
    } finally {
      setPending(false);
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
            <div className="h-2 rounded-full bg-[rgba(81,68,56,0.08)]">
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
                  className="min-h-12 flex-1 rounded-full border border-[var(--line)] bg-white/82 px-4 text-[15px] outline-none"
                  onChange={(event) => setArtistInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addArtist();
                    }
                  }}
                  placeholder="Add an artist you love"
                  value={artistInput}
                />
                <button
                  className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white"
                  onClick={addArtist}
                  type="button"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {favoriteArtists.length ? (
                  favoriteArtists.map((artist) => (
                    <button
                      key={artist}
                      className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-[14px] text-[var(--text-soft)]"
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
                className="min-h-12 rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]"
                onClick={() => setStep((current) => current - 1)}
                type="button"
              >
                Back
              </button>
            ) : null}

            {step < steps.length - 1 ? (
              <button
                className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white"
                onClick={() => setStep((current) => current + 1)}
                type="button"
              >
                Continue
              </button>
            ) : (
              <button
                className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white disabled:opacity-70"
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
    </main>
  );
}
