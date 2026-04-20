"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import {
  addRoomShareItem,
  deleteRoom,
  observeRoom,
  observeRoomShareItems,
  observeUserProfilesByIds,
  removeRoomShareItem,
  triggerRoomShareEnrichment,
  toggleRoomShareReaction,
  updateRoomShareItem,
} from "@/lib/firebase/firestore";
import { IS_FREQUENCY_DEMO_MODE } from "@/lib/frequency/demo-mode";
import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import {
  canManageRoom,
  getRoomMemberRole,
  getRoomMemberRoleLabel,
} from "@/lib/frequency/room-roles";
import type { RoomShareSubmitDraft } from "@/lib/frequency/room-share";
import { buildSongActivityItems, type SongActivityItem } from "@/lib/frequency/song-activity";
import type { RoomSharePlatformLinks, RoomShareReactionKind } from "@/lib/types";
import type { FrequencyRoom, RoomShareItem, UserProfile } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { EmptyStateCard } from "./empty-state-card";
import { DeleteRoomDialog } from "./delete-room-dialog";
import { EditUploadModal } from "./edit-upload-modal";
import { GlassCard } from "./glass-card";
import { HomeYouMightLike } from "./home-you-might-like";
import { ListenOnModal, type ListenableSongItem } from "./listen-on-modal";
import { RemoveUploadModal } from "./remove-upload-modal";
import { RoomDnaSummary } from "./room-dna-summary";
import { RoomInviteDialog } from "./room-invite-dialog";
import { RoomShareComposerModal } from "./room-share-composer-modal";
import { RoomSongLibrary } from "./room-song-library";
import { SongFrequencyLane } from "./song-frequency-lane";
import { TimelineAddMusicButton } from "./timeline-add-music-button";

const DEFAULT_ROOM_CHANNEL = "room";

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

function shouldBackfillSongSupport(item: RoomShareItem) {
  if (
    item.kind !== "song" ||
    !(item.resolvedArtist || item.subtitle) ||
    !(item.resolvedTrack || item.title)
  ) {
    return false;
  }

  if (item.enrichmentStatus === "loading") {
    const createdAtMs = normalizeTimestampMs(item.createdAt);

    if (!createdAtMs || Date.now() - createdAtMs <= 45_000) {
      return false;
    }
  }

  return !item.artworkUrl || !hasListeningLinks(item.links);
}

function LoadingRoomLayout() {
  return (
    <div className="space-y-5">
      <div className="space-y-3 px-1">
        <div className="h-12 w-40 rounded-full bg-white/[0.05]" />
        <div className="h-5 w-56 rounded-full bg-white/[0.05]" />
      </div>
      <GlassCard strong className="min-h-[280px] rounded-[32px] p-5">
        <div aria-hidden="true" />
      </GlassCard>
      <GlassCard strong className="min-h-[420px] rounded-[32px] p-5">
        <div aria-hidden="true" />
      </GlassCard>
    </div>
  );
}

export function RoomDetailScreen({ roomId }: { roomId: string }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<FrequencyRoom | null | undefined>(undefined);
  const [shareItems, setShareItems] = useState<RoomShareItem[]>([]);
  const [uploaderProfiles, setUploaderProfiles] = useState<UserProfile[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteRoomOpen, setDeleteRoomOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [songPendingEdit, setSongPendingEdit] = useState<SongActivityItem | null>(null);
  const [songPendingRemoval, setSongPendingRemoval] = useState<SongActivityItem | null>(null);
  const [pendingReactionKey, setPendingReactionKey] = useState<string | null>(null);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedStaticSong, setSelectedStaticSong] = useState<ListenableSongItem | null>(null);
  const artworkHydrationKeysRef = useRef<Set<string>>(new Set());
  const currentUserId = user?.uid ?? profile?.uid ?? null;

  useEffect(() => {
    return observeRoom(roomId, setRoom);
  }, [roomId]);

  useEffect(() => {
    return observeRoomShareItems(roomId, setShareItems);
  }, [roomId]);

  useEffect(() => {
    const uploaderIds = Array.from(
      new Set(
        shareItems
          .map((item) => item.addedBy.trim())
          .filter(Boolean),
      ),
    );

    return observeUserProfilesByIds(uploaderIds, setUploaderProfiles);
  }, [shareItems]);

  useEffect(() => {
    const pendingEnrichmentItems = shareItems
      .filter((item) => shouldBackfillSongSupport(item))
      .slice(0, 4);

    for (const item of pendingEnrichmentItems) {
      const key = `${item.roomId}:${item.id}`;

      if (artworkHydrationKeysRef.current.has(key)) {
        continue;
      }

      artworkHydrationKeysRef.current.add(key);
      void triggerRoomShareEnrichment({
        roomId: item.roomId,
        itemId: item.id,
      }).catch((error) => {
        console.error("[frequency][timeline-song-support]", {
          event: "room_timeline_song_support_backfill_failed",
          roomId: item.roomId,
          itemId: item.id,
          error: error instanceof Error ? error.message : "Timeline song support backfill failed.",
        });
      });
    }
  }, [shareItems]);

  const canViewRoom = useMemo(() => {
    if (!room) {
      return false;
    }

    if (room.visibility === "public") {
      return true;
    }

    return user ? room.memberIds.includes(user.uid) : false;
  }, [room, user]);
  const currentRoomRole = room ? getRoomMemberRole(room, currentUserId) : null;
  const currentRoomRoleLabel =
    currentRoomRole === "owner" || currentRoomRole === "co-owner"
      ? getRoomMemberRoleLabel(currentRoomRole)
      : null;
  const canDeleteCurrentRoom = Boolean(room && canManageRoom(room, currentUserId));

  const roomSongItems = useMemo(
    () =>
      buildSongActivityItems({
        currentUserId,
        items: shareItems,
        rooms: room ? [room] : [],
        uploaderProfiles,
      }).map((item) => ({
        ...item,
        channel: null,
        contextLabel: room?.name ?? null,
      })),
    [currentUserId, room, shareItems, uploaderProfiles],
  );
  const roomTimelineAccent = useMemo(
    () => getGenreColor(roomSongItems[0]?.visualAccentKey ?? "frequency"),
    [roomSongItems],
  );
  const selectedSong = useMemo(
    () =>
      selectedSongId
        ? roomSongItems.find((item) => item.id === selectedSongId) ?? null
        : selectedStaticSong,
    [roomSongItems, selectedSongId, selectedStaticSong],
  );
  const roomRecommendationArtists = useMemo(
    () =>
      Array.from(new Set(roomSongItems.map((item) => item.artist.trim()).filter(Boolean))).slice(
        0,
        6,
      ),
    [roomSongItems],
  );
  const roomRecommendationGenres = useMemo(
    () =>
      Array.from(
        new Set(
          roomSongItems
            .map((item) => item.primaryGenre?.trim())
            .filter((genre): genre is string => Boolean(genre)),
        ),
      ).slice(0, 6),
    [roomSongItems],
  );
  const roomRecommendationSongs = useMemo(
    () =>
      roomSongItems.slice(0, 12).map((item) => ({
        artist: item.artist,
        title: item.title,
      })),
    [roomSongItems],
  );
  const roomRecommendationGenreProfile = useMemo(() => {
    const counts = roomSongItems.reduce<Map<string, number>>((map, item) => {
      const genre = item.primaryGenre?.trim();

      if (!genre) {
        return map;
      }

      map.set(genre, (map.get(genre) ?? 0) + 1);
      return map;
    }, new Map());
    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([tag, count]) => ({
        tag,
        weight: total > 0 ? count / total : 0,
      }));
  }, [roomSongItems]);

  async function handleAddShareItem(draft: RoomShareSubmitDraft) {
    if (!currentUserId) {
      throw new Error("Sign in again before sharing.");
    }

    setRoomActionError(null);

    await addRoomShareItem({
      artworkUrl: draft.artworkUrl,
      roomId,
      channel: DEFAULT_ROOM_CHANNEL,
      kind: draft.kind,
      links: draft.links,
      title: draft.title,
      resolvedArtist: draft.resolvedArtist,
      resolvedTrack: draft.resolvedTrack,
      sourcePlatform: draft.sourcePlatform,
      subtitle: draft.subtitle,
      url: draft.url,
      note: draft.note,
      addedBy: currentUserId,
      addedByName: profile?.displayName ?? user?.displayName ?? null,
    });
  }

  async function handleRemoveShareItem(item: RoomShareItem) {
    if (!currentUserId) {
      setRoomActionError("Sign in again before removing a drop.");
      return false;
    }

    setRoomActionError(null);
    setRemovingItemId(item.id);

    try {
      await removeRoomShareItem({
        roomId,
        itemId: item.id,
        removedBy: currentUserId,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "That drop could not be removed.";
      setRoomActionError(message);
      console.error("[frequency][room-share]", {
        event: "room_share_item_remove_failed",
        roomId,
        itemId: item.id,
        error: message,
      });
      return false;
    } finally {
      setRemovingItemId((current) => (current === item.id ? null : current));
    }
  }

  async function handleConfirmRemoveShareItem() {
    if (!songPendingRemoval) {
      return;
    }

    const removed = await handleRemoveShareItem(songPendingRemoval.rawItem);

    if (removed) {
      setSongPendingRemoval(null);
    }
  }

  async function handleEditShareItem(draft: RoomShareSubmitDraft) {
    if (!songPendingEdit || !currentUserId) {
      throw new Error("Sign in again before editing this song.");
    }

    setRoomActionError(null);
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
        roomId,
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
      setRoomActionError(message);
      console.error("[frequency][room-share]", {
        event: "room_share_item_update_failed",
        roomId,
        itemId: songPendingEdit.id,
        error: message,
      });
      throw error;
    } finally {
      setEditingItemId((current) =>
        current === songPendingEdit.id ? null : current,
      );
    }
  }

  async function handleConfirmDeleteRoom() {
    if (!room || !currentUserId) {
      return;
    }

    setRoomActionError(null);
    setPendingDeleteRoom(true);

    try {
      await deleteRoom({
        roomId: room.id,
        uid: currentUserId,
      });
      setDeleteRoomOpen(false);
      router.push("/rooms");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "That room could not be deleted.";
      setRoomActionError(message);
      console.error("[frequency][room-delete]", {
        event: "room_delete_failed_from_detail",
        roomId: room.id,
        error: message,
      });
    } finally {
      setPendingDeleteRoom(false);
    }
  }

  async function handleToggleReaction(
    item: SongActivityItem,
    reaction: RoomShareReactionKind,
  ) {
    if (!currentUserId) {
      setRoomActionError("Sign in again before reacting.");
      return;
    }

    const reactionKey = `${item.roomId}:${item.id}:${reaction}`;

    setRoomActionError(null);
    setPendingReactionKey(reactionKey);

    try {
      await toggleRoomShareReaction({
        itemId: item.id,
        reaction,
        roomId,
        uid: currentUserId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "That reaction could not be updated.";
      setRoomActionError(message);
      console.error("[frequency][room-share-reaction]", {
        event: "room_share_reaction_toggle_failed",
        itemId: item.id,
        reaction,
        roomId,
        error: message,
      });
    } finally {
      setPendingReactionKey((current) => (current === reactionKey ? null : current));
    }
  }

  if (room === undefined) {
    return <LoadingRoomLayout />;
  }

  if (!room) {
    return (
      <EmptyStateCard
        body="This room could not be found. Jump back to your rooms and pick another space."
        primaryAction="Back to rooms"
        primaryHref="/rooms"
        title="Room not found"
        visual="rooms"
      />
    );
  }

  if (!canViewRoom) {
    return (
      <EmptyStateCard
        body="This room is personal and isn't part of your spaces yet."
        primaryAction="Back to rooms"
        primaryHref="/rooms"
        title="This room isn't available here"
        visual="rooms"
      />
    );
  }

  return (
    <div className="page-atmosphere room-detail-atmosphere space-y-5 sm:space-y-8">
      {IS_FREQUENCY_DEMO_MODE ? (
        <div className="px-1">
          <span className="surface-pill inline-flex min-h-9 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Live classroom demo
          </span>
        </div>
      ) : (
        <Link
          className="inline-flex min-h-10 items-center gap-2 px-1 text-sm font-medium text-[var(--text-soft)] transition hover:text-[var(--text)]"
          href="/rooms"
        >
          <ArrowLeft className="size-4" />
          Back to rooms
        </Link>
      )}

      <div className="space-y-7 sm:space-y-9">
        <div className="grid gap-4 px-1 sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-2.5">
            <h1 className="text-balance break-words text-[2.25rem] font-semibold leading-[1.02] tracking-normal text-[var(--text)] sm:text-[3.25rem] sm:leading-[0.96]">
              {room.name}
            </h1>
            <p className="text-[15px] leading-6 text-[var(--text-soft)]">
              {[
                formatCount(room.memberIds.length, "member"),
                currentRoomRoleLabel,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>

          {IS_FREQUENCY_DEMO_MODE ? null : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:justify-end">
              {canDeleteCurrentRoom ? (
                <button
                  className="button-secondary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-medium sm:w-auto sm:self-start"
                  onClick={() => setDeleteRoomOpen(true)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                  Delete group
                </button>
              ) : null}
              <button
                className="button-secondary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-medium sm:w-auto sm:self-start"
                onClick={() => setInviteOpen(true)}
                type="button"
              >
                <UserPlus className="size-4" />
                Invite friends
              </button>
            </div>
          )}
        </div>

        <section className="relative isolate px-1">
          <div
            className={`relative overflow-hidden rounded-[30px] border px-4 py-5 sm:rounded-[34px] sm:px-6 sm:py-7 ${
              IS_FREQUENCY_DEMO_MODE
                ? "border-white/10 bg-black shadow-[0_28px_90px_rgba(255,255,255,0.52)]"
                : "border-white/[0.05] bg-[rgba(7,9,14,0.46)] shadow-[0_20px_54px_rgba(0,0,0,0.22)]"
            }`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 inset-y-0 -z-10"
            >
              <div
                className="absolute left-[-4%] top-8 h-36 w-36 rounded-full blur-[66px] sm:h-48 sm:w-48"
                style={{
                  background: `radial-gradient(circle, ${withAlpha(roomTimelineAccent, IS_FREQUENCY_DEMO_MODE ? 0.18 : 0.14)}, transparent 72%)`,
                }}
              />
              <div
                className="absolute right-[-4%] top-[4.5rem] h-36 w-36 rounded-full blur-[72px] sm:h-48 sm:w-48"
                style={{
                  background: `radial-gradient(circle, ${withAlpha(roomTimelineAccent, IS_FREQUENCY_DEMO_MODE ? 0.14 : 0.1)}, transparent 76%)`,
                }}
              />
              {IS_FREQUENCY_DEMO_MODE ? (
                <div className="absolute inset-x-[14%] top-[32%] h-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_72%)] blur-[92px]" />
              ) : null}
            </div>

            <div className="relative space-y-5 sm:space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  {`${room.name}'s Timeline`}
                </h2>
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  Shared songs moving through this room right now.
                </p>
              </div>

              {roomActionError ? (
                <p className="text-[12px] leading-5 text-[#d7a0a0]">{roomActionError}</p>
              ) : null}

              <SongFrequencyLane
                className="-mx-2 sm:mx-0"
                defaultToRecent
                emptyBody="Click/Tap on add music."
                hideVisualizationWhenEmpty
                endLabel={null}
                items={roomSongItems}
                canEditItem={(item) => item.rawItem.addedBy === currentUserId}
                onEditItem={(item) => {
                  setRoomActionError(null);
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
                showDateMarkers
                spaciousMobile
                startLabel={null}
              />

              <div className="pt-1 sm:pt-1.5">
                <TimelineAddMusicButton
                  accentColor={roomTimelineAccent}
                  onClick={() => {
                    setRoomActionError(null);
                    setComposerOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <RoomSongLibrary
          canEditItem={(item) => item.rawItem.addedBy === currentUserId}
          canRemoveItem={(item) => {
            if (!currentUserId) {
              return false;
            }

            return item.rawItem.addedBy === currentUserId || canManageRoom(room, currentUserId);
          }}
          items={roomSongItems}
          onEditItem={(item) => {
            setRoomActionError(null);
            setSongPendingEdit(item);
          }}
          onRemoveItem={(item) => {
            setRoomActionError(null);
            setSongPendingRemoval(item);
          }}
          onSelectItem={(item) => {
            setSelectedSongId(item.id);
            setSelectedStaticSong(null);
          }}
          removingItemId={removingItemId}
        />
        <RoomDnaSummary items={roomSongItems} />

        {IS_FREQUENCY_DEMO_MODE ? null : (
          <HomeYouMightLike
            emptyMessage="Add a few songs to this room to unlock recommendations here."
            favoriteArtists={[]}
            genreProfile={roomRecommendationGenreProfile}
            onSelectRecommendation={(item) => {
              setSelectedSongId(null);
              setSelectedStaticSong(item);
            }}
            recentArtists={roomRecommendationArtists}
            recentGenres={roomRecommendationGenres}
            recentSongs={roomRecommendationSongs}
            scope={`room:${room.id}`}
            subtitle="Room picks held steady until you refresh them."
            title="Recommended Songs"
            uid={profile?.uid ?? user?.uid ?? null}
          />
        )}
      </div>
      {room ? (
        <RoomShareComposerModal
          onClose={() => setComposerOpen(false)}
          onSubmit={async (draft) => {
            await handleAddShareItem(draft);
            setComposerOpen(false);
          }}
          open={composerOpen}
          roomName={room.name}
          visibility={room.visibility}
        />
      ) : null}
      <EditUploadModal
        item={songPendingEdit}
        onClose={() => {
          if (!editingItemId) {
            setSongPendingEdit(null);
          }
        }}
        onSubmit={handleEditShareItem}
      />
      <RemoveUploadModal
        closeLabel="Close remove song"
        confirmLabel="Remove"
        description={
          songPendingRemoval
            ? `Remove ${songPendingRemoval.title} by ${songPendingRemoval.artist} from this room?`
            : undefined
        }
        eyebrow="Remove song"
        item={songPendingRemoval}
        onClose={() => {
          if (!removingItemId) {
            setSongPendingRemoval(null);
          }
        }}
        onConfirm={() => void handleConfirmRemoveShareItem()}
        pending={Boolean(songPendingRemoval && removingItemId === songPendingRemoval.id)}
        title="Are you sure?"
      />
      <DeleteRoomDialog
        onClose={() => {
          if (!pendingDeleteRoom) {
            setDeleteRoomOpen(false);
          }
        }}
        onConfirm={() => void handleConfirmDeleteRoom()}
        pending={pendingDeleteRoom}
        room={deleteRoomOpen ? room : null}
      />
      <RoomInviteDialog onClose={() => setInviteOpen(false)} open={inviteOpen} room={room} />
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
