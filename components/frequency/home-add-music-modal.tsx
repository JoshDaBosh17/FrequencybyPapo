"use client";

import { X } from "lucide-react";

import type { RoomShareSubmitDraft } from "@/lib/frequency/room-share";
import { ModalBody, ModalFrame } from "./modal-frame";
import { RoomShareComposer } from "./room-share-composer";
import { useModalLock } from "./use-modal-lock";

type HomeAddMusicModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: RoomShareSubmitDraft) => Promise<void>;
};

export function HomeAddMusicModal({
  open,
  onClose,
  onSubmit,
}: HomeAddMusicModalProps) {
  useModalLock({
    onClose,
    open,
  });

  if (!open) {
    return null;
  }

  return (
    <ModalFrame className="max-w-3xl" closeOnBackdrop onClose={onClose}>
      <div className="shrink-0 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Add music
            </p>
            <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[28px]">
              Save to your collection
            </h2>
          </div>

          <button
            aria-label="Close add music"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ModalBody className="space-y-5">
        <RoomShareComposer
          channel="collection"
          onSubmit={async (draft) => {
            await onSubmit(draft);
            onClose();
          }}
          showHeader={false}
          visibility="personal"
        />
      </ModalBody>
    </ModalFrame>
  );
}
