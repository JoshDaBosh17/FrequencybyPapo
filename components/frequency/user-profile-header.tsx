import Image from "next/image";

import type { UserProfile } from "@/lib/types";
import { formatCount, getAvatarTone, getInitials } from "@/lib/utils";
import { StatPill } from "./stat-pill";

export function UserProfileHeader({
  profile,
  roomCount,
}: {
  profile: UserProfile;
  roomCount: number;
}) {
  const initials = getInitials(profile.displayName);
  const tone = getAvatarTone(profile.uid);

  return (
    <section className="section-haze-strong relative overflow-hidden rounded-[32px] px-5 py-5 sm:px-6 sm:py-6">
      <div className="absolute inset-x-8 top-0 h-16 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_72%)] blur-3xl" />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {profile.photoURL ? (
              <Image
                alt={profile.displayName ?? "Profile"}
                className="size-16 rounded-full object-cover"
                height={64}
                src={profile.photoURL}
                width={64}
              />
            ) : (
              <div
                className="grid size-16 place-items-center rounded-full text-lg font-semibold text-white"
                style={{ backgroundColor: tone }}
              >
                {initials}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[26px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                {profile.displayName ?? "Frequency listener"}
              </p>
              <p className="text-[14px] text-[var(--text-soft)]">{profile.email ?? "Signed in"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatPill>{formatCount(roomCount, "room")}</StatPill>
            <StatPill>{formatCount(profile.favoriteArtists.length, "favorite artist")}</StatPill>
          </div>
        </div>

        <div className="section-divider" />
      </div>
    </section>
  );
}
