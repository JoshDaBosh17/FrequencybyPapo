import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import type { FrequencyRoom, UserProfile } from "@/lib/types";
import { firebaseApp } from "./client";

export const db = getFirestore(firebaseApp, "default");

export const DEFAULT_ROOM_CHANNELS = [
  "Overview",
  "House",
  "Afro House",
  "Rap",
  "Chill",
  "People",
  "Songs",
  "Insights",
];

function normalizeProfile(existing: Partial<UserProfile>, user?: User): UserProfile {
  return {
    uid: user?.uid ?? existing.uid ?? "",
    displayName: user?.displayName ?? existing.displayName ?? null,
    email: user?.email ?? existing.email ?? null,
    photoURL: user?.photoURL ?? existing.photoURL ?? null,
    createdAt: existing.createdAt ?? null,
    onboardingComplete: existing.onboardingComplete ?? false,
    favoriteArtists: existing.favoriteArtists ?? [],
    joinedRoomIds: existing.joinedRoomIds ?? [],
  };
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: serverTimestamp(),
      onboardingComplete: false,
      favoriteArtists: [],
      joinedRoomIds: [],
    });

    return normalizeProfile({}, user);
  }

  const existing = snapshot.data() as Partial<UserProfile>;
  const updates: Partial<UserProfile> = {};

  if (existing.displayName === undefined) {
    updates.displayName = user.displayName ?? null;
  }
  if (existing.email === undefined) {
    updates.email = user.email ?? null;
  }
  if (existing.photoURL === undefined) {
    updates.photoURL = user.photoURL ?? null;
  }
  if (existing.onboardingComplete === undefined) {
    updates.onboardingComplete = false;
  }
  if (!Array.isArray(existing.favoriteArtists)) {
    updates.favoriteArtists = [];
  }
  if (!Array.isArray(existing.joinedRoomIds)) {
    updates.joinedRoomIds = [];
  }

  if (Object.keys(updates).length) {
    await setDoc(userRef, updates, { merge: true });
  }

  return normalizeProfile(existing, user);
}

export function observeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  return onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeProfile(snapshot.data() as Partial<UserProfile>));
    },
    () => {
      callback(null);
    },
  );
}

export async function completeOnboarding(uid: string, favoriteArtists: string[]) {
  await setDoc(
    doc(db, "users", uid),
    {
      favoriteArtists,
      onboardingComplete: true,
    },
    { merge: true },
  );
}

export async function createRoom({
  userId,
  name,
  description,
  starterVibe,
}: {
  userId: string;
  name: string;
  description: string;
  starterVibe?: string;
}) {
  const roomRef = doc(collection(db, "rooms"));
  const roomId = roomRef.id;
  const seededChannels = [...DEFAULT_ROOM_CHANNELS];

  if (starterVibe?.trim() && !seededChannels.includes(starterVibe.trim())) {
    seededChannels.splice(1, 0, starterVibe.trim());
  }

  await setDoc(roomRef, {
    id: roomId,
    name: name.trim(),
    description: description.trim() || "A new room ready for songs, people, and shared momentum.",
    createdBy: userId,
    createdAt: serverTimestamp(),
    memberIds: [userId],
    genreChannels: seededChannels,
    songCount: 0,
    activitySummary: "Fresh room. First songs and people will set the tone.",
    starterVibe: starterVibe?.trim() || null,
  });

  await setDoc(
    doc(db, "users", userId),
    {
      joinedRoomIds: arrayUnion(roomId),
    },
    { merge: true },
  );

  return roomId;
}

export function observeJoinedRooms(
  uid: string,
  callback: (rooms: FrequencyRoom[]) => void,
) {
  const roomsQuery = query(collection(db, "rooms"), where("memberIds", "array-contains", uid));

  return onSnapshot(
    roomsQuery,
    (snapshot) => {
      const rooms = snapshot.docs
        .map((roomDoc) => roomDoc.data() as FrequencyRoom)
        .sort((left, right) => {
          const leftSeconds = (left.createdAt as { seconds?: number } | null)?.seconds ?? 0;
          const rightSeconds = (right.createdAt as { seconds?: number } | null)?.seconds ?? 0;
          return rightSeconds - leftSeconds;
        });

      callback(rooms);
    },
    () => {
      callback([]);
    },
  );
}

export function observeRoom(roomId: string, callback: (room: FrequencyRoom | null) => void) {
  return onSnapshot(
    doc(db, "rooms", roomId),
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as FrequencyRoom) : null);
    },
    () => {
      callback(null);
    },
  );
}
