"use client";

import { GlassCard } from "./glass-card";

export function InviteStubDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(32,29,26,0.24)] px-4 py-8 backdrop-blur-sm">
      <GlassCard strong className="w-full max-w-md rounded-[30px] p-6">
        <div className="space-y-4">
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
            className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
