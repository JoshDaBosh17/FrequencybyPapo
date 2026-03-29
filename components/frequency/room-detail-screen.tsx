"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import {
  addRoomShareItem,
  createRoomChannel,
  observeRoom,
  observeRoomShareItems,
  removeRoomShareItem,
} from "@/lib/firebase/firestore";
import {
  buildHelixPreviewGenres,
  buildRoomHelixTimelineEntries,
} from "@/lib/frequency/helix-timeline";
import { getChannelVibe, getRoomIdentityGenres, getRoomVisibilityLabel } from "@/lib/frequency/room-identity";
import type { FrequencyRoom, RoomShareItem } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { EmptyStateCard } from "./empty-state-card";
import { GlassCard } from "./glass-card";
import { HelixTimelineModal } from "./helix-timeline-modal";
import { RoomChannelSidebar } from "./room-channel-sidebar";
import { RoomHeroHelix } from "./room-hero-helix";
import { RoomShareComposerModal } from "./room-share-composer-modal";
import { RoomShareFeed } from "./room-share-feed";

const ROOM_PREVIEW_VISIBLE_ITEMS = 3;

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function formatChannelLabel(channel: string) {
  return channel.trim().startsWith("#") ? channel.trim() : `#${channel.trim()}`;
}

function LoadingRoomLayout() {
  return (
    <div className="grid gap-5 xl:grid-cols-[288px_minmax(0,1fr)]">
      <GlassCard strong className="min-h-[480px] rounded-[28px] p-4">
        <div aria-hidden="true" />
      </GlassCard>
      <GlassCard strong className="min-h-[620px] rounded-[32px] p-5">
        <div aria-hidden="true" />
      </GlassCard>
    </div>
  );
}

export function RoomDetailScreen({ roomId }: { roomId: string }) {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<FrequencyRoom | null | undefined>(undefined);
  const [shareItems, setShareItems] = useState<RoomShareItem[]>([]);
  const [preferredChannel, setPreferredChannel] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [channelActionError, setChannelActionError] = useState<string | null>(null);

  useEffect(() => {
    return observeRoom(roomId, setRoom);
  }, [roomId]);

  useEffect(() => {
    return observeRoomShareItems(roomId, setShareItems);
  }, [roomId]);

  const canViewRoom = useMemo(() => {
    if (!room) {
      return false;
    }

    if (room.visibility === "public") {
      return true;
    }

    return user ? room.memberIds.includes(user.uid) : false;
  }, [room, user]);

  const activeChannel =
    room?.genreChannels.find((channel) => channel === preferredChannel) ??
    room?.genreChannels[0] ??
    null;
  const activeChannelVibe = activeChannel && room ? getChannelVibe(room, activeChannel) : null;
  const roomGenres = useMemo(
    () => getRoomIdentityGenres(room ?? { starterVibe: null, genreChannels: [], channelVibes: {} }),
    [room],
  );
  const heroGenres = useMemo(
    () =>
      activeChannel
        ? [activeChannelVibe ?? "", activeChannel, room?.starterVibe ?? "", ...roomGenres].filter(Boolean)
        : roomGenres,
    [activeChannel, activeChannelVibe, room?.starterVibe, roomGenres],
  );
  const roomTimelineEntries = useMemo(() => {
    if (!room) {
      return [];
    }

    return buildRoomHelixTimelineEntries({
      activeChannel,
      room,
      shareItems,
    });
  }, [activeChannel, room, shareItems]);
  const previewGenres = useMemo(
    () => buildHelixPreviewGenres(roomTimelineEntries, heroGenres),
    [heroGenres, roomTimelineEntries],
  );
  const activeChannelItems = useMemo(
    () =>
      activeChannel
        ? shareItems.filter(
            (item) => normalizeValue(item.channel) === normalizeValue(activeChannel),
          )
        : [],
    [activeChannel, shareItems],
  );
  const previewItems = useMemo(() => {
    const musicItems = activeChannelItems.filter(
      (item) => item.kind === "song" || item.kind === "artist",
    );
    const sourceItems = musicItems.length ? musicItems : activeChannelItems;

    return sourceItems.slice(0, ROOM_PREVIEW_VISIBLE_ITEMS);
  }, [activeChannelItems]);
  async function handleCreateChannel(channel: { name: string; vibe?: string }) {
    const createdChannel = await createRoomChannel(roomId, channel);
    setPreferredChannel(createdChannel);
  }

  async function handleAddShareItem(draft: {
    kind: RoomShareItem["kind"];
    title: string;
    subtitle?: string | null;
    url?: string | null;
    note?: string | null;
  }) {
    if (!activeChannel) {
      throw new Error("Choose a channel first.");
    }

    if (!user && !profile?.uid) {
      throw new Error("Sign in again before sharing.");
    }

    setChannelActionError(null);

    await addRoomShareItem({
      roomId,
      channel: activeChannel,
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
      setChannelActionError("Sign in again before removing a drop.");
      return;
    }

    setChannelActionError(null);
    setRemovingItemId(item.id);

    try {
      await removeRoomShareItem({
        roomId,
        itemId: item.id,
        removedBy: currentUserId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "That drop could not be removed.";
      setChannelActionError(message);
      console.error("[frequency][room-share]", {
        event: "room_share_item_remove_failed",
        roomId,
        itemId: item.id,
        error: message,
      });
    } finally {
      setRemovingItemId((current) => (current === item.id ? null : current));
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
    <div className="space-y-5">
      <Link
        className="button-secondary inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium"
        href="/rooms"
      >
        <ArrowLeft className="size-4" />
        Back to rooms
      </Link>

      <div className="grid gap-5 xl:grid-cols-[288px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <RoomChannelSidebar
            channels={room.genreChannels}
            channelVibes={room.channelVibes}
            memberCountLabel={formatCount(room.memberIds.length, "member")}
            onCreateChannel={handleCreateChannel}
            onSelectChannel={setPreferredChannel}
            roomName={room.name}
            roomVisibilityLabel={getRoomVisibilityLabel(room.visibility)}
            selectedChannel={activeChannel}
            starterVibe={room.starterVibe}
          />
        </div>

        <div className="min-w-0 space-y-4">
          {!activeChannel ? (
            <EmptyStateCard
              body="Create the first channel from the sidebar so this room has a place for songs, artists, and links."
              primaryAction="Back to rooms"
              primaryHref="/rooms"
              title="This room needs its first channel"
              visual="rooms"
            />
          ) : (
            <section>
              <div className="grid grid-cols-[minmax(0,1fr)_124px] items-start gap-4 sm:grid-cols-[minmax(0,1fr)_164px] sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] lg:gap-8">
                <div className="min-w-0 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                        Recent additions
                      </p>
                      {previewItems.length ? (
                        <p className="text-[13px] leading-5 text-[var(--text-soft)]">
                          {formatCount(previewItems.length, "drop")} shaping this lane right now.
                        </p>
                      ) : null}
                    </div>

                    <button
                      aria-label={`Add music to ${formatChannelLabel(activeChannel)}`}
                      className="button-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-full"
                      onClick={() => {
                        setChannelActionError(null);
                        setComposerOpen(true);
                      }}
                      type="button"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  <RoomShareFeed
                    activeChannel={activeChannel}
                    canRemoveItem={(item) => {
                      const currentUserId = user?.uid ?? profile?.uid ?? null;
                      if (!currentUserId) {
                        return false;
                      }

                      return item.addedBy === currentUserId || room.createdBy === currentUserId;
                    }}
                    compact
                    items={previewItems}
                    maxVisibleItems={ROOM_PREVIEW_VISIBLE_ITEMS}
                    onRemoveItem={(item) => {
                      void handleRemoveShareItem(item);
                    }}
                    removingItemId={removingItemId}
                    variant="integrated"
                  />

                  {channelActionError ? (
                    <p className="text-[12px] text-[#d78b8b]">{channelActionError}</p>
                  ) : null}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    aria-label={`Open the full helix timeline for ${formatChannelLabel(activeChannel)}`}
                    className="group w-full rounded-[24px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,255,255,0.28)] focus-visible:ring-offset-0"
                    onClick={() => setTimelineOpen(true)}
                    type="button"
                  >
                    <RoomHeroHelix
                      embedded
                      className="ml-auto w-[124px] sm:w-[164px] lg:w-full lg:max-w-[268px]"
                      genres={previewGenres.length ? previewGenres : heroGenres}
                    />
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
      {room && activeChannel ? (
        <HelixTimelineModal
          description={`Newest signals in ${formatChannelLabel(activeChannel)} stay at the top. Scroll downward to trace the older drops shaping this lane.`}
          entries={roomTimelineEntries}
          eyebrow={room.name}
          onClose={() => setTimelineOpen(false)}
          open={timelineOpen}
          title={`${formatChannelLabel(activeChannel)} timeline`}
        />
      ) : null}
      {activeChannel && room ? (
        <RoomShareComposerModal
          channel={activeChannel}
          channelVibe={activeChannelVibe}
          onClose={() => setComposerOpen(false)}
          onSubmit={async (draft) => {
            await handleAddShareItem(draft);
            setComposerOpen(false);
          }}
          open={composerOpen}
          visibility={room.visibility}
        />
      ) : null}
    </div>
  );
}
