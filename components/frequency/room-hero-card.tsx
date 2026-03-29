"use client";

import { useState } from "react";

import type { FrequencyRoom, UserProfile } from "@/lib/types";
import { buildRoomDescriptor } from "@/lib/frequency";
import {
  getRoomIdentityGenres,
  getRoomVisibilityLabel,
} from "@/lib/frequency/room-identity";
import { formatCount, getAvatarTone, getInitials } from "@/lib/utils";
import { AvatarStack } from "./avatar-stack";
import { GlassCard } from "./glass-card";
import { InviteStubDialog } from "./invite-stub-dialog";
import { RoomIdentityHelix } from "./room-identity-helix";
import { StatPill } from "./stat-pill";

export function RoomHeroCard({
  room,
  profile,
}: {
  room: FrequencyRoom;
  profile: UserProfile;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const identityGenres = getRoomIdentityGenres(room);

  const people = room.memberIds.slice(0, 4).map((memberId, index) => {
    const isCurrentUser = memberId === profile.uid;
    const name = isCurrentUser ? profile.displayName ?? "You" : `Member ${index + 1}`;

    return {
      id: memberId,
      name,
      initials: getInitials(name),
      color: getAvatarTone(memberId),
    };
  });

  return (
    <>
      <GlassCard strong className="min-h-[120px] rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <RoomIdentityHelix className="h-[132px] w-[118px] shrink-0" genres={identityGenres} />
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-soft)]">
                    {getRoomVisibilityLabel(room.visibility)}
                  </span>
                  {room.starterVibe ? (
                    <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-soft)]">
                      {room.starterVibe}
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {room.name}
                  </p>
                  <p className="text-[15px] leading-6 text-[var(--text-soft)]">{room.description}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AvatarStack people={people} />
              <StatPill>{buildRoomDescriptor(room)}</StatPill>
              <StatPill>{formatCount(room.memberIds.length, "member")}</StatPill>
              <StatPill>{formatCount(room.songCount, "drop")}</StatPill>
              <StatPill>{formatCount(identityGenres.length, "helix cue")}</StatPill>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
              <div className="surface-inline-soft rounded-[22px] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  Room mood
                </p>
                <p className="mt-2 text-[15px] leading-6 text-[var(--text-soft)]">
                  {room.activitySummary}
                </p>
              </div>
              <div className="surface-inline-soft rounded-[22px] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  Channels
                </p>
                <p className="mt-2 text-[15px] leading-6 text-[var(--text-soft)]">
                  {room.genreChannels.join(" • ")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium"
              onClick={() => setInviteOpen(true)}
              type="button"
            >
              Invite
            </button>
          </div>
        </div>
      </GlassCard>

      <InviteStubDialog onClose={() => setInviteOpen(false)} open={inviteOpen} />
    </>
  );
}
