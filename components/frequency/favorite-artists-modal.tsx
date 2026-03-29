"use client";

import { GlassCard } from "./glass-card";
import { FavoriteArtistsList } from "./favorite-artists-list";

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
  if (!open) {
    return null;
  }

  return (
    <div className="modal-scrim fixed inset-0 z-40 flex items-center justify-center px-4 py-8 backdrop-blur-sm">
      <GlassCard strong className="flex max-h-[78vh] w-full max-w-xl flex-col rounded-[32px] p-6 sm:p-7">
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

        <div className="mt-5 overflow-y-auto pr-1">
          <FavoriteArtistsList entries={entries} primaryGenresByArtist={primaryGenresByArtist} />
        </div>
      </GlassCard>
    </div>
  );
}
