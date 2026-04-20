"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { isOnboardingComplete } from "@/lib/frequency/onboarding";
import {
  buildPersonalSongActivityItems,
  type SongActivityItem,
} from "@/lib/frequency/song-activity";
import type { RoomShareSubmitDraft } from "@/lib/frequency/room-share";
import { getFavoriteArtistEntriesInRecencyOrder } from "@/lib/frequency/taste-profile";
import {
  observeJoinedRooms,
  observePersonalSongItems,
  removePersonalSongItem,
  updatePersonalSongItem,
} from "@/lib/firebase/firestore";
import type { FrequencyRoom, PersonalSongItem } from "@/lib/types";
import { EmptyStateCard } from "./empty-state-card";
import { EditUploadModal } from "./edit-upload-modal";
import { FavoriteArtistsDialog } from "./favorite-artists-dialog";
import { FavoriteArtistsList } from "./favorite-artists-list";
import { FavoriteArtistsModal } from "./favorite-artists-modal";
import { FriendCodeCard } from "./friend-code-card";
import { ListenOnModal } from "./listen-on-modal";
import { RemoveUploadModal } from "./remove-upload-modal";
import { SongActivityFeed } from "./song-activity-feed";
import { UserProfileHeader } from "./user-profile-header";

export function ProfileScreen() {
  const { user, profile } = useAuth();
  const profileOnboardingComplete = isOnboardingComplete(profile);
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [personalSaveItems, setPersonalSaveItems] = useState<PersonalSongItem[]>([]);
  const [editArtistsOpen, setEditArtistsOpen] = useState(false);
  const [allArtistsOpen, setAllArtistsOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [pendingEditItemId, setPendingEditItemId] = useState<string | null>(null);
  const [pendingRemovalItemId, setPendingRemovalItemId] = useState<string | null>(null);
  const [songPendingEdit, setSongPendingEdit] = useState<SongActivityItem | null>(null);
  const [songPendingRemoval, setSongPendingRemoval] = useState<SongActivityItem | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

  useEffect(() => {
    if (!profile?.uid) {
      setPersonalSaveItems([]);
      return;
    }

    return observePersonalSongItems(profile.uid, setPersonalSaveItems);
  }, [profile?.uid]);

  const orderedArtistEntries = getFavoriteArtistEntriesInRecencyOrder(
    profile?.favoriteArtists ?? [],
    profile?.favoriteArtistEntries ?? [],
  );
  const primaryGenresByArtist = useMemo(
    () =>
      (profile?.artistGenreProfiles ?? []).reduce<Map<string, string | null>>((map, artistProfile) => {
        map.set(
          artistProfile.artist.toLowerCase(),
          artistProfile.primaryTag ?? artistProfile.tags[0] ?? null,
        );
        return map;
      }, new Map()),
    [profile?.artistGenreProfiles],
  );
  const recentArtistEntries = orderedArtistEntries.slice(0, 5);
  const personalUploadItems = useMemo(
    () =>
      buildPersonalSongActivityItems({
        currentUserId: profile?.uid ?? null,
        items: personalSaveItems,
        profile,
      }),
    [personalSaveItems, profile],
  );
  const selectedSong = useMemo(
    () =>
      selectedSongId
        ? personalUploadItems.find((item) => item.id === selectedSongId) ?? null
        : null,
    [personalUploadItems, selectedSongId],
  );

  if (!profile) {
    return null;
  }

  const profileUid = profile.uid;

  async function handleConfirmRemoveUpload() {
    if (!songPendingRemoval) {
      return;
    }

    const currentUserId = user?.uid ?? profileUid;
    setPendingRemovalItemId(songPendingRemoval.id);

    try {
      await removePersonalSongItem({
        itemId: songPendingRemoval.id,
        userId: currentUserId,
      });
      setSongPendingRemoval(null);
    } finally {
      setPendingRemovalItemId((current) =>
        current === songPendingRemoval.id ? null : current,
      );
    }
  }

  async function handleEditPersonalUpload(draft: RoomShareSubmitDraft) {
    if (!songPendingEdit) {
      throw new Error("Choose a song to edit first.");
    }

    const currentUserId = user?.uid ?? profileUid;
    setPendingEditItemId(songPendingEdit.id);

    try {
      await updatePersonalSongItem({
        artworkUrl: draft.artworkUrl,
        itemId: songPendingEdit.id,
        kind: draft.kind,
        links: draft.links,
        note: draft.note,
        resolvedArtist: draft.resolvedArtist,
        resolvedTrack: draft.resolvedTrack,
        sourcePlatform: draft.sourcePlatform,
        subtitle: draft.subtitle,
        title: draft.title,
        url: draft.url,
        userId: currentUserId,
      });
      setSongPendingEdit(null);
    } finally {
      setPendingEditItemId((current) =>
        current === songPendingEdit.id ? null : current,
      );
    }
  }

  return (
    <div className="space-y-5">
      <UserProfileHeader profile={profile} roomCount={rooms.length} />

      <section className="section-haze-strong rounded-[32px] px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Your collection
            </p>
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Songs you&apos;ve saved for yourself in Frequency
            </p>
          </div>
          <SongActivityFeed
            emptyBody="Songs you save from Home will collect here."
            emptyTitle="No saves yet"
            items={personalUploadItems}
            maxVisibleItems={8}
            canEditItem={() => Boolean(user?.uid ?? profileUid)}
            canRemoveItem={() => Boolean(user?.uid ?? profileUid)}
            onEditItem={(item) => setSongPendingEdit(item)}
            onRemoveItem={(item) => setSongPendingRemoval(item)}
            onSelectItem={(item) => setSelectedSongId(item.id)}
            removingItemId={pendingRemovalItemId}
            showContext
          />
        </div>
      </section>

      <section className="section-haze-strong rounded-[32px] px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="space-y-4 lg:pr-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Favorite artists
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                {orderedArtistEntries.length > 5 ? (
                  <button
                    className="button-secondary min-h-10 rounded-full px-3.5 text-xs font-medium"
                    onClick={() => setAllArtistsOpen(true)}
                    type="button"
                  >
                    Show more
                  </button>
                ) : null}
                <button
                  className="button-secondary min-h-10 rounded-full px-3.5 text-xs font-medium"
                  onClick={() => setEditArtistsOpen(true)}
                  type="button"
                >
                  Edit artists
                </button>
              </div>
            </div>
            {recentArtistEntries.length ? (
              <FavoriteArtistsList
                compact
                entries={recentArtistEntries}
                primaryGenresByArtist={primaryGenresByArtist}
              />
            ) : (
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                No favorite artists saved yet. The profile still works gracefully while your taste layer is light.
              </p>
            )}
            {orderedArtistEntries.length > 5 ? (
              <p className="text-[12px] text-[var(--text-faint)]">
                Showing the 5 most recent artists first.
              </p>
            ) : null}
          </div>

          <div className="space-y-5 lg:border-l lg:border-[rgba(255,255,255,0.08)] lg:pl-8">
            <FriendCodeCard
              description="Share this code with a friend to compare your taste profiles."
              friendCode={profile.friendCode}
              title="Friend code"
            />
            <div className="section-divider lg:hidden" />
            <div className="space-y-2 pt-1">
              <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Room presence
              </p>
              <p className="text-[15px] leading-7 text-[var(--text-soft)]">
                You&apos;ve joined {rooms.length} room{rooms.length === 1 ? "" : "s"} so far.
              </p>
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                Share your code from here or in Compare when you want someone else to line their taste up against yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {!rooms.length ? (
        <EmptyStateCard
          body="Create your first room and your profile immediately becomes more social."
          primaryAction="Go to rooms"
          primaryHref="/rooms"
          title="No joined rooms yet"
          visual="rooms"
        />
      ) : null}

      {user ? (
        <FavoriteArtistsDialog
          initialArtists={profile.favoriteArtists}
          onboardingComplete={profileOnboardingComplete}
          onClose={() => setEditArtistsOpen(false)}
          open={editArtistsOpen}
          uid={user.uid}
        />
      ) : null}
      <FavoriteArtistsModal
        entries={orderedArtistEntries}
        onClose={() => setAllArtistsOpen(false)}
        open={allArtistsOpen}
        primaryGenresByArtist={primaryGenresByArtist}
      />
      <EditUploadModal
        item={songPendingEdit}
        onClose={() => {
          if (!pendingEditItemId) {
            setSongPendingEdit(null);
          }
        }}
        onSubmit={handleEditPersonalUpload}
      />
      <RemoveUploadModal
        item={songPendingRemoval}
        onClose={() => {
          if (!pendingRemovalItemId) {
            setSongPendingRemoval(null);
          }
        }}
        onConfirm={() => void handleConfirmRemoveUpload()}
        pending={Boolean(songPendingRemoval && pendingRemovalItemId === songPendingRemoval.id)}
      />
      <ListenOnModal item={selectedSong} onClose={() => setSelectedSongId(null)} />
    </div>
  );
}
