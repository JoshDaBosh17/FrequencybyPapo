"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

import { buildTasteComparisonSummary } from "@/lib/frequency/taste-compare";
import { buildHelixTasteEntries } from "@/lib/frequency/taste-profile";
import type { UserProfile } from "@/lib/types";
import { getAvatarTone, getInitials, titleCase } from "@/lib/utils";
import { GlassCard } from "./glass-card";
import { TasteHelix } from "./taste-helix";

function CompareAvatar({
  profile,
  label,
}: {
  profile: Pick<UserProfile, "uid" | "displayName" | "photoURL">;
  label: string;
}) {
  const initials = getInitials(profile.displayName);
  const tone = getAvatarTone(profile.uid);

  return (
    <div className="flex items-center gap-3">
      {profile.photoURL ? (
        <Image
          alt={profile.displayName ?? label}
          className="size-12 rounded-full object-cover"
          height={48}
          src={profile.photoURL}
          width={48}
        />
      ) : (
        <div
          className="grid size-12 place-items-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: tone }}
        >
          {initials}
        </div>
      )}

      <div className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
          {label}
        </p>
        <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]">
          {profile.displayName ?? "Frequency listener"}
        </p>
      </div>
    </div>
  );
}

function TagList({
  title,
  values,
  emptyLabel,
}: {
  title: string;
  values: string[];
  emptyLabel: string;
}) {
  return (
    <div className="surface-inline-soft rounded-[22px] p-4">
      <div className="space-y-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
          {title}
        </p>
        {values.length ? (
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <span
                key={value}
                className="surface-pill rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--text-soft)]"
              >
                {value}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

export function CompareHelixModal({
  open,
  onClose,
  currentProfile,
  friendProfile,
}: {
  open: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  friendProfile: UserProfile | null;
}) {
  const comparison = useMemo(() => {
    if (!currentProfile || !friendProfile) {
      return null;
    }

    return buildTasteComparisonSummary(currentProfile, friendProfile);
  }, [currentProfile, friendProfile]);
  const currentHelixEntries = useMemo(() => {
    if (!currentProfile) {
      return [];
    }

    return buildHelixTasteEntries({
      artistGenreProfiles: currentProfile.artistGenreProfiles ?? [],
      favoriteArtistEntries: currentProfile.favoriteArtistEntries ?? [],
      favoriteArtists: currentProfile.favoriteArtists,
    });
  }, [currentProfile]);
  const friendHelixEntries = useMemo(() => {
    if (!friendProfile) {
      return [];
    }

    return buildHelixTasteEntries({
      artistGenreProfiles: friendProfile.artistGenreProfiles ?? [],
      favoriteArtistEntries: friendProfile.favoriteArtistEntries ?? [],
      favoriteArtists: friendProfile.favoriteArtists,
    });
  }, [friendProfile]);

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

  if (!open || !currentProfile || !friendProfile || !comparison) {
    return null;
  }

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <GlassCard
        strong
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,20,0.98),rgba(6,8,13,0.98))] shadow-[0_36px_90px_rgba(0,0,0,0.48)]"
      >
        <div
          className="flex min-h-0 flex-col"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                Compare
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                <CompareAvatar label="You" profile={currentProfile} />
                <CompareAvatar label="Friend" profile={friendProfile} />
              </div>
            </div>

            <button
              aria-label="Close compare view"
              className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="soft-scrollbar overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <TasteHelix
                  helixTags={currentHelixEntries.map((entry, index) => ({
                    artists: entry.artists.map((artist) => artist.name),
                    label: entry.genre,
                    side: index % 2 === 0 ? "left" : "right",
                    weight: (entry.weight ?? 1) * 28,
                  }))}
                  labelText="Your frequency"
                  overviewText={comparison.yourOverview}
                  useSampleFallback={false}
                />
                <TasteHelix
                  helixTags={friendHelixEntries.map((entry, index) => ({
                    artists: entry.artists.map((artist) => artist.name),
                    label: entry.genre,
                    side: index % 2 === 0 ? "left" : "right",
                    weight: (entry.weight ?? 1) * 28,
                  }))}
                  labelText="Their frequency"
                  overviewText={comparison.theirOverview}
                  useSampleFallback={false}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <TagList
                  emptyLabel="No shared genres yet."
                  title="Shared genres"
                  values={comparison.sharedGenres.map((genre) => titleCase(genre))}
                />
                <TagList
                  emptyLabel="No shared artists yet."
                  title="Shared artists"
                  values={comparison.sharedArtists}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
