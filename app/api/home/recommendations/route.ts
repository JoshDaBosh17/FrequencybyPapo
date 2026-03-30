import { NextResponse } from "next/server";

import type { HomeRecommendationRequest } from "@/lib/frequency/home-recommendations";
import { getHomeRecommendations } from "@/lib/server/home-recommendations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HomeRecommendationRequest;

    console.log("[frequency][home-recommendations]", {
      event: "home_recommendations_requested",
      favoriteArtists: body.favoriteArtists?.length ?? 0,
      recentArtists: body.recentArtists?.length ?? 0,
      recentGenres: body.recentGenres?.length ?? 0,
      limit: body.limit ?? 4,
      refreshToken: body.refreshToken ?? null,
    });

    const recommendations = await getHomeRecommendations(body);

    console.log("[frequency][home-recommendations]", {
      event: "home_recommendations_completed",
      count: recommendations.length,
      titles: recommendations.map((item) => `${item.artist} - ${item.title}`),
    });

    return NextResponse.json({
      ok: true,
      recommendations,
    });
  } catch (error) {
    console.error("[frequency][home-recommendations]", {
      event: "home_recommendations_failed",
      error:
        error instanceof Error
          ? error.message
          : "Home recommendation request failed.",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Home recommendation request failed.",
      },
      { status: 500 },
    );
  }
}
