"use client";

import { X } from "lucide-react";

import type { SongActivityItem } from "@/lib/frequency/song-activity";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function RemoveUploadModal({
  item,
  onClose,
  onConfirm,
  title = "Are you sure?",
  eyebrow = "Remove upload",
  description,
  confirmLabel = "Remove",
  closeLabel = "Close remove upload",
  pending = false,
}: {
  item: SongActivityItem | null;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  eyebrow?: string;
  description?: string;
  confirmLabel?: string;
  closeLabel?: string;
  pending?: boolean;
}) {
  useModalLock({
    closeOnEscape: !pending,
    onClose,
    open: Boolean(item),
  });

  if (!item) {
    return null;
  }

  const resolvedDescription =
    description ??
    `Remove ${item.title} by ${item.artist} from your uploads?`;

  return (
    <ModalFrame
      className="max-w-md"
      closeOnBackdrop={!pending}
      onClose={onClose}
    >
      <ModalBody className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              {eyebrow}
            </p>
            <div className="space-y-1">
              <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                {title}
              </h2>
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                {resolvedDescription}
              </p>
            </div>
          </div>

          <button
            aria-label={closeLabel}
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
            {pending ? "Removing" : confirmLabel}
          </button>
        </div>
      </ModalBody>
    </ModalFrame>
  );
}
