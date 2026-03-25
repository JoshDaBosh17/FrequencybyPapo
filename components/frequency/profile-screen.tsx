"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { observeJoinedRooms } from "@/lib/firebase/firestore";
import type { FrequencyRoom } from "@/lib/types";
import { EmptyStateCard } from "./empty-state-card";
import { GlassCard } from "./glass-card";
import { UserProfileHeader } from "./user-profile-header";

export function ProfileScreen() {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-5">
      <UserProfileHeader profile={profile} roomCount={rooms.length} />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCard className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Favorite artists
            </p>
            {profile.favoriteArtists.length ? (
              <div className="flex flex-wrap gap-3">
                {profile.favoriteArtists.map((artist) => (
                  <span
                    key={artist}
                    className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-[14px] text-[var(--text-soft)]"
                  >
                    {artist}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                No favorite artists saved yet. The profile still works gracefully while your taste layer is light.
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Room presence
            </p>
            <p className="text-[15px] leading-7 text-[var(--text-soft)]">
              You&apos;ve joined {rooms.length} room{rooms.length === 1 ? "" : "s"} so far.
            </p>
            <p className="text-[14px] leading-6 text-[var(--text-soft)]">
              More profile depth can layer in later. For now, this is connected to your real auth identity and Firestore profile.
            </p>
          </div>
        </GlassCard>
      </div>

      {!rooms.length ? (
        <EmptyStateCard
          body="Create your first room and your profile immediately becomes more social."
          primaryAction="Go to rooms"
          primaryHref="/rooms"
          title="No joined rooms yet"
          visual="rooms"
        />
      ) : null}
    </div>
  );
}
