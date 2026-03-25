"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/providers/auth-provider";
import { observeJoinedRooms } from "@/lib/firebase/firestore";
import type { FrequencyRoom } from "@/lib/types";
import { EmptyStateCard } from "./empty-state-card";
import { CreateRoomDialog } from "./create-room-dialog";
import { GlassCard } from "./glass-card";
import { StatPill } from "./stat-pill";

export function RoomsScreen() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

  if (!rooms.length) {
    return (
      <>
        <div className="space-y-5 sm:space-y-6">
          <EmptyStateCard
            body="Create a room for friends, an event, or a shared vibe."
            eyebrow="Rooms"
            onPrimaryAction={() => setCreateOpen(true)}
            primaryAction="Create a room"
            secondaryAction="Join with invite code"
            title="No rooms yet"
            visual="rooms"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <GlassCard className="p-5">
              <p className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Start with a vibe
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                House, Afro House, Rap, Chill, and social layers are seeded by default.
              </p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Make it social later
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                Invite flow can stay lightweight while the room itself becomes real first.
              </p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Let the room grow
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                Songs, activity, and insights can layer in once the foundation exists.
              </p>
            </GlassCard>
          </div>
        </div>
        <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Rooms hub
            </p>
            <h1 className="text-[30px] font-semibold tracking-[-0.05em] text-[var(--text)]">
              Your shared spaces
            </h1>
            <p className="text-[15px] leading-7 text-[var(--text-soft)]">
              Pick a room by mood, people, or what you want the next social layer to become.
            </p>
          </div>
          <button
            className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            Create room
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`}>
              <GlassCard strong className="h-full rounded-[28px] p-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[20px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                        {room.name}
                      </p>
                      <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                        {room.description}
                      </p>
                    </div>
                    <div className="grid size-12 place-items-center rounded-[18px] bg-[rgba(210,157,123,0.18)] text-sm font-semibold text-[var(--text)]">
                      {room.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <StatPill>{room.memberIds.length} members</StatPill>
                    <StatPill>{room.songCount} songs</StatPill>
                  </div>
                  <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                    {room.activitySummary}
                  </p>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
      <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
    </>
  );
}
