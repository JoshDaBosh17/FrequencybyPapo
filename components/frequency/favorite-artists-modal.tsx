"use client";

import { FavoriteArtistsList } from "./favorite-artists-list";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function FavoriteArtistsModal({
  open,
  onClose,
  entries,
  primaryGenresByArtist,
}: {
  open: boolean;
  onClose: () => void;
  entries: Array<{ artist: string; addedAt: string }>;
  primaryGenresByArtist: Map<string, string | null>;
}) {
  useModalLock({
    onClose,
    open,
  });

  if (!open) {
    return null;
  }

  return (
    <ModalFrame className="max-w-xl" onClose={onClose}>
      <div className="shrink-0 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Favorite artists
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[26px] font-semibold tracking-[-0.04em] text-[var(--text)]">
              All recent artists
            </p>
            <button
              className="button-secondary min-h-10 rounded-full px-4 text-sm font-medium"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">
            Your full artist timeline, kept in newest-first order so it matches the helix.
          </p>
        </div>
      </div>

      <ModalBody className="pr-1">
        <FavoriteArtistsList entries={entries} primaryGenresByArtist={primaryGenresByArtist} />
      </ModalBody>
    </ModalFrame>
  );
}
