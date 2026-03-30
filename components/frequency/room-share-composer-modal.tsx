"use client";

import { useEffect } from "react";
import { Globe2, Lock, Music4, X } from "lucide-react";

import type { RoomShareItem } from "@/lib/types";
import { GlassCard } from "./glass-card";
import { RoomShareComposer } from "./room-share-composer";

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
  onSubmit: (draft: {
    kind: RoomShareItem["kind"];
    title: string;
    subtitle?: string | null;
    url?: string | null;
    note?: string | null;
  }) => Promise<void>;
}) {
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
        className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,20,0.98),rgba(6,8,13,0.98))] p-5 shadow-[0_36px_90px_rgba(0,0,0,0.48)] sm:p-6"
      >
        <div
          className="space-y-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
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

          <RoomShareComposer
            channel="room"
            channelVibe={roomName}
            onSubmit={onSubmit}
            showHeader={false}
            visibility={visibility}
          />
        </div>
      </GlassCard>
    </div>
  );
}
