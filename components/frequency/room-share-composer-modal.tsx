"use client";

import { Globe2, Lock, Music4, X } from "lucide-react";

import { IS_FREQUENCY_DEMO_MODE } from "@/lib/frequency/demo-mode";
import type { RoomShareSubmitDraft } from "@/lib/frequency/room-share";
import { ModalBody, ModalFrame } from "./modal-frame";
import { RoomShareComposer } from "./room-share-composer";
import { useModalLock } from "./use-modal-lock";

export function RoomShareComposerModal({
  open,
  onClose,
  roomName,
  visibility,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  roomName?: string | null;
  visibility: "personal" | "public";
  onSubmit: (draft: RoomShareSubmitDraft) => Promise<void>;
}) {
  useModalLock({
    onClose,
    open,
  });

  if (!open) {
    return null;
  }

  return (
    <ModalFrame
      className={`max-w-3xl ${
        IS_FREQUENCY_DEMO_MODE
          ? "border-white/12 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.72)]"
          : ""
      }`}
      closeOnBackdrop
      onClose={onClose}
    >
      <div className="shrink-0 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                Add music
              </p>
              <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[28px]">
                {roomName ? `Add to ${roomName}` : "Add to this room"}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-[var(--text-soft)]">
                {visibility === "public" ? (
                  <Globe2 className="size-3.5" />
                ) : (
                  <Lock className="size-3.5" />
                )}
                {visibility === "public" ? "Shareable room" : "Private room"}
              </span>
              {roomName ? (
                <span className="surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-[var(--text-soft)]">
                  <Music4 className="size-3.5" />
                  {roomName}
                </span>
              ) : null}
            </div>
          </div>

          <button
            aria-label={roomName ? `Close add music for ${roomName}` : "Close add music"}
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ModalBody>
        <RoomShareComposer
          channel="room"
          channelVibe={roomName}
          onSubmit={onSubmit}
          showHeader={false}
          visibility={visibility}
        />
      </ModalBody>
    </ModalFrame>
  );
}
