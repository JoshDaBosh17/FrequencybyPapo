"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/components/providers/auth-provider";
import {
  toGlobalPlayerTrack,
  useGlobalPlayer,
} from "@/components/providers/global-player-provider";
import { triggerUserEnrichment } from "@/lib/client/enrichment";
import { IS_CLIENT_TEST_MODE } from "@/lib/env/client";
import { CONTINUE_LISTENING_PLAY_ICON_SRC } from "@/lib/frequency/button-icons";
import { buildHomeGreeting } from "@/lib/frequency";
import {
  createGuidedRecommendationIntent,
  getCorrelatedGenreSeedOptions,
  getDefaultGuidedRecommendationIntent,
  getRecommendedArtistSeedOptions,
  getRecommendedGenreSeedOptions,
} from "@/lib/frequency/recommendation-intent";
import {
  getProfileTasteSummaryOverview,
  hasGeneratedTasteSummary,
} from "@/lib/frequency/taste-summary";
import { buildUserHelixTimelineEntries } from "@/lib/frequency/helix-timeline";
import { buildHelixTasteEntries } from "@/lib/frequency/taste-profile";
import { logRecommendationFlowEvent } from "@/lib/frequency/recommendation-flow-log";
import { logPlaybackEvent } from "@/lib/frequency/playback-source";
import { observeJoinedRooms } from "@/lib/firebase/firestore";
import type { FrequencyRoom, HomeSuggestion } from "@/lib/types";
import { useMountedRef } from "@/lib/use-mounted-ref";
import { EmptyStateCard } from "./empty-state-card";
import { CreateRoomDialog } from "./create-room-dialog";
import { FavoriteArtistsDialog } from "./favorite-artists-dialog";
import { GuidedSongControls } from "./guided-song-controls";
import { HelixTimelineModal } from "./helix-timeline-modal";
import { RoomCard } from "./room-card";
import { StatPill } from "./stat-pill";
import { TasteHelix } from "./taste-helix";

export function HomeScreen() {
  const { user, profile } = useAuth();
  const { currentTrack, setTrack } = useGlobalPlayer();
  const resolvedPlayback =
    currentTrack ??
    (profile?.homeSuggestion ? toGlobalPlayerTrack(profile.homeSuggestion, "recommendation") : null);
  const artistOptions = getRecommendedArtistSeedOptions(profile);
  const genreOptions = getRecommendedGenreSeedOptions(profile?.genreProfile ?? []);
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editArtistsOpen, setEditArtistsOpen] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [tasteTimelineOpen, setTasteTimelineOpen] = useState(false);
  const [guidedIntent, setGuidedIntent] = useState(() => getDefaultGuidedRecommendationIntent(profile));
  const mountedRef = useMountedRef();
  const tasteSummaryHydrationKeyRef = useRef<string | null>(null);
  const { correlatedGenres, helperCopy: genreHelperCopy } = getCorrelatedGenreSeedOptions(
    profile,
    guidedIntent.artistSeed,
    genreOptions,
  );
  const helixEntries = useMemo(
    () =>
      buildHelixTasteEntries({
        favoriteArtists: profile?.favoriteArtists ?? [],
        favoriteArtistEntries: profile?.favoriteArtistEntries ?? [],
        artistGenreProfiles: profile?.artistGenreProfiles ?? [],
      }),
    [profile?.artistGenreProfiles, profile?.favoriteArtistEntries, profile?.favoriteArtists],
  );
  const tasteTimelineEntries = useMemo(
    () =>
      buildUserHelixTimelineEntries({
        favoriteArtists: profile?.favoriteArtists ?? [],
        favoriteArtistEntries: profile?.favoriteArtistEntries ?? [],
        artistGenreProfiles: profile?.artistGenreProfiles ?? [],
      }),
    [profile?.artistGenreProfiles, profile?.favoriteArtistEntries, profile?.favoriteArtists],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

  useEffect(() => {
    setGuidedIntent(getDefaultGuidedRecommendationIntent(profile));
  }, [profile]);

  useEffect(() => {
    if (!user || !profile) {
      return;
    }

    if (hasGeneratedTasteSummary(profile.tasteSummary) || !profile.favoriteArtists.length) {
      return;
    }

    if (profile.enrichmentStatus !== "idle" && profile.enrichmentStatus !== "ready") {
      return;
    }

    const hydrationKey = `${user.uid}:${profile.favoriteArtistsSignature ?? profile.favoriteArtists.join("|")}`;

    if (tasteSummaryHydrationKeyRef.current === hydrationKey) {
      return;
    }

    // Older profiles can be missing a cached taste summary even when genre data is present.
    // Trigger one background enrichment pass per artist signature so the hero can self-heal.
    tasteSummaryHydrationKeyRef.current = hydrationKey;
    console.log("[frequency][taste-summary-flow]", {
      event: "home_taste_summary_hydration_triggered",
      uid: user.uid,
      hydrationKey,
      existingOverview: profile.tasteSummary?.overview ?? null,
    });
    void triggerUserEnrichment(user.uid).catch((error) => {
      if (tasteSummaryHydrationKeyRef.current === hydrationKey) {
        tasteSummaryHydrationKeyRef.current = null;
      }

      console.error("[frequency][taste-summary-flow]", {
        event: "home_taste_summary_hydration_failed",
        uid: user.uid,
        hydrationKey,
        error: error instanceof Error ? error.message : "Background taste summary hydration failed.",
      });
    });
  }, [
    profile,
    profile?.enrichmentStatus,
    profile?.favoriteArtists,
    profile?.favoriteArtistsSignature,
    profile?.tasteSummary?.overview,
    user,
  ]);

  useEffect(() => {
    if (profile?.recommendationEmptyStateReason !== "artists_updated" || resolvedPlayback) {
      return;
    }

    logRecommendationFlowEvent("recommendation_autoload_skipped_after_save_artists", {
      surface: "home",
      uid: profile.uid,
    });
  }, [profile?.recommendationEmptyStateReason, profile?.uid, resolvedPlayback]);

  const people = rooms.flatMap((room) =>
    room.memberIds.slice(0, 3).map((memberId, index) => ({
      id: `${room.id}-${memberId}`,
      name: memberId === profile?.uid ? profile?.displayName ?? "You" : `Member ${index + 1}`,
      initials: (memberId === profile?.uid ? profile?.displayName ?? "You" : `Member ${index + 1}`)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      color: ["#d29d7b", "#de8ea2", "#8bb9d8", "#8bb89e"][index % 4],
    })),
  );

  async function handleRetryEnrichment() {
    if (!user) {
      return;
    }

    setRetryPending(true);
    try {
      await triggerUserEnrichment(user.uid, { force: true });
    } finally {
      if (mountedRef.current) {
        setRetryPending(false);
      }
    }
  }

  async function handleResolveGuidedPick() {
    if (!user) {
      return;
    }

    if (profile?.recommendationEmptyStateReason === "artists_updated") {
      logRecommendationFlowEvent("guided_pick_confirmed_after_empty_state", {
        surface: "home",
        uid: user.uid,
        intentKey: guidedIntent.intentKey,
      });
    }

    setRetryPending(true);
    try {
      const response = (await triggerUserEnrichment(user.uid, {
        resolveRecommendation: true,
        recommendationIntent: guidedIntent,
      })) as {
        result?: {
          homeSuggestion?: HomeSuggestion | null;
        };
      };

      if (response.result?.homeSuggestion) {
        setTrack(toGlobalPlayerTrack(response.result.homeSuggestion, "home"), {
          autoplay: true,
          minimized: true,
        });
      }
    } finally {
      if (mountedRef.current) {
        setRetryPending(false);
      }
    }
  }

  async function handleResetRecommendation() {
    if (!user) {
      return;
    }

    setRetryPending(true);
    try {
      await triggerUserEnrichment(user.uid, { resetUserCache: true });
    } finally {
      if (mountedRef.current) {
        setRetryPending(false);
      }
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="section-haze-strong overflow-hidden rounded-[32px] p-5 sm:p-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--text)]">
              {buildHomeGreeting(profile)}
            </p>
          </div>

          <div className="grid gap-5 xl:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="min-w-0">
              {profile?.enrichmentStatus === "ready" && profile.genreProfile.length ? (
                <TasteHelix
                  className="xl:pr-4"
                  helixTags={helixEntries.map((entry, index) => ({
                    artists: entry.artists.map((artist) => artist.name),
                    label: entry.genre,
                    side: index % 2 === 0 ? "left" : "right",
                    weight: (entry.weight ?? 1) * 28,
                  }))}
                  labelText="Your frequency"
                  onExpand={
                    tasteTimelineEntries.length ? () => setTasteTimelineOpen(true) : undefined
                  }
                  overviewText={getProfileTasteSummaryOverview(profile)}
                  surface="bare"
                />
              ) : profile?.enrichmentStatus === "loading" ? (
                <div className="space-y-3 xl:pr-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                    Your frequency
                  </p>
                  <p className="max-w-[24rem] text-[18px] font-semibold text-[var(--text)]">
                    Building your frequency
                  </p>
                  <p className="max-w-[28rem] text-[14px] leading-6 text-[var(--text-soft)]">
                    We&apos;re turning your favorite artists into a stored taste profile for Home and Compare.
                  </p>
                </div>
              ) : profile?.enrichmentStatus === "error" ? (
                <div className="space-y-3 xl:pr-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                    Your frequency
                  </p>
                  <p className="max-w-[24rem] text-[18px] font-semibold text-[var(--text)]">
                    Taste enrichment needs another try
                  </p>
                  <p className="max-w-[28rem] text-[14px] leading-6 text-[var(--text-soft)]">
                    {profile.enrichmentError ?? "We couldn't build your genre profile yet."}
                  </p>
                  <button
                    className="button-primary mt-2 min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-70"
                    disabled={retryPending}
                    onClick={() => void handleRetryEnrichment()}
                    type="button"
                  >
                    {retryPending ? "Retrying" : "Retry enrichment"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 xl:pr-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                    Your frequency
                  </p>
                  <p className="max-w-[24rem] text-[18px] font-semibold text-[var(--text)]">
                    Add favorite artists to shape your frequency
                  </p>
                  <p className="max-w-[28rem] text-[14px] leading-6 text-[var(--text-soft)]">
                    Last.fm will turn them into a real genre profile once they&apos;re saved.
                  </p>
                </div>
              )}
            </div>

            <div className="section-haze rounded-[28px] p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                Catch a vibe
              </p>
              <div className="mt-3">
                <GuidedSongControls
                  artistOptions={artistOptions}
                  buttonLabel="Generate Pick"
                  correlatedGenreOptions={correlatedGenres}
                  genreOptions={genreOptions}
                  genreHelperCopy={genreHelperCopy}
                  intent={guidedIntent}
                  onConfirm={() => void handleResolveGuidedPick()}
                  onIntentChange={(nextIntent) =>
                    setGuidedIntent(createGuidedRecommendationIntent(nextIntent))
                  }
                  pending={retryPending}
                />
              </div>
              {resolvedPlayback ? (
                <>
                  {resolvedPlayback.thumbnail ? (
                    <div className="mt-3 overflow-hidden rounded-[20px] border border-[var(--line)]">
                      <Image
                        alt={resolvedPlayback.title}
                        className="h-36 w-full object-cover"
                        height={144}
                        src={resolvedPlayback.thumbnail}
                        unoptimized
                        width={320}
                      />
                    </div>
                  ) : null}
                  <p className="mt-3 text-[18px] font-semibold text-[var(--text)]">
                    {resolvedPlayback.title}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-[var(--text-soft)]">
                    {resolvedPlayback.artist}
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                    Suggested from trusted artist uploads.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      aria-label="Play suggestion"
                      className="inline-flex min-h-14 min-w-14 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-inline-strong)] px-4 text-[var(--text)] shadow-[0_14px_30px_rgba(0,0,0,0.24)] transition hover:border-[var(--line-strong)] hover:bg-[rgba(40,47,63,0.96)] sm:min-h-12 sm:min-w-12"
                      onClick={() => {
                        if (currentTrack) {
                          setTrack(currentTrack, {
                            autoplay: true,
                            minimized: true,
                          });
                        } else if (profile?.homeSuggestion) {
                          setTrack(toGlobalPlayerTrack(profile.homeSuggestion, "home"), {
                            autoplay: true,
                            minimized: true,
                          });
                        }
                        logPlaybackEvent("play_reused_cached_source", {
                          source: "home_continue_listening",
                          artist: resolvedPlayback.artist,
                          title: resolvedPlayback.title,
                          videoId: resolvedPlayback.videoId,
                        });
                      }}
                      type="button"
                    >
                      <Image
                        alt="Play"
                        height={24}
                        src={CONTINUE_LISTENING_PLAY_ICON_SRC}
                        width={24}
                      />
                    </button>
                    <StatPill>
                      {resolvedPlayback.channelRole === "topic"
                        ? "Topic channel"
                        : "Trusted channel"}
                    </StatPill>
                    {IS_CLIENT_TEST_MODE ? (
                      <button
                        className="button-secondary min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-70"
                        disabled={retryPending}
                        onClick={() => void handleResolveGuidedPick()}
                        type="button"
                      >
                        {retryPending ? "Generating" : "Generate test recommendation"}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : profile?.recommendationStatus === "loading" ? (
                <>
                  <p className="mt-3 text-[18px] font-semibold text-[var(--text)]">
                    Finding your next song
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                    We&apos;re checking trusted artist uploads and caching a clean song recommendation for you.
                  </p>
                </>
              ) : profile?.recommendationStatus === "error" ? (
                <>
                  <p className="mt-3 text-[18px] font-semibold text-[var(--text)]">
                    Recommendation needs another try
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                    {profile.recommendationError ?? "We couldn't find a trusted playable song yet."}
                  </p>
                  <button
                    className="button-primary mt-4 min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-70"
                    disabled={retryPending}
                    onClick={() => void handleResolveGuidedPick()}
                    type="button"
                  >
                    {retryPending
                      ? "Generating"
                      : IS_CLIENT_TEST_MODE
                        ? "Generate test recommendation"
                        : "Retry recommendation"}
                  </button>
                  {IS_CLIENT_TEST_MODE ? (
                    <button
                      className="button-secondary mt-3 min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-70"
                      disabled={retryPending}
                      onClick={() => void handleResetRecommendation()}
                      type="button"
                    >
                      Reset test cache
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-3 text-[18px] font-semibold text-[var(--text)]">
                    {profile?.recommendationEmptyStateReason === "artists_updated"
                      ? "Your artists are updated."
                      : "No suggestion yet"}
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                    {profile?.recommendationEmptyStateReason === "artists_updated"
                      ? "Choose an artist, genre, and mode to guide the next pick."
                      : "Add favorite artists and we&apos;ll store a trusted channel song pick here."}
                  </p>
                  <button
                    className="button-primary mt-4 min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-70"
                    disabled={retryPending}
                    onClick={() => void handleResolveGuidedPick()}
                    type="button"
                  >
                    {retryPending
                      ? "Generating"
                      : IS_CLIENT_TEST_MODE
                        ? "Generate test recommendation"
                        : profile?.recommendationEmptyStateReason === "artists_updated"
                          ? "Generate Pick"
                          : "Generate Pick"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {!rooms.length ? (
        <EmptyStateCard
          body="Create a room for friends, an event, or a shared vibe. The shell is live even before recommendations show up."
          eyebrow="Home"
          onPrimaryAction={() => setCreateOpen(true)}
          primaryAction="Create your first room"
          onSecondaryAction={() => setEditArtistsOpen(true)}
          secondaryAction="Add favorite artists"
          secondaryActionEmphasis="solid"
          title="Your music world starts here."
          visual="music"
        />
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Your rooms
            </h2>
            <button
              className="button-secondary min-h-11 rounded-full px-4 text-sm font-medium"
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              Create room
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {rooms.slice(0, 4).map((room) => (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <RoomCard
                  compact={false}
                  people={people}
                  room={{
                    id: room.id,
                    name: room.name,
                    icon: room.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase(),
                    description: room.description,
                    memberIds: room.memberIds,
                    memberCountLabel: `${room.memberIds.length} members`,
                    descriptor: room.activitySummary,
                    accent: "#d29d7b",
                    overviewStats: [],
                    pulseMetrics: [],
                    trends: [],
                    topSongs: [],
                    comparison: [],
                    recap: "",
                    distribution: [],
                  }}
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
      {user && profile ? (
        <FavoriteArtistsDialog
          initialArtists={profile.favoriteArtists}
          onboardingComplete={profile.onboardingComplete}
          onClose={() => setEditArtistsOpen(false)}
          open={editArtistsOpen}
          uid={user.uid}
        />
      ) : null}
      {profile ? (
        <HelixTimelineModal
          description="Most recent taste stays at the top. Scroll downward through the artists and genres that built it."
          entries={tasteTimelineEntries}
          eyebrow="Your frequency"
          onClose={() => setTasteTimelineOpen(false)}
          open={tasteTimelineOpen}
          title={getProfileTasteSummaryOverview(profile)}
        />
      ) : null}
    </div>
  );
}
