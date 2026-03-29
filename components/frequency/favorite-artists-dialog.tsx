"use client";

import { useEffect, useState } from "react";

import { triggerUserEnrichment } from "@/lib/client/enrichment";
import { IS_CLIENT_TEST_MODE } from "@/lib/env/client";
import { resolveArtistEntry } from "@/lib/frequency/artist-entry";
import { logArtistCorrectionEvent } from "@/lib/frequency/artist-correction-log";
import { logRecommendationFlowEvent } from "@/lib/frequency/recommendation-flow-log";
import { saveFavoriteArtists } from "@/lib/firebase/firestore";
import { useMountedRef } from "@/lib/use-mounted-ref";
import { ArtistCorrectionModal } from "./artist-correction-modal";
import { GlassCard } from "./glass-card";

export function FavoriteArtistsDialog({
  uid,
  initialArtists,
  open,
  onClose,
  onboardingComplete,
}: {
  uid: string;
  initialArtists: string[];
  open: boolean;
  onClose: () => void;
  onboardingComplete: boolean;
}) {
  const [artists, setArtists] = useState(initialArtists);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [correction, setCorrection] = useState<{
    open: boolean;
    originalArtist: string;
    canonicalArtist: string;
  } | null>(null);
  const mountedRef = useMountedRef();

  useEffect(() => {
    if (open) {
      setArtists(initialArtists);
      setInput("");
      setError(null);
      setInputError(null);
      setCorrection(null);
    }
  }, [initialArtists, open]);

  if (!open) {
    return null;
  }

  async function addArtist() {
    await resolveArtistEntry({
      value: input,
      existingArtists: artists,
      onAddArtist: (artist) => {
        if (!mountedRef.current) {
          return;
        }
        setArtists((current) => [artist, ...current]);
      },
      onSetInput: (value) => {
        if (!mountedRef.current) {
          return;
        }
        setInput(value);
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

  async function handleSave() {
    setPending(true);
    setError(null);
    logArtistCorrectionEvent("artist_submit_firebase_write_started", {
      uid,
      artistCount: artists.length,
      source: "favorite_artists_dialog",
    });

    try {
      await saveFavoriteArtists(uid, artists, { onboardingComplete });
      console.log("[frequency][taste-summary-flow]", {
        event: "favorite_artists_saved",
        uid,
        artistCount: artists.length,
        artists,
      });
      logArtistCorrectionEvent("artist_submit_firebase_write_completed", {
        uid,
        artistCount: artists.length,
        source: "favorite_artists_dialog",
      });
      logRecommendationFlowEvent("save_artists_completed_entered_empty_state", {
        uid,
        artistCount: artists.length,
      });
      if (artists.length && !IS_CLIENT_TEST_MODE) {
        logRecommendationFlowEvent("recommendation_autoload_skipped_after_save_artists", {
          uid,
          trigger: "save_artists_background_enrichment",
        });
        console.log("[frequency][taste-summary-flow]", {
          event: "favorite_artists_enrichment_triggered",
          uid,
          artistCount: artists.length,
        });
        void triggerUserEnrichment(uid).catch((backgroundError) => {
          console.error("[frequency][taste-summary-flow]", {
            event: "favorite_artists_enrichment_failed",
            uid,
            error:
              backgroundError instanceof Error
                ? backgroundError.message
                : "Background genre enrichment failed.",
          });
        });
      }
      if (mountedRef.current) {
        onClose();
      }
    } catch {
      if (mountedRef.current) {
        setError("We could not save your artists. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setPending(false);
      }
    }
  }

  return (
    <div className="modal-scrim fixed inset-0 z-40 flex items-center justify-center px-4 py-8 backdrop-blur-sm">
      <GlassCard strong className="w-full max-w-xl rounded-[32px] p-6 sm:p-7">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Favorite artists
            </p>
            <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[var(--text)]">
              Shape your taste profile
            </h2>
            <p className="text-[15px] leading-6 text-[var(--text-soft)]">
              Add a few artists you actually return to. We&apos;ll use them to build your taste helix, then you can guide the next song when you&apos;re ready.
            </p>
          </div>

          <div className="flex gap-3">
            <input
              className="field-surface min-h-12 flex-1 rounded-full px-4 text-[15px]"
              onChange={(event) => setInput(event.target.value)}
              onChangeCapture={() => setInputError(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addArtist();
                }
              }}
              placeholder="Add an artist"
              value={input}
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
            {artists.length ? (
              artists.map((artist) => (
                <button
                  key={artist}
                  className="surface-pill rounded-full px-4 py-2 text-[14px] text-[var(--text-soft)]"
                  onClick={() => setArtists((current) => current.filter((entry) => entry !== artist))}
                  type="button"
                >
                  {artist} x
                </button>
              ))
            ) : (
              <p className="text-[14px] text-[var(--text-faint)]">Start with three favorites if you can.</p>
            )}
          </div>

          {error ? <p className="text-[13px] text-[#aa5c5c]">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium disabled:opacity-70"
              disabled={pending}
              onClick={() => void handleSave()}
              type="button"
            >
              {pending ? "Saving artists" : "Save artists"}
            </button>
            <button
              className="button-secondary min-h-12 rounded-full px-5 text-[15px] font-medium"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </GlassCard>
      <ArtistCorrectionModal
        canonicalArtist={correction?.canonicalArtist ?? ""}
        onConfirm={() => {
          if (!correction) {
            return;
          }

          setArtists((current) => [correction.canonicalArtist, ...current]);
          setInput("");
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

          setInput(correction.originalArtist);
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
    </div>
  );
}
