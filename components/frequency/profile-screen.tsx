"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { buildSongActivityItems, type SongActivityItem } from "@/lib/frequency/song-activity";
import { getFavoriteArtistEntriesInRecencyOrder } from "@/lib/frequency/taste-profile";
import {
  observeJoinedRooms,
  observeRoomShareItemsByRoomIds,
  removeRoomShareItem,
} from "@/lib/firebase/firestore";
import type { FrequencyRoom, RoomShareItem } from "@/lib/types";
import { EmptyStateCard } from "./empty-state-card";
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
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [roomShareItems, setRoomShareItems] = useState<RoomShareItem[]>([]);
  const [editArtistsOpen, setEditArtistsOpen] = useState(false);
  const [allArtistsOpen, setAllArtistsOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongActivityItem | null>(null);
  const [pendingRemovalItemId, setPendingRemovalItemId] = useState<string | null>(null);
  const [songPendingRemoval, setSongPendingRemoval] = useState<SongActivityItem | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

  useEffect(() => {
    return observeRoomShareItemsByRoomIds(
      rooms.map((room) => room.id),
      setRoomShareItems,
    );
  }, [rooms]);

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
      buildSongActivityItems({
        currentUserId: profile?.uid ?? null,
        items: roomShareItems.filter((item) => item.addedBy === profile?.uid),
        rooms,
        uploaderProfiles: profile ? [profile] : [],
      }),
    [profile, roomShareItems, rooms],
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
      await removeRoomShareItem({
        itemId: songPendingRemoval.id,
        removedBy: currentUserId,
        roomId: songPendingRemoval.roomId,
      });
      setSongPendingRemoval(null);
    } finally {
      setPendingRemovalItemId((current) =>
        current === songPendingRemoval.id ? null : current,
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
              Your uploads
            </p>
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Songs you&apos;ve dropped across Frequency
            </p>
          </div>
          <SongActivityFeed
            emptyBody="Songs you add from Home or Rooms will collect here."
            emptyTitle="No uploads yet"
            items={personalUploadItems}
            maxVisibleItems={8}
            canRemoveItem={() => Boolean(user?.uid ?? profileUid)}
            onRemoveItem={(item) => setSongPendingRemoval(item)}
            onSelectItem={(item) => setSelectedSong(item)}
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
          onboardingComplete={profile.onboardingComplete}
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
      <ListenOnModal item={selectedSong} onClose={() => setSelectedSong(null)} />
    </div>
  );
}
