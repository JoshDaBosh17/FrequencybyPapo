"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { getAvatarTone, getInitials } from "@/lib/utils";

export function CompareFriendRow({
  friend,
  onClick,
}: {
  friend: Pick<UserProfile, "uid" | "displayName" | "photoURL">;
  onClick: () => void;
}) {
  const initials = getInitials(friend.displayName);
  const avatarTone = getAvatarTone(friend.uid);

  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-[20px] px-2 py-3 text-left transition duration-200 hover:bg-[rgba(255,255,255,0.04)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,255,255,0.18)]"
      onClick={onClick}
      type="button"
    >
      <div className="flex min-w-0 items-center gap-3">
        {friend.photoURL ? (
          <Image
            alt={friend.displayName ?? "Friend"}
            className="size-12 rounded-full object-cover"
            height={48}
            src={friend.photoURL}
            width={48}
          />
        ) : (
          <div
            className="grid size-12 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: avatarTone }}
          >
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[var(--text)]">
            {friend.displayName ?? "Frequency listener"}
          </p>
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-[var(--text-faint)]" />
    </button>
  );
}
