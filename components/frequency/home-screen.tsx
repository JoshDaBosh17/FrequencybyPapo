"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/providers/auth-provider";
import { buildHomeGreeting, buildHomeSubtitle } from "@/lib/frequency";
import { observeJoinedRooms } from "@/lib/firebase/firestore";
import type { FrequencyRoom } from "@/lib/types";
import { EmptyStateCard } from "./empty-state-card";
import { CreateRoomDialog } from "./create-room-dialog";
import { GlassCard } from "./glass-card";
import { RoomCard } from "./room-card";
import { StatPill } from "./stat-pill";

export function HomeScreen() {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

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

  return (
    <div className="space-y-5 sm:space-y-6">
      <GlassCard strong className="overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--text)]">
              {buildHomeGreeting(profile)}
            </p>
            <p className="text-[15px] leading-7 text-[var(--text-soft)]">
              {buildHomeSubtitle(profile, rooms)}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(249,243,236,0.8))] p-5">
              <div className="space-y-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  Your state
                </p>
                <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  {rooms.length
                    ? "You have a real social shell now. Rooms are ready, and the rest can grow around them."
                    : "The app is ready. Your first room is the thing that will make it feel alive."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <StatPill>{rooms.length} joined rooms</StatPill>
                  <StatPill>{profile?.favoriteArtists.length ?? 0} favorite artists</StatPill>
                  <StatPill>{profile?.onboardingComplete ? "Onboarding complete" : "Still setting up"}</StatPill>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--line)] bg-white/62 p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                Continue listening
              </p>
              <p className="mt-3 text-[18px] font-semibold text-[var(--text)]">
                Nothing queued yet
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                Playback is still a stub, so this stays intentionally calm until room music becomes real.
              </p>
              <div className="mt-4">
                <Link
                  className="inline-flex min-h-12 items-center rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]"
                  href="/player"
                >
                  Open player shell
                </Link>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {!rooms.length ? (
        <>
          <EmptyStateCard
            body="Create a room for friends, an event, or a shared vibe. The shell is live even before recommendations show up."
            eyebrow="Home"
            onPrimaryAction={() => setCreateOpen(true)}
            primaryAction="Create your first room"
            secondaryAction="Invite friends later"
            title="Your music world starts here."
            visual="music"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <GlassCard className="p-5">
              <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Create your first room
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                Give your taste a place to become social.
              </p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Add favorite artists
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                Your artist signals will make future recommendations sharper.
              </p>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Invite friends later
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
                Rooms still work as a calm personal starting point.
              </p>
            </GlassCard>
          </div>
        </>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Your rooms
            </h2>
            <button
              className="min-h-11 rounded-full border border-[var(--line)] bg-white/70 px-4 text-sm font-medium text-[var(--text-soft)] transition hover:bg-white"
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
    </div>
  );
}
