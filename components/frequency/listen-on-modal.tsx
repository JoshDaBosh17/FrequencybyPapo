"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";

import type { RoomSharePlatformLinks } from "@/lib/types";
import { GlassCard } from "./glass-card";

type ListenPlatform = "spotify" | "appleMusic" | "soundcloud";

export type ListenableSongItem = {
  title: string;
  artist: string;
  comment?: string | null;
  links?: RoomSharePlatformLinks | null;
  contextLabel?: string | null;
  ageLabel?: string | null;
  uploadedBy?: {
    displayName: string;
  } | null;
};

const LISTEN_PLATFORM_ORDER = [
  "spotify",
  "appleMusic",
  "soundcloud",
] satisfies ListenPlatform[];

function getPlatformLabel(platform: ListenPlatform) {
  if (platform === "appleMusic") {
    return "Apple Music";
  }

  if (platform === "soundcloud") {
    return "SoundCloud";
  }

  return "Spotify";
}

function PlatformIcon({ platform }: { platform: ListenPlatform }) {
  if (platform === "spotify") {
    return (
      <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
        <path d="M6.4 10.1c3.9-1.2 7.9-.9 11.2.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M7.4 13.4c2.8-.8 5.8-.5 8.1.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M8.6 16.5c1.9-.5 3.9-.3 5.5.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (platform === "appleMusic") {
    return (
      <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
        <path
          d="M14.7 5.2v9.1a2.7 2.7 0 1 1-1.5-2.4V7.1l5.7-1.4v7.1a2.7 2.7 0 1 1-1.5-2.4V4.2z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path d="M7.3 16.8h9.2a3 3 0 0 0 0-6 4.7 4.7 0 0 0-8.9-1.2A3.5 3.5 0 0 0 7.3 16.8Z" fill="currentColor" />
      <path d="M5.2 16.8h1.3M3.6 14.8h2.9M2.7 12.8h3.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function getPlatformEntries(item: ListenableSongItem | null) {
  if (!item?.links) {
    return [];
  }

  return LISTEN_PLATFORM_ORDER.map((platform) => ({
    platform,
    url: item.links?.[platform] ?? null,
  })).filter((entry): entry is { platform: ListenPlatform; url: string } => Boolean(entry.url));
}

export function ListenOnModal({
  item,
  onClose,
}: {
  item: ListenableSongItem | null;
  onClose: () => void;
}) {
  const platformEntries = getPlatformEntries(item);

  useEffect(() => {
    if (!item) {
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
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <GlassCard
        strong
        className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,20,0.98),rgba(6,8,13,0.98))] p-5 shadow-[0_36px_90px_rgba(0,0,0,0.48)] sm:p-6"
      >
        <div
          className="space-y-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                Listen on
              </p>
              <div className="space-y-1">
                <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                  {item.title}
                </h2>
                <p className="text-[15px] text-[var(--text-soft)]">{item.artist}</p>
                <p className="text-[12px] text-[var(--text-faint)]">
                  {item.uploadedBy?.displayName
                    ? `Uploaded by ${item.uploadedBy.displayName}`
                    : "Queued in Frequency"}
                  {item.contextLabel ? ` • ${item.contextLabel}` : ""}
                  {item.ageLabel ? ` • ${item.ageLabel}` : ""}
                </p>
              </div>
            </div>

            <button
              aria-label="Close listening options"
              className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {platformEntries.length ? (
            <div className="grid gap-3">
              {platformEntries.map((entry) => (
                <Link
                  key={entry.platform}
                  className="button-secondary inline-flex min-h-12 items-center justify-between rounded-[22px] px-4 text-sm font-medium"
                  href={entry.url}
                  onClick={onClose}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="inline-flex items-center gap-3">
                    <PlatformIcon platform={entry.platform} />
                    {getPlatformLabel(entry.platform)}
                  </span>
                  <span className="text-[var(--text-faint)]">Open</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[14px] leading-6 text-[var(--text-soft)]">
              No listening links are ready for this song yet.
            </p>
          )}

          {item.comment ? (
            <p className="text-[13px] leading-6 text-[var(--text-soft)]">{item.comment}</p>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
