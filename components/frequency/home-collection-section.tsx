"use client";

import { Maximize2, X } from "lucide-react";

import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import type { SongActivityItem } from "@/lib/frequency/song-activity";
import { ModalBody, ModalFrame } from "./modal-frame";
import { RoomSongLibrary } from "./room-song-library";
import { useModalLock } from "./use-modal-lock";

type HomeCollectionSectionProps = {
  items: SongActivityItem[];
  onExpand: () => void;
  onSelectItem: (item: SongActivityItem) => void;
};

type HomeCollectionModalProps = {
  items: SongActivityItem[];
  onClose: () => void;
  onSelectItem: (item: SongActivityItem) => void;
  open: boolean;
};

const COLLECTION_GROUP_COPY = {
  genre: "Grouped by the genre attached to each saved song.",
  day: "Grouped by the exact day songs entered your collection.",
  month: "Grouped into broader monthly chapters from your collection.",
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

export function HomeCollectionSection({
  items,
  onExpand,
  onSelectItem,
}: HomeCollectionSectionProps) {
  const previewItems = items.slice(0, 4);

  return (
    <section className="space-y-5 px-1">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            Your Collection
          </h2>
          <p className="max-w-[28rem] text-[13px] leading-5 text-[var(--text-soft)]">
            Songs you&apos;ve saved or picked up from your groups, ready to organize by genre, day, or month.
          </p>
        </div>

        <button
          className="button-secondary inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-full px-3.5 text-xs font-medium"
          onClick={onExpand}
          type="button"
        >
          <Maximize2 className="size-3.5" />
          Expand
        </button>
      </div>

      {previewItems.length ? (
        <div className="-mx-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-full gap-3 px-1">
            {previewItems.map((item) => {
              const artist = normalizeText(item.artist) ?? "Unknown artist";
              const accent = getGenreColor(item.primaryGenre ?? item.visualAccentKey);

              return (
                <button
                  key={item.id}
                  className="group relative min-w-[184px] flex-1 rounded-[24px] border border-[var(--line)] bg-[rgba(12,15,23,0.78)] px-4 py-[18px] text-left transition hover:border-[var(--line-strong)] hover:bg-[rgba(15,19,29,0.9)] sm:min-w-[196px]"
                  onClick={() => onSelectItem(item)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-4 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${withAlpha(
                        accent,
                        0.9,
                      )}, transparent)`,
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: accent, boxShadow: `0 0 16px ${withAlpha(accent, 0.5)}` }}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                      {item.primaryGenre ?? "frequency"}
                    </span>
                  </div>
                  <div className="mt-3.5 space-y-1.5">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--text)]">
                      {item.title}
                    </p>
                    <p className="line-clamp-1 text-[13px] text-[var(--text-soft)]">{artist}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="surface-inline-soft rounded-[24px] px-4 py-[18px]">
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">
            Songs you save or add through your groups will collect here.
          </p>
        </div>
      )}
    </section>
  );
}

export function HomeCollectionModal({
  items,
  onClose,
  onSelectItem,
  open,
}: HomeCollectionModalProps) {
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Collection
            </p>
            <div className="space-y-1.5">
              <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[28px]">
                Your Collection
              </h2>
              <p className="max-w-2xl text-[14px] leading-6 text-[var(--text-soft)]">
                Browse saved songs and group songs connected to you with compact grouping by genre, day, or month.
              </p>
            </div>
          </div>
          <button
            aria-label="Close collection"
            className="button-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-full"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ModalBody className="space-y-6">
        <RoomSongLibrary
          descriptionByMode={COLLECTION_GROUP_COPY}
          emptyBody="Songs you save or add through your groups will collect here, then become sortable by genre, day, and month."
          emptyTitle="No saved songs yet"
          items={items}
          onSelectItem={onSelectItem}
          title="Organized Collection"
        />
      </ModalBody>
    </ModalFrame>
  );
}
