"use client";

import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function InviteStubDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useModalLock({
    onClose,
    open,
  });

  if (!open) {
    return null;
  }

  return (
    <ModalFrame className="max-w-md" onClose={onClose}>
      <ModalBody className="space-y-4 px-6 pb-6 pt-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
          Invite
        </p>
        <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
          Invite links are coming next.
        </p>
        <p className="text-[15px] leading-6 text-[var(--text-soft)]">
          The room is ready. Shareable invite flows are the next layer we&apos;ll add.
        </p>
        <button
          className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </ModalBody>
    </ModalFrame>
  );
}
