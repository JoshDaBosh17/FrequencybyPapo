export function logArtistCorrectionEvent(
  event:
    | "artist_correction_lookup_started"
    | "artist_correction_lookup_result"
    | "artist_correction_modal_shown"
    | "artist_correction_confirmed"
    | "artist_correction_rejected"
    | "artist_correction_saved_canonical"
    | "artist_submit_started"
    | "artist_submit_blocked_pending_confirmation"
    | "artist_submit_exact_match_accepted"
    | "artist_submit_correction_modal_shown"
    | "artist_submit_correction_confirmed"
    | "artist_submit_rejected_no_match"
    | "artist_submit_blocked_local_optimistic_add"
    | "artist_submit_local_ui_added"
    | "artist_submit_firebase_write_started"
    | "artist_submit_firebase_write_completed",
  payload?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][artist-correction]", {
    event,
    ...payload,
  });
}
