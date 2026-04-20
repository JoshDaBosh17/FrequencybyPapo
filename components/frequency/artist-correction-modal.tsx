"use client";

import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function ArtistCorrectionModal({
  open,
  originalArtist,
  canonicalArtist,
  pending,
  onConfirm,
  onReject,
}: {
  open: boolean;
  originalArtist: string;
  canonicalArtist: string;
  pending?: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  useModalLock({
    open,
  });

  if (!open) {
    return null;
  }

  return (
    <ModalFrame className="max-w-md" overlayClassName="z-50">
      <ModalBody className="space-y-5 px-6 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Artist check
          </p>
          <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[var(--text)]">
            Did you mean {canonicalArtist}?
          </h2>
          <p className="text-[15px] leading-6 text-[var(--text-soft)]">
            We found a high-confidence match for “{originalArtist}”. Confirm it before we save your artists.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium disabled:opacity-70"
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            Yes
          </button>
          <button
            className="button-secondary min-h-12 rounded-full px-5 text-[15px] font-medium"
            disabled={pending}
            onClick={onReject}
            type="button"
          >
            No, I&apos;ll edit it
          </button>
        </div>
      </ModalBody>
    </ModalFrame>
  );
}
