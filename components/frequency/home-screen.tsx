"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { triggerUserEnrichment } from "@/lib/client/enrichment";
import { buildHomeGreeting } from "@/lib/frequency";
import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import { isOnboardingComplete } from "@/lib/frequency/onboarding";
import type { RoomShareSubmitDraft } from "@/lib/frequency/room-share";
import {
  buildPersonalSongActivityItems,
  buildSongActivityItems,
  type SongActivityItem,
} from "@/lib/frequency/song-activity";
import { hasGeneratedTasteSummary } from "@/lib/frequency/taste-summary";
import {
  addPersonalSongItem,
  observeJoinedRooms,
  observePersonalSongItems,
  observeRoomShareItemsByRoomIds,
  observeUserProfilesByIds,
  triggerPersonalSongEnrichment,
  triggerRoomShareEnrichment,
  toggleRoomShareReaction,
  updateRoomShareItem,
} from "@/lib/firebase/firestore";
import type {
  FrequencyRoom,
  PersonalSongItem,
  RoomShareItem,
  RoomSharePlatformLinks,
  RoomShareReactionKind,
  UserProfile,
} from "@/lib/types";
import { CreateRoomDialog } from "./create-room-dialog";
import { EditUploadModal } from "./edit-upload-modal";
import { FavoriteArtistsDialog } from "./favorite-artists-dialog";
import { HomeCollectionModal, HomeCollectionSection } from "./home-collection-section";
import { HomeAddMusicModal } from "./home-add-music-modal";
import { HomeRecentRooms } from "./home-recent-rooms";
import { HomeYouMightLike } from "./home-you-might-like";
import { ListenOnModal, type ListenableSongItem } from "./listen-on-modal";
import { SongFrequencyLane } from "./song-frequency-lane";
import { TimelineAddMusicButton } from "./timeline-add-music-button";

function normalizeCollectionKeyPart(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function normalizeTimestampMs(value: unknown) {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === "object" && "seconds" in value) {
    return ((value as { seconds?: number }).seconds ?? 0) * 1000;
  }

  return 0;
}

function hasListeningLinks(links?: RoomSharePlatformLinks | null) {
  return Boolean(links?.spotify || links?.appleMusic || links?.soundcloud || links?.youtube);
}

function hasResolvableSongMetadata(item: {
  kind: string;
  resolvedArtist?: string | null;
  resolvedTrack?: string | null;
  subtitle?: string | null;
  title?: string | null;
}) {
  return Boolean(
    item.kind === "song" &&
      (item.resolvedArtist || item.subtitle) &&
      (item.resolvedTrack || item.title),
  );
}

function isStaleLoadingUpload(item: { createdAt: unknown; enrichmentStatus?: string | null }) {
  if (item.enrichmentStatus !== "loading") {
    return false;
  }

  const createdAtMs = normalizeTimestampMs(item.createdAt);
  return Boolean(createdAtMs && Date.now() - createdAtMs > 45_000);
}

function shouldBackfillSongSupport(item: {
  artworkUrl?: string | null;
  createdAt: unknown;
  enrichmentStatus?: string | null;
  kind: string;
  links?: RoomSharePlatformLinks | null;
  resolvedArtist?: string | null;
  resolvedTrack?: string | null;
  subtitle?: string | null;
  title?: string | null;
}) {
  if (!hasResolvableSongMetadata(item)) {
    return false;
  }

  if (item.enrichmentStatus === "loading" && !isStaleLoadingUpload(item)) {
    return false;
  }

  return !item.artworkUrl || !hasListeningLinks(item.links);
}

function getCollectionDedupeKey(item: SongActivityItem) {
  const platformLink =
    item.links?.spotify ??
    item.links?.appleMusic ??
    item.links?.soundcloud ??
    item.links?.youtube ??
    item.rawItem.url;

  if (platformLink) {
    return `link:${normalizeCollectionKeyPart(platformLink)}`;
  }

  return `song:${normalizeCollectionKeyPart(item.artist)}:${normalizeCollectionKeyPart(item.title)}`;
}

function buildHomeCollectionItems(items: SongActivityItem[]) {
  const deduped = new Map<string, SongActivityItem>();

  for (const item of items) {
    if (item.rawItem.kind !== "song") {
      continue;
    }

    const key = getCollectionDedupeKey(item);
    const existing = deduped.get(key);

    if (!existing || normalizeTimestampMs(item.createdAt) > normalizeTimestampMs(existing.createdAt)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values()).sort(
    (left, right) => normalizeTimestampMs(right.createdAt) - normalizeTimestampMs(left.createdAt),
  );
}

export function HomeScreen() {
  const { user, profile } = useAuth();
  const profileOnboardingComplete = isOnboardingComplete(profile);
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [roomShareItems, setRoomShareItems] = useState<RoomShareItem[]>([]);
  const [personalSaveItems, setPersonalSaveItems] = useState<PersonalSongItem[]>([]);
  const [socialProfiles, setSocialProfiles] = useState<UserProfile[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [editArtistsOpen, setEditArtistsOpen] = useState(false);
  const [homeAddMusicOpen, setHomeAddMusicOpen] = useState(false);
  const [homeTimelineError, setHomeTimelineError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [pendingReactionKey, setPendingReactionKey] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedStaticSong, setSelectedStaticSong] = useState<ListenableSongItem | null>(null);
  const [songPendingEdit, setSongPendingEdit] = useState<SongActivityItem | null>(null);
  const currentUserId = user?.uid ?? profile?.uid ?? null;
  const tasteSummaryHydrationKeyRef = useRef<string | null>(null);
  const artworkHydrationKeysRef = useRef<Set<string>>(new Set());
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
    if (!profile?.uid) {
      setPersonalSaveItems([]);
      return;
    }

    return observePersonalSongItems(profile.uid, setPersonalSaveItems);
  }, [profile?.uid]);

  useEffect(() => {
    return observeUserProfilesByIds(socialUserIds, setSocialProfiles);
  }, [socialUserIds]);

  useEffect(() => {
    const pendingEnrichmentItems = roomShareItems
      .filter((item) => shouldBackfillSongSupport(item))
      .slice(0, 4);

    for (const item of pendingEnrichmentItems) {
      const key = `room:${item.roomId}:${item.id}`;

      if (artworkHydrationKeysRef.current.has(key)) {
        continue;
      }

      artworkHydrationKeysRef.current.add(key);
      void triggerRoomShareEnrichment({
        roomId: item.roomId,
        itemId: item.id,
      }).catch((error) => {
        console.error("[frequency][timeline-song-support]", {
          event: "home_timeline_song_support_backfill_failed",
          roomId: item.roomId,
          itemId: item.id,
          error: error instanceof Error ? error.message : "Timeline song support backfill failed.",
        });
      });
    }
  }, [roomShareItems]);

  useEffect(() => {
    if (!profile?.uid) {
      return;
    }

    const pendingEnrichmentItems = personalSaveItems
      .filter((item) => shouldBackfillSongSupport(item))
      .slice(0, 4);

    for (const item of pendingEnrichmentItems) {
      const key = `personal:${profile.uid}:${item.id}`;

      if (artworkHydrationKeysRef.current.has(key)) {
        continue;
      }

      artworkHydrationKeysRef.current.add(key);
      void triggerPersonalSongEnrichment({
        userId: profile.uid,
        itemId: item.id,
      }).catch((error) => {
        console.error("[frequency][personal-song-enrichment]", {
          event: "home_personal_song_support_backfill_failed",
          userId: profile.uid,
          itemId: item.id,
          error: error instanceof Error ? error.message : "Personal song support backfill failed.",
        });
      });
    }
  }, [personalSaveItems, profile?.uid]);

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

  const socialFeedItems = useMemo(
    () =>
      buildSongActivityItems({
        currentUserId,
        items: roomShareItems,
        rooms,
        uploaderIds: socialUserIds,
        uploaderProfiles: socialProfiles,
      }),
    [currentUserId, roomShareItems, rooms, socialProfiles, socialUserIds],
  );
  const personalUploadItems = useMemo(
    () =>
      buildPersonalSongActivityItems({
        currentUserId,
        items: personalSaveItems,
        profile,
      }),
    [currentUserId, personalSaveItems, profile],
  );
  const groupCollectionItems = useMemo(
    () =>
      buildSongActivityItems({
        currentUserId,
        items: roomShareItems,
        rooms,
        uploaderProfiles: socialProfiles,
      }),
    [currentUserId, roomShareItems, rooms, socialProfiles],
  );
  const collectionItems = useMemo(
    () => buildHomeCollectionItems([...personalUploadItems, ...groupCollectionItems]),
    [groupCollectionItems, personalUploadItems],
  );
  const latestTimelineAccent = useMemo(
    () => getGenreColor(socialFeedItems[0]?.visualAccentKey ?? "frequency"),
    [socialFeedItems],
  );
  const selectedSong = useMemo(
    () =>
      selectedSongId
        ? socialFeedItems.find((item) => item.id === selectedSongId) ?? null
        : selectedStaticSong,
    [selectedSongId, selectedStaticSong, socialFeedItems],
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

  async function handleAddMusicFromHome(draft: RoomShareSubmitDraft) {
    if (!currentUserId) {
      throw new Error("Sign in again before saving.");
    }

    await addPersonalSongItem({
      artworkUrl: draft.artworkUrl,
      kind: draft.kind,
      links: draft.links,
      note: draft.note,
      resolvedArtist: draft.resolvedArtist,
      resolvedTrack: draft.resolvedTrack,
      sourcePlatform: draft.sourcePlatform,
      subtitle: draft.subtitle,
      title: draft.title,
      url: draft.url,
      userId: currentUserId,
    });
  }

  async function handleEditTimelineUpload(draft: RoomShareSubmitDraft) {
    if (!songPendingEdit || !currentUserId) {
      throw new Error("Sign in again before editing this song.");
    }

    setHomeTimelineError(null);
    setEditingItemId(songPendingEdit.id);

    try {
      await updateRoomShareItem({
        artworkUrl: draft.artworkUrl,
        itemId: songPendingEdit.id,
        kind: draft.kind,
        links: draft.links,
        note: draft.note,
        resolvedArtist: draft.resolvedArtist,
        resolvedTrack: draft.resolvedTrack,
        roomId: songPendingEdit.roomId,
        sourcePlatform: draft.sourcePlatform,
        subtitle: draft.subtitle,
        title: draft.title,
        updatedBy: currentUserId,
        url: draft.url,
      });
      setSongPendingEdit(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "That song could not be updated.";
      setHomeTimelineError(message);
      console.error("[frequency][home-timeline]", {
        event: "home_timeline_song_update_failed",
        itemId: songPendingEdit.id,
        roomId: songPendingEdit.roomId,
        error: message,
      });
      throw error;
    } finally {
      setEditingItemId((current) =>
        current === songPendingEdit.id ? null : current,
      );
    }
  }

  async function handleToggleReaction(
    item: SongActivityItem,
    reaction: RoomShareReactionKind,
  ) {
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

  return (
    <div className="page-atmosphere space-y-10 sm:space-y-12">
      <div className="space-y-3 px-1 sm:space-y-4">
        <p className="text-[clamp(2.25rem,5.6vw,3.625rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[var(--text)]">
          Frequency
        </p>
        <p className="max-w-3xl text-[clamp(1.125rem,2.9vw,1.625rem)] font-medium leading-[1.24] tracking-[-0.03em] text-[var(--text-soft)]">
          {buildHomeGreeting(profile)}
        </p>
      </div>

      <section className="relative isolate overflow-visible rounded-[36px] bg-[#030406] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_18px_42px_rgba(0,0,0,0.22)] sm:overflow-hidden sm:px-7 sm:py-8 lg:px-8 lg:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 inset-y-4 -z-10">
          <div
            className="absolute left-[-6%] top-10 h-40 w-40 rounded-full blur-[72px] sm:h-52 sm:w-52"
            style={{
              background: `radial-gradient(circle, ${withAlpha(latestTimelineAccent, 0.14)}, transparent 100%)`,
            }}
          />
          <div
            className="absolute right-[-4%] top-24 h-44 w-44 rounded-full blur-[80px] sm:h-56 sm:w-56"
            style={{
              background: `radial-gradient(circle, ${withAlpha(latestTimelineAccent, 0.1)}, transparent 100%)`,
            }}
          />
          <div className="absolute inset-x-[12%] top-[34%] h-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.045),transparent_72%)] blur-[88px]" />
        </div>

        <div className="relative space-y-6 sm:space-y-7">
          <div className="space-y-2.5">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Your Timeline
            </p>
          </div>

          {homeTimelineError ? (
            <p className="text-[12px] leading-5 text-[#d7a0a0]">{homeTimelineError}</p>
          ) : null}

          <SongFrequencyLane
            className="mx-0"
            emptyBody="Click/Tap on add music."
            endLabel={null}
            items={socialFeedItems}
            canEditItem={(item) => item.rawItem.addedBy === currentUserId}
            onEditItem={(item) => {
              setHomeTimelineError(null);
              setSongPendingEdit(item);
            }}
            onSelectItem={(item) => {
              setSelectedSongId(item.id);
              setSelectedStaticSong(null);
            }}
            onToggleReaction={(item, reaction) => {
              void handleToggleReaction(item, reaction);
            }}
            pendingReactionKey={pendingReactionKey}
            reactionUserId={currentUserId}
            showReactions
            startLabel={null}
          />

          <div className="pt-1 sm:pt-1.5">
            <TimelineAddMusicButton
              accentColor={latestTimelineAccent}
              onClick={() => setHomeAddMusicOpen(true)}
            />
          </div>
        </div>
      </section>

      <HomeCollectionSection
        items={collectionItems}
        onExpand={() => setCollectionOpen(true)}
        onSelectItem={(item) => {
          setSelectedSongId(null);
          setSelectedStaticSong(item);
        }}
      />

      <HomeYouMightLike
        favoriteArtists={profile?.favoriteArtists ?? []}
        genreProfile={profile?.genreProfile ?? []}
        onEditArtists={() => setEditArtistsOpen(true)}
        onSelectRecommendation={(item) => {
          setSelectedSongId(null);
          setSelectedStaticSong(item);
        }}
        recentArtists={recentRecommendationArtists}
        recentGenres={recentRecommendationGenres}
        recentSongs={recentRecommendationSongs}
        uid={profile?.uid ?? user?.uid ?? null}
      />

      <HomeRecentRooms onCreateRoom={() => setCreateOpen(true)} rooms={rooms} />

      <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
      <HomeCollectionModal
        items={collectionItems}
        onClose={() => setCollectionOpen(false)}
        onSelectItem={(item) => {
          setSelectedSongId(null);
          setSelectedStaticSong(item);
        }}
        open={collectionOpen}
      />
      {homeAddMusicOpen ? (
        <HomeAddMusicModal
          onClose={() => setHomeAddMusicOpen(false)}
          onSubmit={handleAddMusicFromHome}
          open={homeAddMusicOpen}
        />
      ) : null}
      <EditUploadModal
        item={songPendingEdit}
        onClose={() => {
          if (!editingItemId) {
            setSongPendingEdit(null);
          }
        }}
        onSubmit={handleEditTimelineUpload}
      />
      {user && profile ? (
        <FavoriteArtistsDialog
          initialArtists={profile.favoriteArtists}
          onboardingComplete={profileOnboardingComplete}
          onClose={() => setEditArtistsOpen(false)}
          open={editArtistsOpen}
          uid={user.uid}
        />
      ) : null}
      <ListenOnModal
        item={selectedSong}
        onClose={() => {
          setSelectedSongId(null);
          setSelectedStaticSong(null);
        }}
      />
    </div>
  );
}
