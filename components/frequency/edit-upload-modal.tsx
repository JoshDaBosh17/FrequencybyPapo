"use client";

import { useMemo } from "react";
import { Pencil, X } from "lucide-react";

import type { RoomShareSubmitDraft } from "@/lib/frequency/room-share";
import type { SongActivityItem } from "@/lib/frequency/song-activity";
import { ModalBody, ModalFrame } from "./modal-frame";
import { RoomShareComposer } from "./room-share-composer";
import { useModalLock } from "./use-modal-lock";

function buildInitialDraft(item: SongActivityItem): RoomShareSubmitDraft {
  return {
    artworkUrl: item.rawItem.artworkUrl ?? null,
    kind: item.rawItem.kind,
    links: item.rawItem.links ?? null,
    note: item.rawItem.note ?? null,
    resolvedArtist: item.rawItem.resolvedArtist ?? null,
    resolvedTrack: item.rawItem.resolvedTrack ?? null,
    sourcePlatform: item.rawItem.sourcePlatform ?? null,
    subtitle: item.rawItem.subtitle ?? null,
    title: item.rawItem.title,
    url: item.rawItem.url ?? null,
  };
}

export function EditUploadModal({
  item,
  onClose,
  onSubmit,
}: {
  item: SongActivityItem | null;
  onClose: () => void;
  onSubmit: (draft: RoomShareSubmitDraft) => Promise<void>;
}) {
  const initialDraft = useMemo(() => (item ? buildInitialDraft(item) : null), [item]);

  useModalLock({
    onClose,
    open: Boolean(item),
  });

  if (!item || !initialDraft) {
    return null;
  }

  return (
    <ModalFrame className="max-w-3xl" closeOnBackdrop onClose={onClose}>
      <div className="shrink-0 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Edit upload
            </p>
            <div className="space-y-1">
              <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[28px]">
                Update {item.title}
              </h2>
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                Adjust the title, artist, link, or comment while keeping reactions and timeline order intact.
              </p>
            </div>
          </div>

          <button
            aria-label="Close edit upload"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ModalBody className="space-y-5">
        <RoomShareComposer
          channel={item.roomName ?? "collection"}
          channelVibe={item.contextLabel}
          initialDraft={initialDraft}
          mode="edit"
          onSubmit={async (draft) => {
            await onSubmit(draft);
            onClose();
          }}
          pendingLabel="Saving"
          showHeader={false}
          submitLabel="Save changes"
          visibility="personal"
        />
        <div className="surface-pill inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-[11px] font-medium text-[var(--text-soft)]">
          <Pencil className="size-3.5" />
          Only your own uploads can be edited.
        </div>
      </ModalBody>
    </ModalFrame>
  );
}
