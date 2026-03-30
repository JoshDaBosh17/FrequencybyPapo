"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import {
  toGlobalPlayerTrack,
  useGlobalPlayer,
} from "@/components/providers/global-player-provider";
import { triggerUserEnrichment } from "@/lib/client/enrichment";
import { buildHomeGreeting } from "@/lib/frequency";
import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import {
  createGuidedRecommendationIntent,
  getCorrelatedGenreSeedOptions,
  getDefaultGuidedRecommendationIntent,
  getRecommendedArtistSeedOptions,
  getRecommendedGenreSeedOptions,
} from "@/lib/frequency/recommendation-intent";
import {
  buildSongActivityItems,
} from "@/lib/frequency/song-activity";
import { hasGeneratedTasteSummary } from "@/lib/frequency/taste-summary";
import { logRecommendationFlowEvent } from "@/lib/frequency/recommendation-flow-log";
import { logPlaybackEvent } from "@/lib/frequency/playback-source";
import {
  addRoomShareItem,
  observeJoinedRooms,
  observeRoomShareItemsByRoomIds,
  observeUserProfilesByIds,
  toggleRoomShareReaction,
} from "@/lib/firebase/firestore";
import type {
  FrequencyRoom,
  HomeSuggestion,
  RoomShareItem,
  RoomShareReactionKind,
  UserProfile,
} from "@/lib/types";
import { useMountedRef } from "@/lib/use-mounted-ref";
import { CatchAVibePlayer } from "./catch-a-vibe-player";
import { CreateRoomDialog } from "./create-room-dialog";
import { FavoriteArtistsDialog } from "./favorite-artists-dialog";
import { HomeAddMusicModal } from "./home-add-music-modal";
import { HomeRecentRooms } from "./home-recent-rooms";
import { HomeYouMightLike } from "./home-you-might-like";
import { ListenOnModal, type ListenableSongItem } from "./listen-on-modal";
import { SongFrequencyLane } from "./song-frequency-lane";
import { TimelineAddMusicButton } from "./timeline-add-music-button";

export function HomeScreen() {
  const { user, profile } = useAuth();
  const { currentTrack, setTrack } = useGlobalPlayer();
  const resolvedPlayback =
    currentTrack ??
    (profile?.homeSuggestion ? toGlobalPlayerTrack(profile.homeSuggestion, "recommendation") : null);
  const artistOptions = getRecommendedArtistSeedOptions(profile);
  const genreOptions = getRecommendedGenreSeedOptions(profile?.genreProfile ?? []);
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [roomShareItems, setRoomShareItems] = useState<RoomShareItem[]>([]);
  const [socialProfiles, setSocialProfiles] = useState<UserProfile[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editArtistsOpen, setEditArtistsOpen] = useState(false);
  const [homeAddMusicOpen, setHomeAddMusicOpen] = useState(false);
  const [pendingReactionKey, setPendingReactionKey] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [selectedSong, setSelectedSong] = useState<ListenableSongItem | null>(null);
  const [guidedIntent, setGuidedIntent] = useState(() => getDefaultGuidedRecommendationIntent(profile));
  const mountedRef = useMountedRef();
  const tasteSummaryHydrationKeyRef = useRef<string | null>(null);
  const { correlatedGenres, helperCopy: genreHelperCopy } = getCorrelatedGenreSeedOptions(
    profile,
    guidedIntent.artistSeed,
    genreOptions,
  );
  const socialUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          [profile?.uid ?? "", ...(profile?.friendIds ?? [])]
            .map((uid) => uid.trim())
            .filter(Boolean),
        ),
      ),
    [profile?.friendIds, profile?.uid],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

  useEffect(() => {
    return observeRoomShareItemsByRoomIds(
      rooms.map((room) => room.id),
      setRoomShareItems,
    );
  }, [rooms]);

  useEffect(() => {
    return observeUserProfilesByIds(socialUserIds, setSocialProfiles);
  }, [socialUserIds]);

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

  const socialFeedItems = useMemo(
    () =>
      buildSongActivityItems({
        currentUserId: user?.uid ?? profile?.uid ?? null,
        items: roomShareItems,
        rooms,
        uploaderIds: socialUserIds,
        uploaderProfiles: socialProfiles,
      }),
    [profile?.uid, roomShareItems, rooms, socialProfiles, socialUserIds, user?.uid],
  );
  const latestTimelineAccent = useMemo(
    () => getGenreColor(socialFeedItems[0]?.primaryGenre ?? "frequency"),
    [socialFeedItems],
  );
  const recentRecommendationArtists = useMemo(
    () =>
      Array.from(new Set(socialFeedItems.map((item) => item.artist.trim()).filter(Boolean))).slice(
        0,
        6,
      ),
    [socialFeedItems],
  );
  const recentRecommendationGenres = useMemo(
    () =>
      Array.from(
        new Set(
          socialFeedItems
            .map((item) => item.primaryGenre?.trim())
            .filter((genre): genre is string => Boolean(genre)),
        ),
      ).slice(0, 6),
    [socialFeedItems],
  );
  const recentRecommendationSongs = useMemo(
    () =>
      socialFeedItems.slice(0, 12).map((item) => ({
        artist: item.artist,
        title: item.title,
      })),
    [socialFeedItems],
  );

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
    } catch (error) {
      console.error("[frequency][home-catch-a-vibe]", {
        event: "guided_pick_failed",
        error: error instanceof Error ? error.message : "Guided pick failed.",
        uid: user.uid,
      });
    } finally {
      if (mountedRef.current) {
        setRetryPending(false);
      }
    }
  }

  async function handleAddMusicFromHome(params: {
    roomId: string;
    channel: string;
    draft: {
      kind: "song" | "artist" | "link";
      title: string;
      subtitle?: string | null;
      url?: string | null;
      note?: string | null;
    };
  }) {
    if (!user && !profile?.uid) {
      throw new Error("Sign in again before sharing.");
    }

    await addRoomShareItem({
      roomId: params.roomId,
      channel: params.channel,
      kind: params.draft.kind,
      title: params.draft.title,
      subtitle: params.draft.subtitle,
      url: params.draft.url,
      note: params.draft.note,
      addedBy: user?.uid ?? profile?.uid ?? "",
      addedByName: profile?.displayName ?? user?.displayName ?? null,
    });
  }

  async function handleToggleReaction(
    item: (typeof socialFeedItems)[number],
    reaction: RoomShareReactionKind,
  ) {
    const currentUserId = user?.uid ?? profile?.uid ?? null;

    if (!currentUserId) {
      return;
    }

    const reactionKey = `${item.roomId}:${item.id}:${reaction}`;
    setPendingReactionKey(reactionKey);

    try {
      await toggleRoomShareReaction({
        itemId: item.id,
        reaction,
        roomId: item.roomId,
        uid: currentUserId,
      });
    } catch (error) {
      console.error("[frequency][home-reaction]", {
        event: "home_song_reaction_toggle_failed",
        itemId: item.id,
        reaction,
        roomId: item.roomId,
        error:
          error instanceof Error ? error.message : "That reaction could not be updated.",
      });
    } finally {
      setPendingReactionKey((current) => (current === reactionKey ? null : current));
    }
  }

  function handlePlayResolvedPlayback() {
    if (currentTrack) {
      setTrack(currentTrack, {
        autoplay: true,
        minimized: true,
      });
      logPlaybackEvent("play_reused_cached_source", {
        source: "home_catch_a_vibe",
        artist: currentTrack.artist,
        title: currentTrack.title,
        videoId: currentTrack.videoId,
      });
      return;
    }

    if (!profile?.homeSuggestion) {
      return;
    }

    const suggestionTrack = toGlobalPlayerTrack(profile.homeSuggestion, "home");
    setTrack(suggestionTrack, {
      autoplay: true,
      minimized: true,
    });
    logPlaybackEvent("play_reused_cached_source", {
      source: "home_catch_a_vibe",
      artist: suggestionTrack.artist,
      title: suggestionTrack.title,
      videoId: suggestionTrack.videoId,
    });
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-3 px-1 sm:space-y-4">
        <p className="text-[clamp(2.25rem,5.6vw,3.625rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[var(--text)]">
          Frequency
        </p>
        <p className="max-w-3xl text-[clamp(1.125rem,2.9vw,1.625rem)] font-medium leading-[1.24] tracking-[-0.03em] text-[var(--text-soft)]">
          {buildHomeGreeting(profile)}
        </p>
      </div>

      <section className="section-haze-strong relative isolate overflow-hidden rounded-[36px] border border-[rgba(255,255,255,0.06)] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.16)] sm:px-7 sm:py-8 lg:px-8 lg:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-[-6%] top-12 h-40 w-40 rounded-full blur-[72px] sm:h-52 sm:w-52"
            style={{
              background: `radial-gradient(circle, ${withAlpha(latestTimelineAccent, 0.14)}, transparent 72%)`,
            }}
          />
          <div
            className="absolute right-[-4%] top-24 h-44 w-44 rounded-full blur-[80px] sm:h-56 sm:w-56"
            style={{
              background: `radial-gradient(circle, ${withAlpha(latestTimelineAccent, 0.1)}, transparent 76%)`,
            }}
          />
          <div className="absolute inset-x-[12%] top-[36%] h-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_72%)] blur-[88px]" />
        </div>

        <div className="relative space-y-6 sm:space-y-7">
          <div className="space-y-2.5">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Your Timeline
            </p>
          </div>

          <SongFrequencyLane
            className="-mx-1 sm:mx-0"
            emptyBody="Add music from Home or drop songs into a room to start the social lane."
            emptyTitle="No shared songs yet"
            endLabel={null}
            items={socialFeedItems}
            onSelectItem={(item) => setSelectedSong(item)}
            onToggleReaction={(item, reaction) => {
              void handleToggleReaction(item, reaction);
            }}
            pendingReactionKey={pendingReactionKey}
            reactionUserId={user?.uid ?? profile?.uid ?? null}
            showReactions
            startLabel={null}
          />

          <div className="pt-2 sm:pt-3">
            <TimelineAddMusicButton
              accentColor={latestTimelineAccent}
              onClick={() => setHomeAddMusicOpen(true)}
            />
          </div>
        </div>
      </section>

      <HomeYouMightLike
        favoriteArtists={profile?.favoriteArtists ?? []}
        genreProfile={profile?.genreProfile ?? []}
        onEditArtists={() => setEditArtistsOpen(true)}
        onSelectRecommendation={(item) => setSelectedSong(item)}
        recentArtists={recentRecommendationArtists}
        recentGenres={recentRecommendationGenres}
        recentSongs={recentRecommendationSongs}
        uid={profile?.uid ?? user?.uid ?? null}
      />

      <HomeRecentRooms onCreateRoom={() => setCreateOpen(true)} rooms={rooms} />

      <CatchAVibePlayer
        artistOptions={artistOptions}
        correlatedGenreOptions={correlatedGenres}
        genreHelperCopy={genreHelperCopy}
        genreOptions={genreOptions}
        intent={guidedIntent}
        onGenerate={handleResolveGuidedPick}
        onIntentChange={(nextIntent) =>
          setGuidedIntent(createGuidedRecommendationIntent(nextIntent))
        }
        onOpenArtists={() => setEditArtistsOpen(true)}
        onPlay={handlePlayResolvedPlayback}
        pending={retryPending}
        playback={
          resolvedPlayback
            ? {
                artist: resolvedPlayback.artist,
                thumbnail: resolvedPlayback.thumbnail,
                title: resolvedPlayback.title,
              }
            : null
        }
        recommendationError={profile?.recommendationStatus === "error" ? profile.recommendationError : null}
      />

      <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
      {homeAddMusicOpen ? (
        <HomeAddMusicModal
          onClose={() => setHomeAddMusicOpen(false)}
          onOpenCreateRoom={() => setCreateOpen(true)}
          onSubmit={handleAddMusicFromHome}
          open={homeAddMusicOpen}
          rooms={rooms}
        />
      ) : null}
      {user && profile ? (
        <FavoriteArtistsDialog
          initialArtists={profile.favoriteArtists}
          onboardingComplete={profile.onboardingComplete}
          onClose={() => setEditArtistsOpen(false)}
          open={editArtistsOpen}
          uid={user.uid}
        />
      ) : null}
      <ListenOnModal item={selectedSong} onClose={() => setSelectedSong(null)} />
    </div>
  );
}
