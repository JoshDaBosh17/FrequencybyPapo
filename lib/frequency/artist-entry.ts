import { resolveArtistName, type ArtistResolutionResult } from "@/lib/client/artists";
import { logArtistCorrectionEvent } from "@/lib/frequency/artist-correction-log";

type ArtistCorrectionState = {
  open: boolean;
  originalArtist: string;
  canonicalArtist: string;
};

export async function resolveArtistEntry(params: {
  value: string;
  existingArtists: string[];
  onAddArtist: (artist: string) => void;
  onSetInput: (value: string) => void;
  onSetCorrection: (state: ArtistCorrectionState | null) => void;
  onSetValidationError: (value: string | null) => void;
}) {
  const nextArtist = params.value.trim();
  if (!nextArtist || params.existingArtists.includes(nextArtist)) {
    logArtistCorrectionEvent("artist_submit_blocked_local_optimistic_add", {
      artist: nextArtist,
      reason: !nextArtist ? "empty" : "duplicate",
    });
    return;
  }

  params.onSetValidationError(null);
  logArtistCorrectionEvent("artist_submit_started", {
    artist: nextArtist,
  });
  logArtistCorrectionEvent("artist_correction_lookup_started", {
    artist: nextArtist,
  });

  const resolution: ArtistResolutionResult = await resolveArtistName(nextArtist);
  logArtistCorrectionEvent("artist_correction_lookup_result", {
    artist: nextArtist,
    canonicalArtist: resolution.canonicalName,
    confidence: resolution.confidence,
    exactMatch: resolution.exactMatch,
    matched: resolution.matched,
    shouldConfirm: resolution.shouldConfirm,
  });
  if (resolution.shouldConfirm) {
    params.onSetCorrection({
      open: true,
      originalArtist: nextArtist,
      canonicalArtist: resolution.canonicalName,
    });
    logArtistCorrectionEvent("artist_correction_modal_shown", {
      originalArtist: nextArtist,
      canonicalArtist: resolution.canonicalName,
      confidence: resolution.confidence,
    });
    logArtistCorrectionEvent("artist_submit_correction_modal_shown", {
      originalArtist: nextArtist,
      canonicalArtist: resolution.canonicalName,
      confidence: resolution.confidence,
    });
    logArtistCorrectionEvent("artist_submit_blocked_local_optimistic_add", {
      artist: nextArtist,
      reason: "awaiting_correction_confirmation",
    });
    logArtistCorrectionEvent("artist_submit_blocked_pending_confirmation", {
      artist: nextArtist,
      canonicalArtist: resolution.canonicalName,
      confidence: resolution.confidence,
    });
    return;
  }

  if (!resolution.exactMatch || !resolution.matched) {
    params.onSetValidationError("We couldn't find that artist. Try a different spelling.");
    logArtistCorrectionEvent("artist_submit_rejected_no_match", {
      artist: nextArtist,
      canonicalArtist: resolution.canonicalName,
      confidence: resolution.confidence,
      matched: resolution.matched,
    });
    logArtistCorrectionEvent("artist_submit_blocked_local_optimistic_add", {
      artist: nextArtist,
      reason: "low_confidence_or_no_match",
    });
    return;
  }

  params.onAddArtist(resolution.canonicalName);
  params.onSetInput("");
  logArtistCorrectionEvent("artist_submit_local_ui_added", {
    artist: nextArtist,
    canonicalArtist: resolution.canonicalName,
    reason: "exact_match",
  });
  logArtistCorrectionEvent("artist_submit_exact_match_accepted", {
    artist: nextArtist,
    canonicalArtist: resolution.canonicalName,
    confidence: resolution.confidence,
  });
}
