export function logRecommendationFlowEvent(
  event:
    | "save_artists_completed_entered_empty_state"
    | "recommendation_autoload_skipped_after_save_artists"
    | "guided_pick_confirmed_after_empty_state",
  payload?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][recommendation-flow]", {
    event,
    ...payload,
  });
}
