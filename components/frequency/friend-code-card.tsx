"use client";

import { buildAbsoluteInviteUrl, buildFriendInvitePath } from "@/lib/frequency/invite-links";
import { getFriendCodeCopyValue } from "@/lib/frequency/friend-code";
import { cn } from "@/lib/utils";
import { InviteShareActions } from "./invite-share-actions";

export function FriendCodeCard({
  friendCode,
  title,
  description,
  className,
}: {
  friendCode: string | null | undefined;
  title: string;
  description: string;
  className?: string;
}) {
  const formattedFriendCode = getFriendCodeCopyValue(friendCode) || null;
  const invitePath = buildFriendInvitePath(formattedFriendCode);
  const inviteLink = buildAbsoluteInviteUrl(invitePath);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
            {title}
          </p>
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">{description}</p>
        </div>
        <InviteShareActions
          codeLabel={title}
          codeValue={formattedFriendCode}
          linkValue={inviteLink}
          shareText="Add me on Frequency."
          shareTitle="Frequency friend invite"
        />
      </div>
    </div>
  );
}
