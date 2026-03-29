"use client";

import { GlassCard } from "./glass-card";

export function SongCorrectionModal({
  open,
  originalTitle,
  originalArtist,
  canonicalTitle,
  canonicalArtist,
  pending,
  onConfirm,
  onReject,
}: {
  open: boolean;
  originalTitle: string;
  originalArtist: string;
  canonicalTitle: string;
  canonicalArtist: string;
  pending?: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-scrim fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 backdrop-blur-sm">
      <GlassCard strong className="w-full max-w-md rounded-[32px] p-6 sm:p-7">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Song check
            </p>
            <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[var(--text)]">
              Is this the song you meant?
            </h2>
            <div className="surface-inline-soft rounded-[24px] p-4">
              <div className="space-y-1">
                <p className="text-[18px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                  {canonicalTitle}
                </p>
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  {canonicalArtist}
                </p>
              </div>
            </div>
            <p className="text-[15px] leading-6 text-[var(--text-soft)]">
              We found a likely match for “{originalTitle}” by {originalArtist}. Confirm it before we add the song.
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
        </div>
      </GlassCard>
    </div>
  );
}
