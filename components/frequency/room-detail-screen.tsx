"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/providers/auth-provider";
import { PLACEHOLDER_ROOM_SONGS, PLACEHOLDER_ROOM_TRENDS } from "@/lib/frequency";
import { observeRoom } from "@/lib/firebase/firestore";
import type { ChannelId, FrequencyRoom } from "@/lib/types";
import { ChannelList } from "./channel-list";
import { EmptyStateCard } from "./empty-state-card";
import { GlassCard } from "./glass-card";
import { RoomHeroCard } from "./room-hero-card";
import { SongRow } from "./song-row";
import { TrendCard } from "./trend-card";

const channelTree: Array<{
  id: ChannelId;
  label: string;
  children?: Array<{ id: ChannelId; label: string }>;
}> = [
  { id: "overview", label: "Overview" },
  {
    id: "house",
    label: "Genres",
    children: [
      { id: "house", label: "House" },
      { id: "afro-house", label: "Afro House" },
      { id: "rap", label: "Rap" },
      { id: "chill", label: "Chill" },
    ],
  },
  { id: "people", label: "People" },
  { id: "songs", label: "Songs" },
  { id: "insights", label: "Insights" },
];

export function RoomDetailScreen({ roomId }: { roomId: string }) {
  const { profile } = useAuth();
  const [room, setRoom] = useState<FrequencyRoom | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelId>("overview");

  useEffect(() => observeRoom(roomId, setRoom), [roomId]);

  if (!room) {
    return (
      <GlassCard strong className="rounded-[28px] p-6">
        <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
          Opening room
        </p>
      </GlassCard>
    );
  }

  if (!profile || !room.memberIds.includes(profile.uid)) {
    return (
      <EmptyStateCard
        body="You need to be part of this room before we can show the full room experience."
        primaryAction="Go to rooms"
        primaryHref="/rooms"
        title="This room is not open to you yet"
        visual="rooms"
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <GlassCard className="hidden p-4 lg:block">
          <div className="space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
              Room channels
            </p>
            <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Keep the structure in place while activity and songs grow in.
            </p>
          </div>
        </GlassCard>
        <ChannelList channels={channelTree} onChange={setSelectedChannel} value={selectedChannel} />
      </div>

      <div className="space-y-4">
        <RoomHeroCard profile={profile} room={room} />

        <GlassCard strong className="rounded-[28px] p-5 sm:p-6">
          <div className="space-y-3">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              {selectedChannel === "overview"
                ? "Room overview"
                : selectedChannel === "songs"
                  ? "Songs"
                  : selectedChannel === "people"
                    ? "People"
                    : selectedChannel === "insights"
                      ? "Insights"
                      : `${selectedChannel.replace("-", " ")} channel`}
            </p>
            <p className="text-[15px] leading-7 text-[var(--text-soft)]">
              {selectedChannel === "insights"
                ? "Insights stay intentionally stubbed until shared listening data becomes real."
                : room.activitySummary}
            </p>
          </div>
        </GlassCard>

        {selectedChannel === "people" ? (
          <GlassCard className="p-5">
            <p className="text-[16px] font-semibold text-[var(--text)]">
              {room.memberIds.length} members in this room
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
              Invite links are coming next. For now, the creator is stored and membership is checked against Firestore.
            </p>
          </GlassCard>
        ) : null}

        {selectedChannel === "insights" ? (
          <EmptyStateCard
            body="The shell is ready for insights, but advanced room math can wait until the real music layer arrives."
            primaryAction="Open player"
            primaryHref="/player"
            secondaryAction="Back to rooms"
            secondaryHref="/rooms"
            title="Insights will get smarter as rooms fill up"
            visual="insights"
          />
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  What is changing here
                </h2>
                <Link
                  className="text-sm font-medium text-[var(--text-soft)]"
                  href="/player"
                >
                  Player stub
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {PLACEHOLDER_ROOM_TRENDS.map((trend) => (
                  <TrendCard key={trend.id} trend={trend} />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Songs
              </h2>
              <div className="space-y-3">
                {PLACEHOLDER_ROOM_SONGS.map((song) => (
                  <SongRow key={song.id} affordance="chevron" song={song} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
