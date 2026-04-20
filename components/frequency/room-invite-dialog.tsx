"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ensureRoomInviteFields } from "@/lib/firebase/firestore";
import { buildAbsoluteInviteUrl, buildRoomInvitePath } from "@/lib/frequency/invite-links";
import type { FrequencyRoom } from "@/lib/types";
import { InviteShareActions } from "./invite-share-actions";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function RoomInviteDialog({
  room,
  open,
  onClose,
}: {
  room: FrequencyRoom | null;
  open: boolean;
  onClose: () => void;
}) {
  const [resolvedRoom, setResolvedRoom] = useState<FrequencyRoom | null>(room);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalLock({
    onClose,
    open,
  });

  useEffect(() => {
    setResolvedRoom(room);
  }, [room]);

  useEffect(() => {
    if (!open || !room) {
      return;
    }

    let cancelled = false;
    const activeRoom = room;

    async function hydrateRoomInviteFields() {
      setLoading(true);
      setError(null);

      try {
        const nextRoom = await ensureRoomInviteFields(activeRoom.id);

        if (!cancelled) {
          setResolvedRoom(nextRoom);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "That invite link could not be prepared.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrateRoomInviteFields();

    return () => {
      cancelled = true;
    };
  }, [open, room]);

  const invitePath = useMemo(
    () => buildRoomInvitePath(resolvedRoom?.roomCode ?? null),
    [resolvedRoom?.roomCode],
  );
  const inviteLink = useMemo(() => buildAbsoluteInviteUrl(invitePath), [invitePath]);

  if (!open || !room) {
    return null;
  }

  return (
    <ModalFrame className="max-w-lg" closeOnBackdrop onClose={onClose}>
      <ModalBody className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Invite to Group
            </p>
            <div className="space-y-1">
              <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                Bring someone into {room.name}
              </h2>
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                Share the code or link below. If they’re signed in, they’ll get a one-tap join prompt right away.
              </p>
            </div>
          </div>

          <button
            aria-label="Close room invite"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="surface-inline-soft rounded-[22px] px-4 py-4">
          <p className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            {resolvedRoom?.name ?? room.name}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-[var(--text-soft)]">
            {room.memberIds.length} member{room.memberIds.length === 1 ? "" : "s"}
          </p>
        </div>

        <InviteShareActions
          codeLabel="Room code"
          codeValue={resolvedRoom?.roomCode ?? null}
          linkValue={inviteLink}
          shareText={`Join ${resolvedRoom?.name ?? room.name} on Frequency.`}
          shareTitle={`${resolvedRoom?.name ?? room.name} invite`}
        />

        {loading ? (
          <p className="text-[13px] leading-6 text-[var(--text-faint)]">
            Preparing the latest invite details…
          </p>
        ) : null}
        {error ? (
          <p className="text-[13px] leading-6 text-[#d7a0a0]">{error}</p>
        ) : null}
      </ModalBody>
    </ModalFrame>
  );
}
