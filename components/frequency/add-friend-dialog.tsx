"use client";

import { GlassCard } from "./glass-card";

export function AddFriendDialog({
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
    <div className="modal-scrim fixed inset-0 z-40 flex items-center justify-center px-4 py-8 backdrop-blur-sm">
      <GlassCard strong className="w-full max-w-md rounded-[30px] p-6">
        <div className="space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Add friend
          </p>
          <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
            Friend add flow is coming next.
          </p>
          <p className="text-[15px] leading-6 text-[var(--text-soft)]">
            This button is now the main entry point for adding friends. We&apos;ll wire the real search or request flow into it next.
          </p>
          <button
            className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium"
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
