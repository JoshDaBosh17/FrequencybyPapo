"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { observeUserProfilesByIds } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { AddFriendDialog } from "./add-friend-dialog";
import { CompareFriendRow } from "./compare-friend-row";
import { CompareHelixModal } from "./compare-helix-modal";

export function CompareScreen() {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);

  useEffect(() => {
    return observeUserProfilesByIds(profile?.friendIds ?? [], setFriends);
  }, [profile?.friendIds]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="section-haze-strong rounded-[32px] px-5 py-5 sm:px-6">
        <div className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Compare
          </p>
          <p className="text-[30px] font-semibold tracking-[-0.05em] text-[var(--text)]">
            Compare with someone
          </p>
          <p className="max-w-2xl text-[15px] leading-7 text-[var(--text-soft)]">
            Keep Compare centered on people. Add friends here, then open a helix view from any friend row.
          </p>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          className="button-secondary inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium"
          onClick={() => setAddFriendOpen(true)}
          type="button"
        >
          <UserPlus className="size-4" />
          Add Friend
        </button>
        <div className="section-divider hidden flex-1 sm:block" />
      </div>

      {friends.length ? (
        <div className="section-haze rounded-[30px] px-3 py-2 sm:px-4 sm:py-3">
          <div className="soft-scrollbar flex max-h-[520px] flex-col divide-y divide-[rgba(255,255,255,0.07)] overflow-y-auto pr-1">
            {friends.map((friend) => (
              <CompareFriendRow
                key={friend.uid}
                friend={friend}
                onClick={() => setSelectedFriend(friend)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="section-haze flex min-h-[240px] items-center justify-center rounded-[30px] p-6 text-center">
          <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            No friends added
          </p>
        </div>
      )}

      <AddFriendDialog onClose={() => setAddFriendOpen(false)} open={addFriendOpen} />
      <CompareHelixModal
        currentProfile={profile}
        friendProfile={selectedFriend}
        onClose={() => setSelectedFriend(null)}
        open={Boolean(selectedFriend)}
      />
    </div>
  );
}
