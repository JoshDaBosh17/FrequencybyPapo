"use client";

import { X } from "lucide-react";

import type { HelixTimelineEntry } from "@/lib/frequency/helix-timeline";
import { HelixTimeline } from "./helix-timeline";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

type HelixTimelineModalProps = {
  open: boolean;
  onClose: () => void;
  entries: HelixTimelineEntry[];
  eyebrow: string;
  title: string;
  description: string;
};

export function HelixTimelineModal({
  open,
  onClose,
  entries,
  eyebrow,
  title,
  description,
}: HelixTimelineModalProps) {
  useModalLock({
    onClose,
    open,
  });

  if (!open) {
    return null;
  }

  return (
    <ModalFrame className="max-w-6xl" closeOnBackdrop onClose={onClose}>
      <div className="shrink-0 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
              {eyebrow}
            </p>
            <h2 className="text-[26px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[30px]">
              {title}
            </h2>
            <p className="max-w-2xl text-[14px] leading-6 text-[var(--text-soft)]">
              {description}
            </p>
          </div>

          <button
            aria-label="Close helix timeline"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ModalBody>
        <HelixTimeline entries={entries} />
      </ModalBody>
    </ModalFrame>
  );
}
