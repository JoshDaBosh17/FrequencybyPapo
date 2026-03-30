"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import {
  addRoomShareItem,
  observeRoom,
  observeRoomShareItems,
  observeUserProfilesByIds,
  removeRoomShareItem,
  toggleRoomShareReaction,
} from "@/lib/firebase/firestore";
import { getGenreColor } from "@/lib/frequency/genre-colors";
import { buildSongActivityItems, type SongActivityItem } from "@/lib/frequency/song-activity";
import type { RoomShareReactionKind } from "@/lib/types";
import type { FrequencyRoom, RoomShareItem, UserProfile } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { EmptyStateCard } from "./empty-state-card";
import { GlassCard } from "./glass-card";
import { HomeYouMightLike } from "./home-you-might-like";
import { ListenOnModal, type ListenableSongItem } from "./listen-on-modal";
import { RemoveUploadModal } from "./remove-upload-modal";
import { RoomShareComposerModal } from "./room-share-composer-modal";
import { RoomSongLibrary } from "./room-song-library";
import { SongFrequencyLane } from "./song-frequency-lane";
import { TimelineAddMusicButton } from "./timeline-add-music-button";

const DEFAULT_ROOM_CHANNEL = "room";

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
  const [room, setRoom] = useState<FrequencyRoom | null | undefined>(undefined);
  const [shareItems, setShareItems] = useState<RoomShareItem[]>([]);
  const [uploaderProfiles, setUploaderProfiles] = useState<UserProfile[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [songPendingRemoval, setSongPendingRemoval] = useState<SongActivityItem | null>(null);
  const [pendingReactionKey, setPendingReactionKey] = useState<string | null>(null);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<ListenableSongItem | null>(null);

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

  const canViewRoom = useMemo(() => {
    if (!room) {
      return false;
    }

    if (room.visibility === "public") {
      return true;
    }

    return user ? room.memberIds.includes(user.uid) : false;
  }, [room, user]);

  const roomSongItems = useMemo(
    () =>
      buildSongActivityItems({
        currentUserId: user?.uid ?? profile?.uid ?? null,
        items: shareItems,
        rooms: room ? [room] : [],
        uploaderProfiles,
      }).map((item) => ({
        ...item,
        channel: null,
        contextLabel: room?.name ?? null,
      })),
    [profile?.uid, room, shareItems, uploaderProfiles, user?.uid],
  );
  const roomTimelineAccent = useMemo(
    () => getGenreColor(roomSongItems[0]?.primaryGenre ?? "frequency"),
    [roomSongItems],
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

  async function handleAddShareItem(draft: {
    kind: RoomShareItem["kind"];
    title: string;
    subtitle?: string | null;
    url?: string | null;
    note?: string | null;
  }) {
    if (!user && !profile?.uid) {
      throw new Error("Sign in again before sharing.");
    }

    setRoomActionError(null);

    await addRoomShareItem({
      roomId,
      channel: DEFAULT_ROOM_CHANNEL,
      kind: draft.kind,
      title: draft.title,
      subtitle: draft.subtitle,
      url: draft.url,
      note: draft.note,
      addedBy: user?.uid ?? profile?.uid ?? "",
      addedByName: profile?.displayName ?? user?.displayName ?? null,
    });
  }

  async function handleRemoveShareItem(item: RoomShareItem) {
    const currentUserId = user?.uid ?? profile?.uid ?? null;

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

  async function handleToggleReaction(
    item: SongActivityItem,
    reaction: RoomShareReactionKind,
  ) {
    const currentUserId = user?.uid ?? profile?.uid ?? null;

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
    <div className="space-y-6 sm:space-y-7">
      <Link
        className="inline-flex min-h-10 items-center gap-2 px-1 text-sm font-medium text-[var(--text-soft)] transition hover:text-[var(--text)]"
        href="/rooms"
      >
        <ArrowLeft className="size-4" />
        Back to rooms
      </Link>

      <div className="space-y-7 sm:space-y-8">
        <div className="space-y-2 px-1">
          <p className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[var(--text)]">
            {room.name}
          </p>
          <p className="text-[15px] leading-6 text-[var(--text-soft)]">
            {formatCount(room.memberIds.length, "member")}
          </p>
        </div>

        <section className="section-haze-strong relative isolate overflow-hidden rounded-[32px] border border-[rgba(255,255,255,0.06)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.16)] sm:px-6 sm:py-6">
          <div className="space-y-5 sm:space-y-6">
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
              className="-mx-1 sm:mx-0"
              defaultToRecent
              emptyBody="Add the first song to start shaping this shared frequency."
              emptyTitle="No songs in this room yet"
              endLabel={null}
              items={roomSongItems}
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
                accentColor={roomTimelineAccent}
                onClick={() => {
                  setRoomActionError(null);
                  setComposerOpen(true);
                }}
              />
            </div>
          </div>
        </section>

        <HomeYouMightLike
          emptyMessage="Add a few songs to this room to unlock recommendations here."
          favoriteArtists={[]}
          genreProfile={roomRecommendationGenreProfile}
          onSelectRecommendation={(item) => setSelectedSong(item)}
          recentArtists={roomRecommendationArtists}
          recentGenres={roomRecommendationGenres}
          recentSongs={roomRecommendationSongs}
          scope={`room:${room.id}`}
          subtitle="Room picks held steady until you refresh them."
          title="Recommended Songs"
          uid={profile?.uid ?? user?.uid ?? null}
        />

        <RoomSongLibrary
          canRemoveItem={(item) => {
            const currentUserId = user?.uid ?? profile?.uid ?? null;
            if (!currentUserId) {
              return false;
            }

            return item.rawItem.addedBy === currentUserId || room.createdBy === currentUserId;
          }}
          items={roomSongItems}
          onRemoveItem={(item) => {
            setRoomActionError(null);
            setSongPendingRemoval(item);
          }}
          onSelectItem={(item) => setSelectedSong(item)}
          removingItemId={removingItemId}
        />
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
      <ListenOnModal item={selectedSong} onClose={() => setSelectedSong(null)} />
    </div>
  );
}
