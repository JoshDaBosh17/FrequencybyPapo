"use client";

import { X } from "lucide-react";

import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function InviteAcceptanceDialog({
  open,
  onClose,
  eyebrow,
  title,
  description,
  detailLabel,
  detailValue,
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  description: string;
  detailLabel?: string;
  detailValue?: string | null;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  useModalLock({
    closeOnEscape: !pending,
    onClose,
    open,
  });

  if (!open) {
    return null;
  }

  return (
    <ModalFrame className="max-w-md" closeOnBackdrop={!pending} onClose={onClose}>
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
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">{description}</p>
            </div>
          </div>

          <button
            aria-label={`Close ${eyebrow.toLowerCase()}`}
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3 disabled:opacity-50"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {detailLabel && detailValue ? (
          <div className="surface-inline-soft rounded-[20px] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              {detailLabel}
            </p>
            <p className="mt-1 text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              {detailValue}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            className="button-secondary min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-60"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="button-primary min-h-11 rounded-full px-4 text-sm font-medium disabled:opacity-60"
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {pending ? "Working" : confirmLabel}
          </button>
        </div>
      </ModalBody>
    </ModalFrame>
  );
}
