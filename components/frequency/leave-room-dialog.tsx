"use client";

import { X } from "lucide-react";

import type { FrequencyRoom } from "@/lib/types";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function LeaveRoomDialog({
  room,
  onClose,
  onConfirm,
  pending = false,
}: {
  room: FrequencyRoom | null;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  useModalLock({
    closeOnEscape: !pending,
    onClose,
    open: Boolean(room),
  });

  if (!room) {
    return null;
  }

  return (
    <ModalFrame className="max-w-md" closeOnBackdrop={!pending} onClose={onClose}>
      <ModalBody className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Leave Group
            </p>
            <div className="space-y-1">
              <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                Are you sure?
              </h2>
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                Leave {room.name}? You’ll lose it from your recent rooms until someone invites you back.
              </p>
            </div>
          </div>

          <button
            aria-label="Close leave room"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3 disabled:opacity-50"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            className="button-secondary min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-60"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button-primary min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-60"
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {pending ? "Leaving" : "Leave Group"}
          </button>
        </div>
      </ModalBody>
    </ModalFrame>
  );
}
