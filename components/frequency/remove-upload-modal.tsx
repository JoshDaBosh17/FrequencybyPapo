"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import type { SongActivityItem } from "@/lib/frequency/song-activity";
import { GlassCard } from "./glass-card";

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
  useEffect(() => {
    if (!item) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose, pending]);

  if (!item) {
    return null;
  }

  const resolvedDescription =
    description ??
    `Remove ${item.title} by ${item.artist} from your uploads?`;

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-md"
      onClick={() => {
        if (!pending) {
          onClose();
        }
      }}
    >
      <GlassCard
        strong
        className="w-full max-w-md rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,20,0.98),rgba(6,8,13,0.98))] p-5 shadow-[0_36px_90px_rgba(0,0,0,0.48)] sm:p-6"
      >
        <div
          className="space-y-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
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
        </div>
      </GlassCard>
    </div>
  );
}
