"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import type { HelixTimelineEntry } from "@/lib/frequency/helix-timeline";
import { GlassCard } from "./glass-card";
import { HelixTimeline } from "./helix-timeline";

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
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <GlassCard
        strong
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,20,0.98),rgba(6,8,13,0.98))] shadow-[0_36px_90px_rgba(0,0,0,0.48)]"
      >
        <div
          className="flex min-h-0 flex-col"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
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

          <div className="soft-scrollbar overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <HelixTimeline entries={entries} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
