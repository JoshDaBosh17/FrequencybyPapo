import { NextResponse } from "next/server";

import type { RecommendationIntentInput } from "@/lib/frequency/recommendation-intent";
import { adminDb } from "@/lib/server/firebase-admin";
import { setAdminDocument } from "@/lib/server/firestore-write";
import { enrichUserTaste, resetRecommendationCaches } from "@/lib/server/enrichment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let uid: string | undefined;

  try {
    const body = (await request.json()) as {
      uid?: string;
      force?: boolean;
      resolveRecommendation?: boolean;
      recommendationIntent?: RecommendationIntentInput;
      resetUserCache?: boolean;
      resetArtistCache?: string;
    };
    uid = body.uid;

    console.log("[frequency][taste-summary-flow]", {
      event: "api_enrich_received",
      uid: uid ?? null,
      force: body.force ?? false,
      resolveRecommendation: body.resolveRecommendation ?? false,
      hasRecommendationIntent: Boolean(body.recommendationIntent),
      resetUserCache: body.resetUserCache ?? false,
      resetArtistCache: body.resetArtistCache ?? null,
    });

    if (body.resetUserCache || body.resetArtistCache) {
      const reset = await resetRecommendationCaches({
        uid: body.resetUserCache ? uid : undefined,
        artistName: body.resetArtistCache,
      });
      console.log("[frequency][taste-summary-flow]", {
        event: "api_enrich_reset_completed",
        uid: uid ?? null,
        reset,
      });
      return NextResponse.json({ ok: true, reset });
    }

    if (!uid) {
      console.error("[frequency][taste-summary-flow]", {
        event: "api_enrich_missing_uid",
      });
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const result = await enrichUserTaste(uid, {
      forceRecommendation: body.force,
      resolveRecommendation: body.resolveRecommendation,
      recommendationIntent: body.recommendationIntent,
    });
    const tasteSummaryOverview = result?.tasteSummary?.overview ?? null;
    console.log("[frequency][taste-summary-flow]", {
      event: "api_enrich_completed",
      uid,
      hasTasteSummary: Boolean(tasteSummaryOverview),
      tasteSummaryOverview,
      hasHomeSuggestion: Boolean(result?.homeSuggestion),
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[frequency][taste-summary-flow]", {
      event: "api_enrich_failed",
      uid: uid ?? null,
      error: error instanceof Error ? error.message : "Taste enrichment failed.",
    });

    if (uid) {
      await setAdminDocument(
        adminDb.collection("users").doc(uid),
        {
          enrichmentStatus: "error",
          enrichmentError: error instanceof Error ? error.message : "Taste enrichment failed.",
          recommendationStatus: "error",
          recommendationError:
            error instanceof Error ? error.message : "Song recommendation failed.",
        },
        { merge: true },
        {
          triggerReason: "api_enrich_error",
          userId: uid,
        },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Taste enrichment failed." },
      { status: 500 },
    );
  }
}
