import type { RecommendationIntentInput } from "@/lib/frequency/recommendation-intent";

type TriggerOptions = {
  force?: boolean;
  resolveRecommendation?: boolean;
  recommendationIntent?: RecommendationIntentInput;
  resetUserCache?: boolean;
  resetArtistCache?: string;
};

export async function triggerUserEnrichment(uid: string, options?: TriggerOptions) {
  let response: Response;

  console.log("[frequency][taste-summary-flow]", {
    event: "client_enrichment_triggered",
    uid,
    force: options?.force ?? false,
    resolveRecommendation: options?.resolveRecommendation ?? false,
    hasRecommendationIntent: Boolean(options?.recommendationIntent),
    resetUserCache: options?.resetUserCache ?? false,
    resetArtistCache: options?.resetArtistCache ?? null,
  });

  try {
    response = await fetch("/api/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        force: options?.force ?? false,
        resolveRecommendation: options?.resolveRecommendation ?? false,
        recommendationIntent: options?.recommendationIntent,
        resetUserCache: options?.resetUserCache ?? false,
        resetArtistCache: options?.resetArtistCache,
      }),
    });
  } catch (error) {
    console.error("[frequency][taste-summary-flow]", {
      event: "client_enrichment_network_failed",
      uid,
      error: error instanceof Error ? error.message : "Could not reach the enrichment service.",
    });
    throw new Error("Could not reach the enrichment service.");
  }

  if (!response.ok) {
    let message = "Enrichment request failed";

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Ignore JSON parsing failures and keep the fallback message.
    }

    console.error("[frequency][taste-summary-flow]", {
      event: "client_enrichment_failed",
      uid,
      status: response.status,
      error: message,
    });
    throw new Error(message);
  }

  console.log("[frequency][taste-summary-flow]", {
    event: "client_enrichment_completed",
    uid,
    status: response.status,
  });

  return response.json();
}
