"use client";

import { useState } from "react";

import type { FrequencyRoom, UserProfile } from "@/lib/types";
import { buildRoomDescriptor } from "@/lib/frequency";
import { formatCount, getAvatarTone, getInitials } from "@/lib/utils";
import { AvatarStack } from "./avatar-stack";
import { GlassCard } from "./glass-card";
import { InviteStubDialog } from "./invite-stub-dialog";
import { StatPill } from "./stat-pill";

export function RoomHeroCard({
  room,
  profile,
}: {
  room: FrequencyRoom;
  profile: UserProfile;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

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
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="grid size-14 place-items-center rounded-[20px] text-sm font-semibold text-white"
                style={{ backgroundColor: getAvatarTone(room.id) }}
              >
                {getInitials(room.name)}
              </div>
              <div>
                <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                  {room.name}
                </p>
                <p className="text-[15px] leading-6 text-[var(--text-soft)]">{room.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AvatarStack people={people} />
              <StatPill>{buildRoomDescriptor(room)}</StatPill>
              <StatPill>{formatCount(room.memberIds.length, "member")}</StatPill>
              <StatPill>{formatCount(room.songCount, "song")}</StatPill>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[22px] border border-[var(--line)] bg-white/62 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  Room mood
                </p>
                <p className="mt-2 text-[15px] leading-6 text-[var(--text-soft)]">
                  {room.activitySummary}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--line)] bg-white/62 p-4">
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
              className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white"
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
