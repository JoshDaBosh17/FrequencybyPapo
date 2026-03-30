import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { buildFavoriteArtistsSignature } from "@/lib/frequency/artist-signature";
import {
  buildFriendCodeNormalized,
  formatFriendCode,
  normalizeFriendCodeInput,
} from "@/lib/frequency/friend-code";
import {
  normalizeChannelVibe,
  sortRoomShareItemsByRecency,
} from "@/lib/frequency/room-share";
import { normalizeRoomVisibility } from "@/lib/frequency/room-identity";
import {
  buildFavoriteArtistEntries,
  getFavoriteArtistsInRecencyOrder,
} from "@/lib/frequency/taste-profile";
import { removeUndefinedDeep } from "@/lib/firebase/sanitize";
import { analyzeFirestoreWrite, recordWriteTrigger } from "@/lib/firebase/write-audit";
import type {
  FrequencyRoom,
  RoomShareItem,
  RoomShareKind,
  RoomSharePlatformLinks,
  RoomShareReactionKind,
  RoomShareReactions,
  UserProfile,
} from "@/lib/types";
import { firebaseApp } from "./client";

export const db = getFirestore(firebaseApp, "default");

const LEGACY_DEFAULT_ROOM_CHANNELS = [
  "Overview",
  "House",
  "Afro House",
  "Rap",
  "Chill",
  "People",
  "Songs",
  "Insights",
];

function isLegacySeededRoom(existing: Partial<FrequencyRoom>) {
  const genreChannels = Array.isArray(existing.genreChannels) ? existing.genreChannels : [];
  const starterVibe = typeof existing.starterVibe === "string" ? existing.starterVibe.trim() : "";
  const normalizedStarterVibe = starterVibe.toLowerCase();
  const channelVibes = normalizeRoomChannelVibes(existing.channelVibes);
  const expectedSeedCount =
    starterVibe &&
    !LEGACY_DEFAULT_ROOM_CHANNELS.some(
      (channel) => channel.trim().toLowerCase() === normalizedStarterVibe,
    )
      ? LEGACY_DEFAULT_ROOM_CHANNELS.length + 1
      : LEGACY_DEFAULT_ROOM_CHANNELS.length;

  if (!genreChannels.length || genreChannels.length !== expectedSeedCount) {
    return false;
  }

  if ((existing.songCount ?? 0) > 0 || Object.keys(channelVibes).length > 0) {
    return false;
  }

  return genreChannels.every((channel) => {
    const normalizedChannel = channel.trim().toLowerCase();
    return (
      LEGACY_DEFAULT_ROOM_CHANNELS.some(
        (defaultChannel) => defaultChannel.trim().toLowerCase() === normalizedChannel,
      ) || normalizedChannel === normalizedStarterVibe
    );
  });
}

function normalizeRoomChannelVibes(existing: Partial<FrequencyRoom>["channelVibes"]) {
  if (!existing || typeof existing !== "object") {
    return {};
  }

  return Object.entries(existing).reduce<Record<string, string>>((map, [channel, vibe]) => {
    if (typeof vibe !== "string") {
      return map;
    }

    const normalizedChannel = normalizeRoomChannelName(channel);
    const normalizedVibe = normalizeChannelVibe(vibe);

    if (!normalizedChannel || !normalizedVibe) {
      return map;
    }

    map[normalizedChannel] = normalizedVibe;
    return map;
  }, {});
}

function normalizeFriendIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) {
        return false;
      }

      seen.add(entry);
      return true;
    });
}

async function generateUniqueFriendCode(uid: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const friendCodeNormalized = buildFriendCodeNormalized(uid, attempt);
    const collisionSnapshot = await getDocs(
      query(
        collection(db, "users"),
        where("friendCodeNormalized", "==", friendCodeNormalized),
        limit(1),
      ),
    );
    const existingDoc = collisionSnapshot.docs[0];

    if (!existingDoc || existingDoc.id === uid) {
      return {
        friendCode: formatFriendCode(friendCodeNormalized),
        friendCodeNormalized,
      };
    }
  }

  const fallbackNormalized = normalizeFriendCodeInput(uid) ?? uid.toUpperCase();

  return {
    friendCode: formatFriendCode(fallbackNormalized),
    friendCodeNormalized: fallbackNormalized,
  };
}

function normalizeFrequencyRoom(existing: Partial<FrequencyRoom>): FrequencyRoom {
  const normalizedChannelVibes = normalizeRoomChannelVibes(existing.channelVibes);
  const genreChannels =
    Array.isArray(existing.genreChannels) && !isLegacySeededRoom(existing)
      ? existing.genreChannels
      : [];

  return {
    id: existing.id ?? "",
    name: existing.name ?? "Untitled room",
    description:
      existing.description ?? "A shared music space ready for songs, artists, and links.",
    createdBy: existing.createdBy ?? "",
    createdAt: existing.createdAt ?? null,
    visibility: normalizeRoomVisibility(existing.visibility),
    memberIds: Array.isArray(existing.memberIds) ? existing.memberIds : [],
    genreChannels,
    channelVibes: normalizedChannelVibes,
    songCount: typeof existing.songCount === "number" ? existing.songCount : 0,
    activitySummary:
      existing.activitySummary ?? "Fresh room. First songs and people will set the tone.",
    starterVibe: typeof existing.starterVibe === "string" ? existing.starterVibe : null,
  };
}

function normalizeRoomChannelName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 28);
}

function normalizeRoomShareItem(existing: Partial<RoomShareItem>): RoomShareItem {
  return {
    id: existing.id ?? "",
    roomId: existing.roomId ?? "",
    channel: normalizeRoomChannelName(existing.channel ?? ""),
    kind:
      existing.kind === "song" || existing.kind === "artist" || existing.kind === "link"
        ? existing.kind
        : "song",
    title: typeof existing.title === "string" ? existing.title : "Shared drop",
    subtitle: typeof existing.subtitle === "string" ? existing.subtitle : null,
    url: typeof existing.url === "string" ? existing.url : null,
    note: typeof existing.note === "string" ? existing.note : null,
    sourcePlatform: normalizeRoomShareSourcePlatform(existing.sourcePlatform),
    links: normalizeRoomSharePlatformLinks(existing.links),
    addedBy: typeof existing.addedBy === "string" ? existing.addedBy : "",
    addedByName: typeof existing.addedByName === "string" ? existing.addedByName : null,
    resolvedArtist:
      typeof existing.resolvedArtist === "string" ? existing.resolvedArtist : null,
    resolvedTrack:
      typeof existing.resolvedTrack === "string" ? existing.resolvedTrack : null,
    primaryGenre:
      typeof existing.primaryGenre === "string" ? existing.primaryGenre : null,
    enrichmentStatus:
      existing.enrichmentStatus === "loading" ||
      existing.enrichmentStatus === "ready" ||
      existing.enrichmentStatus === "error" ||
      existing.enrichmentStatus === "idle"
        ? existing.enrichmentStatus
        : "idle",
    enrichmentError:
      typeof existing.enrichmentError === "string" ? existing.enrichmentError : null,
    enrichmentSource:
      existing.enrichmentSource === "lastfm_track" ||
      existing.enrichmentSource === "lastfm_artist"
        ? existing.enrichmentSource
        : null,
    enrichedAt: existing.enrichedAt ?? null,
    reactions: normalizeRoomShareReactions(existing.reactions),
    createdAt: existing.createdAt ?? null,
  };
}

function normalizeRoomShareSourcePlatform(value: unknown) {
  return value === "spotify" ||
    value === "appleMusic" ||
    value === "soundcloud" ||
    value === "youtube"
    ? value
    : null;
}

function normalizeRoomSharePlatformLinks(value: unknown): RoomSharePlatformLinks {
  if (!value || typeof value !== "object") {
    return {
      appleMusic: null,
      soundcloud: null,
      spotify: null,
      youtube: null,
    };
  }

  const links = value as RoomSharePlatformLinks;

  return {
    appleMusic: typeof links.appleMusic === "string" ? links.appleMusic : null,
    soundcloud: typeof links.soundcloud === "string" ? links.soundcloud : null,
    spotify: typeof links.spotify === "string" ? links.spotify : null,
    youtube: typeof links.youtube === "string" ? links.youtube : null,
  };
}

function normalizeRoomShareReactions(value: unknown): RoomShareReactions {
  if (!value || typeof value !== "object") {
    return {};
  }

  return (["fire", "love", "headphones"] as const).reduce<RoomShareReactions>(
    (map, reaction) => {
      const entries = (value as Record<string, unknown>)[reaction];

      if (!Array.isArray(entries)) {
        return map;
      }

      map[reaction] = Array.from(
        new Set(
          entries
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      );
      return map;
    },
    {},
  );
}

function normalizeTasteSummary(existing: Partial<UserProfile>["tasteSummary"]) {
  if (!existing || typeof existing !== "object") {
    return null;
  }

  return {
    overview: typeof existing.overview === "string" ? existing.overview : null,
    headline: typeof existing.headline === "string" ? existing.headline : null,
    subheadline: typeof existing.subheadline === "string" ? existing.subheadline : null,
    generatedAt: existing.generatedAt ?? null,
  };
}

async function setClientDocument(
  ref: Parameters<typeof setDoc>[0],
  payload: Record<string, unknown>,
  options?: Parameters<typeof setDoc>[2],
  context?: {
    triggerReason: string;
    userId?: string | null;
    writeType?: string;
  },
) {
  const cleanedPayload = removeUndefinedDeep(payload);
  const snapshot = await getDoc(ref);
  const analysis = analyzeFirestoreWrite(snapshot.data() ?? null, cleanedPayload);

  if (process.env.NODE_ENV === "development") {
    const summary = recordWriteTrigger(
      context?.triggerReason ?? "unspecified",
      !snapshot.exists() || analysis.meaningfullyChanged || !analysis.hasComparablePayload,
    );
    console.log("[frequency][firestore-write]", {
      write_type: context?.writeType ?? "client_set",
      collection_path: ref.parent.path,
      doc_id: ref.id,
      trigger_reason: context?.triggerReason ?? "unspecified",
      user_id: context?.userId ?? null,
      timestamp: new Date().toISOString(),
      meaningfully_changed: analysis.meaningfullyChanged,
      executed: !snapshot.exists() || analysis.meaningfullyChanged || !analysis.hasComparablePayload,
      trigger_count: summary.triggerCount,
      top_triggers: summary.topTriggers,
      payload: cleanedPayload,
    });
  }

  if (snapshot.exists() && !analysis.meaningfullyChanged && analysis.hasComparablePayload) {
    return;
  }

  if (options) {
    await setDoc(ref, cleanedPayload, options);
    return;
  }

  await setDoc(ref, cleanedPayload);
}

function normalizeProfile(existing: Partial<UserProfile>, user?: User): UserProfile {
  const favoriteArtistEntries = buildFavoriteArtistEntries(
    existing.favoriteArtists ?? [],
    existing.favoriteArtistEntries ?? [],
    {
      assumeInputOrder: "oldest_first",
    },
  );

  return {
    uid: user?.uid ?? existing.uid ?? "",
    displayName: user?.displayName ?? existing.displayName ?? null,
    email: user?.email ?? existing.email ?? null,
    photoURL: user?.photoURL ?? existing.photoURL ?? null,
    friendIds: normalizeFriendIds(existing.friendIds),
    friendCode: typeof existing.friendCode === "string" ? existing.friendCode : null,
    friendCodeNormalized:
      typeof existing.friendCodeNormalized === "string" ? existing.friendCodeNormalized : null,
    createdAt: existing.createdAt ?? null,
    onboardingComplete: existing.onboardingComplete ?? false,
    favoriteArtists: getFavoriteArtistsInRecencyOrder(
      existing.favoriteArtists ?? [],
      favoriteArtistEntries,
    ),
    favoriteArtistEntries,
    favoriteArtistsSignature: existing.favoriteArtistsSignature ?? null,
    joinedRoomIds: existing.joinedRoomIds ?? [],
    genreProfile: existing.genreProfile ?? [],
    artistGenreProfiles: existing.artistGenreProfiles ?? [],
    tasteSummary: normalizeTasteSummary(existing.tasteSummary),
    homeSuggestion: existing.homeSuggestion ?? null,
    activeRecommendationIntent: existing.activeRecommendationIntent ?? null,
    recommendationCache: existing.recommendationCache ?? {},
    enrichmentStatus: existing.enrichmentStatus ?? "idle",
    enrichmentError: existing.enrichmentError ?? null,
    lastEnrichedAt: existing.lastEnrichedAt ?? null,
    recommendationStatus: existing.recommendationStatus ?? "idle",
    recommendationEmptyStateReason: existing.recommendationEmptyStateReason ?? null,
    recommendationError: existing.recommendationError ?? null,
    recommendationExpiresAt: existing.recommendationExpiresAt ?? null,
    recommendationFailedAt: existing.recommendationFailedAt ?? null,
    openAIFallbackFailedAt: existing.openAIFallbackFailedAt ?? null,
  };
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const friendCodeFields = await generateUniqueFriendCode(user.uid);

    await setClientDocument(userRef, {
      uid: user.uid,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      friendIds: [],
      friendCode: friendCodeFields.friendCode,
      friendCodeNormalized: friendCodeFields.friendCodeNormalized,
      createdAt: serverTimestamp(),
      onboardingComplete: false,
      favoriteArtists: [],
      favoriteArtistEntries: [],
      favoriteArtistsSignature: null,
      joinedRoomIds: [],
      genreProfile: [],
      artistGenreProfiles: [],
      tasteSummary: null,
      homeSuggestion: null,
      activeRecommendationIntent: null,
      recommendationCache: {},
      enrichmentStatus: "idle",
      enrichmentError: null,
      lastEnrichedAt: null,
      recommendationEmptyStateReason: null,
      recommendationStatus: "idle",
      recommendationError: null,
      recommendationExpiresAt: null,
      recommendationFailedAt: null,
      openAIFallbackFailedAt: null,
    }, undefined, {
      triggerReason: "ensure_user_profile_create",
      userId: user.uid,
    });

    return normalizeProfile(
      {
        uid: user.uid,
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        photoURL: user.photoURL ?? null,
        friendIds: [],
        friendCode: friendCodeFields.friendCode,
        friendCodeNormalized: friendCodeFields.friendCodeNormalized,
      },
      user,
    );
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
  if (!Array.isArray(existing.friendIds)) {
    updates.friendIds = [];
  }
  if (
    typeof existing.friendCode !== "string" ||
    !existing.friendCode.trim() ||
    typeof existing.friendCodeNormalized !== "string" ||
    !existing.friendCodeNormalized.trim()
  ) {
    const friendCodeFields = await generateUniqueFriendCode(user.uid);
    updates.friendCode = friendCodeFields.friendCode;
    updates.friendCodeNormalized = friendCodeFields.friendCodeNormalized;
  }
  if (existing.onboardingComplete === undefined) {
    updates.onboardingComplete = false;
  }
  if (!Array.isArray(existing.favoriteArtists)) {
    updates.favoriteArtists = [];
  }
  if (!Array.isArray(existing.favoriteArtistEntries)) {
    updates.favoriteArtistEntries = buildFavoriteArtistEntries(existing.favoriteArtists ?? [], [], {
      assumeInputOrder: "oldest_first",
    });
  }
  if (existing.favoriteArtistsSignature === undefined) {
    updates.favoriteArtistsSignature = null;
  }
  if (!Array.isArray(existing.joinedRoomIds)) {
    updates.joinedRoomIds = [];
  }
  if (!Array.isArray(existing.genreProfile)) {
    updates.genreProfile = [];
  }
  if (!Array.isArray(existing.artistGenreProfiles)) {
    updates.artistGenreProfiles = [];
  }
  if (existing.tasteSummary === undefined) {
    updates.tasteSummary = null;
  }
  if (existing.homeSuggestion === undefined) {
    updates.homeSuggestion = null;
  }
  if (existing.activeRecommendationIntent === undefined) {
    updates.activeRecommendationIntent = null;
  }
  if (existing.recommendationCache === undefined) {
    updates.recommendationCache = {};
  }
  if (existing.enrichmentStatus === undefined) {
    updates.enrichmentStatus = "idle";
  }
  if (existing.enrichmentError === undefined) {
    updates.enrichmentError = null;
  }
  if (existing.recommendationStatus === undefined) {
    updates.recommendationStatus = "idle";
  }
  if (existing.recommendationEmptyStateReason === undefined) {
    updates.recommendationEmptyStateReason = null;
  }
  if (existing.recommendationError === undefined) {
    updates.recommendationError = null;
  }
  if (existing.recommendationExpiresAt === undefined) {
    updates.recommendationExpiresAt = null;
  }
  if (existing.recommendationFailedAt === undefined) {
    updates.recommendationFailedAt = null;
  }
  if (existing.openAIFallbackFailedAt === undefined) {
    updates.openAIFallbackFailedAt = null;
  }

  if (Object.keys(updates).length) {
    await setClientDocument(userRef, updates, { merge: true }, {
      triggerReason: "ensure_user_profile_backfill",
      userId: user.uid,
    });
  }

  return normalizeProfile({ ...existing, ...updates }, user);
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

export function observeUserProfilesByIds(
  uids: string[],
  callback: (profiles: UserProfile[]) => void,
) {
  const orderedIds = Array.from(
    new Set(
      uids
        .map((uid) => uid.trim())
        .filter(Boolean),
    ),
  );

  if (!orderedIds.length) {
    callback([]);
    return () => {};
  }

  const profilesById = new Map<string, UserProfile>();

  const emit = () => {
    callback(
      orderedIds
        .map((uid) => profilesById.get(uid))
        .filter((profile): profile is UserProfile => Boolean(profile)),
    );
  };

  const unsubscribers = orderedIds.map((uid) =>
    onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          profilesById.delete(uid);
          emit();
          return;
        }

        profilesById.set(uid, normalizeProfile(snapshot.data() as Partial<UserProfile>));
        emit();
      },
      () => {
        profilesById.delete(uid);
        emit();
      },
    ),
  );

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function findUserProfileByFriendCode(friendCode: string) {
  const normalizedCode = normalizeFriendCodeInput(friendCode);

  if (!normalizedCode) {
    return null;
  }

  const snapshot = await getDocs(
    query(
      collection(db, "users"),
      where("friendCodeNormalized", "==", normalizedCode),
      limit(1),
    ),
  );
  const userDoc = snapshot.docs[0];

  if (!userDoc) {
    return null;
  }

  return normalizeProfile(userDoc.data() as Partial<UserProfile>);
}

export async function completeOnboarding(uid: string, favoriteArtists: string[]) {
  return saveFavoriteArtists(uid, favoriteArtists, { onboardingComplete: true });
}

export async function saveFavoriteArtists(
  uid: string,
  favoriteArtists: string[],
  options?: { onboardingComplete?: boolean },
) {
  const cleanedArtists = favoriteArtists
    .map((artist) => artist.trim())
    .filter(Boolean);
  const existingSnapshot = await getDoc(doc(db, "users", uid));
  const existingProfile = existingSnapshot.data() as Partial<UserProfile> | undefined;
  const favoriteArtistEntries = buildFavoriteArtistEntries(
    cleanedArtists,
    existingProfile?.favoriteArtistEntries ?? [],
  );
  const orderedFavoriteArtists = favoriteArtistEntries.map((entry) => entry.artist);
  const favoriteArtistsSignature = buildFavoriteArtistsSignature(orderedFavoriteArtists);

  await setClientDocument(
    doc(db, "users", uid),
    {
      favoriteArtists: orderedFavoriteArtists,
      favoriteArtistEntries,
      favoriteArtistsSignature,
      onboardingComplete: options?.onboardingComplete ?? true,
      enrichmentStatus: "idle",
      enrichmentError: null,
      activeRecommendationIntent: null,
      recommendationEmptyStateReason: "artists_updated",
      recommendationStatus: "idle",
      recommendationError: null,
      recommendationExpiresAt: null,
      recommendationFailedAt: null,
      openAIFallbackFailedAt: null,
      genreProfile: [],
      artistGenreProfiles: [],
      tasteSummary: null,
      homeSuggestion: null,
    },
    { merge: true },
    {
      triggerReason: options?.onboardingComplete ? "complete_onboarding_save_artists" : "save_favorite_artists",
      userId: uid,
    },
  );

  console.log("[frequency][taste-summary-flow]", {
    event: "favorite_artists_cache_cleared",
    uid,
    favoriteArtistsCount: orderedFavoriteArtists.length,
    favoriteArtistsSignature,
    tasteSummaryCleared: true,
  });
}

export async function createRoom({
  userId,
  name,
  description,
  starterVibe,
  visibility,
}: {
  userId: string;
  name: string;
  description: string;
  starterVibe?: string;
  visibility?: "personal" | "public";
}) {
  const roomRef = doc(collection(db, "rooms"));
  const roomId = roomRef.id;

  await setClientDocument(roomRef, {
    id: roomId,
    name: name.trim(),
    description: description.trim() || "A new room ready for songs, people, and shared momentum.",
    createdBy: userId,
    createdAt: serverTimestamp(),
    visibility: normalizeRoomVisibility(visibility),
    memberIds: [userId],
    genreChannels: [],
    channelVibes: {},
    songCount: 0,
    activitySummary: "Waiting for the first channel, song, artist, or link.",
    starterVibe: starterVibe?.trim() || null,
  }, undefined, {
    triggerReason: "create_room",
    userId,
  });

  await setClientDocument(
    doc(db, "users", userId),
    {
      joinedRoomIds: arrayUnion(roomId),
    },
    { merge: true },
    {
      triggerReason: "create_room_joined_room_ids",
      userId,
    },
  );

  return roomId;
}

export async function createRoomChannel(
  roomId: string,
  channelInput: {
    name: string;
    vibe?: string;
  },
) {
  const normalizedChannelName = normalizeRoomChannelName(channelInput.name);
  const normalizedChannelVibe = normalizeChannelVibe(channelInput.vibe ?? "");

  if (!normalizedChannelName) {
    throw new Error("Channel name is required.");
  }

  const roomRef = doc(db, "rooms", roomId);
  const snapshot = await getDoc(roomRef);

  if (!snapshot.exists()) {
    throw new Error("Room not found.");
  }

  const room = normalizeFrequencyRoom(snapshot.data() as Partial<FrequencyRoom>);

  if (
    room.genreChannels.some(
      (existingChannel) =>
        existingChannel.trim().toLowerCase() === normalizedChannelName.toLowerCase(),
    )
  ) {
    return normalizedChannelName;
  }

  const genreChannels = [...room.genreChannels, normalizedChannelName];
  const channelVibes = { ...room.channelVibes };

  if (normalizedChannelVibe) {
    channelVibes[normalizedChannelName] = normalizedChannelVibe;
  }

  await setClientDocument(
    roomRef,
    {
      genreChannels,
      channelVibes,
      activitySummary:
        room.songCount > 0
          ? room.activitySummary
          : `${normalizedChannelName} is ready for its first songs, artists, and links.`,
    },
    { merge: true },
    {
      triggerReason: "create_room_channel",
      userId: null,
    },
  );

  return normalizedChannelName;
}

export async function addRoomShareItem({
  roomId,
  channel,
  kind,
  title,
  subtitle,
  url,
  note,
  addedBy,
  addedByName,
}: {
  roomId: string;
  channel: string;
  kind: RoomShareKind;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  note?: string | null;
  addedBy: string;
  addedByName?: string | null;
}) {
  const normalizedChannel = normalizeRoomChannelName(channel);
  const normalizedTitle = title.trim().replace(/\s+/g, " ").slice(0, 160);
  const normalizedSubtitle =
    typeof subtitle === "string" ? subtitle.trim().replace(/\s+/g, " ").slice(0, 120) : null;
  const normalizedUrl =
    typeof url === "string" ? url.trim().slice(0, 320) : null;
  const normalizedNote =
    typeof note === "string" ? note.trim().replace(/\s+/g, " ").slice(0, 220) : null;

  if (!normalizedChannel) {
    throw new Error("Choose a channel first.");
  }

  if (!normalizedTitle) {
    throw new Error("Add a song, artist, or link first.");
  }

  const shareRef = doc(collection(db, "rooms", roomId, "items"));

  console.log("[frequency][room-share-enrichment]", {
    event: "room_share_item_add_requested",
    roomId,
    channel: normalizedChannel,
    kind,
    title: normalizedTitle,
    subtitle: normalizedSubtitle,
    url: normalizedUrl,
    note: normalizedNote,
  });

  await setClientDocument(
    shareRef,
    {
      id: shareRef.id,
      roomId,
      channel: normalizedChannel,
      kind,
      title: normalizedTitle,
      subtitle: normalizedSubtitle,
      url: normalizedUrl,
      note: normalizedNote,
      sourcePlatform: null,
      links: {
        appleMusic: null,
        soundcloud: null,
        spotify: null,
        youtube: null,
      },
      addedBy,
      addedByName: addedByName?.trim() || null,
      resolvedArtist: null,
      resolvedTrack: null,
      primaryGenre: null,
      enrichmentStatus: "loading",
      enrichmentError: null,
      enrichmentSource: null,
      enrichedAt: null,
      reactions: {},
      createdAt: serverTimestamp(),
    },
    undefined,
    {
      triggerReason: "add_room_share_item",
      userId: addedBy,
    },
  );

  const roomRef = doc(db, "rooms", roomId);
  const shareLabel =
    kind === "artist" ? "artist" : kind === "link" ? "link" : "song";
  const activitySummary = `${normalizedTitle} landed in ${normalizedChannel} as a new ${shareLabel} drop.`;

  await setDoc(
    roomRef,
    {
      songCount: increment(1),
      activitySummary,
    },
    { merge: true },
  );

  try {
    console.log("[frequency][room-share-enrichment]", {
      event: "room_share_item_enrichment_triggered",
      roomId,
      itemId: shareRef.id,
    });

    const response = await fetch("/api/rooms/share/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        itemId: shareRef.id,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Room share enrichment failed.";

      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          errorMessage = payload.error;
        }
      } catch {
        // Ignore JSON parsing errors and keep the fallback message.
      }

      await setClientDocument(
        shareRef,
        {
          enrichmentStatus: "error",
          enrichmentError: errorMessage,
        },
        { merge: true },
        {
          triggerReason: "add_room_share_item_enrichment_failed",
          userId: addedBy,
        },
      );

      console.error("[frequency][room-share-enrichment]", {
        event: "room_share_item_enrichment_failed",
        roomId,
        itemId: shareRef.id,
        error: errorMessage,
      });
    } else {
      const payload = (await response.json()) as {
        result?: {
          kind?: RoomShareKind;
          links?: RoomSharePlatformLinks | null;
          primaryGenre?: string | null;
          sourcePlatform?: string | null;
          source?: "lastfm_track" | "lastfm_artist" | null;
          status?: string;
          title?: string;
          track?: string | null;
          artist?: string | null;
        };
      };

      console.log("[frequency][room-share-enrichment]", {
        event: "room_share_item_enrichment_completed",
        resolvedArtist: payload.result?.artist ?? null,
        resolvedKind: payload.result?.kind ?? null,
        resolvedTitle: payload.result?.track ?? payload.result?.title ?? null,
        roomId,
        itemId: shareRef.id,
        hasAppleMusic: Boolean(payload.result?.links?.appleMusic),
        primaryGenre: payload.result?.primaryGenre ?? null,
        hasSoundCloud: Boolean(payload.result?.links?.soundcloud),
        source: payload.result?.source ?? null,
        sourcePlatform: payload.result?.sourcePlatform ?? null,
        status: payload.result?.status ?? null,
        hasSpotify: Boolean(payload.result?.links?.spotify),
        hasYouTube: Boolean(payload.result?.links?.youtube),
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Room share enrichment request failed.";

    await setClientDocument(
      shareRef,
      {
        enrichmentStatus: "error",
        enrichmentError: errorMessage,
      },
      { merge: true },
      {
        triggerReason: "add_room_share_item_enrichment_network_failed",
        userId: addedBy,
      },
    );

    console.error("[frequency][room-share-enrichment]", {
      event: "room_share_item_enrichment_network_failed",
      roomId,
      itemId: shareRef.id,
      error: errorMessage,
    });
  }

  return shareRef.id;
}

export async function toggleRoomShareReaction({
  roomId,
  itemId,
  reaction,
  uid,
}: {
  roomId: string;
  itemId: string;
  reaction: RoomShareReactionKind;
  uid: string;
}) {
  const normalizedUid = uid.trim();

  if (!normalizedUid) {
    throw new Error("Sign in again before reacting.");
  }

  const itemRef = doc(db, "rooms", roomId, "items", itemId);
  const itemSnapshot = await getDoc(itemRef);

  if (!itemSnapshot.exists()) {
    throw new Error("This song could not be found.");
  }

  const item = normalizeRoomShareItem(itemSnapshot.data() as Partial<RoomShareItem>);
  const nextReactions = {
    ...item.reactions,
  } satisfies RoomShareReactions;
  const currentUsers = nextReactions[reaction] ?? [];

  nextReactions[reaction] = currentUsers.includes(normalizedUid)
    ? currentUsers.filter((entry) => entry !== normalizedUid)
    : [...currentUsers, normalizedUid];

  if (!nextReactions[reaction]?.length) {
    delete nextReactions[reaction];
  }

  await setClientDocument(
    itemRef,
    {
      reactions: nextReactions,
    },
    { merge: true },
    {
      triggerReason: "toggle_room_share_reaction",
      userId: normalizedUid,
    },
  );
}

export async function removeRoomShareItem({
  roomId,
  itemId,
  removedBy,
}: {
  roomId: string;
  itemId: string;
  removedBy: string;
}) {
  const itemRef = doc(db, "rooms", roomId, "items", itemId);
  const roomRef = doc(db, "rooms", roomId);
  const [itemSnapshot, roomSnapshot] = await Promise.all([getDoc(itemRef), getDoc(roomRef)]);

  if (!itemSnapshot.exists()) {
    throw new Error("That drop is already gone.");
  }

  const item = normalizeRoomShareItem(itemSnapshot.data() as Partial<RoomShareItem>);
  const room = roomSnapshot.exists()
    ? normalizeFrequencyRoom(roomSnapshot.data() as Partial<FrequencyRoom>)
    : null;
  const nextSongCount = room ? Math.max(room.songCount - 1, 0) : 0;

  console.log("[frequency][room-share]", {
    event: "room_share_item_remove_requested",
    roomId,
    itemId,
    channel: item.channel,
    title: item.title,
    removedBy,
  });

  await deleteDoc(itemRef);

  await setClientDocument(
    roomRef,
    {
      songCount: nextSongCount,
      activitySummary: `${item.title} was removed from ${item.channel}.`,
    },
    { merge: true },
    {
      triggerReason: "remove_room_share_item",
      userId: removedBy,
      writeType: "client_remove",
    },
  );

  console.log("[frequency][room-share]", {
    event: "room_share_item_removed",
    roomId,
    itemId,
    nextSongCount,
  });
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
        .map((roomDoc) => normalizeFrequencyRoom(roomDoc.data() as Partial<FrequencyRoom>))
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
      callback(
        snapshot.exists()
          ? normalizeFrequencyRoom(snapshot.data() as Partial<FrequencyRoom>)
          : null,
      );
    },
    () => {
      callback(null);
    },
  );
}

export function observeRoomShareItems(
  roomId: string,
  callback: (items: RoomShareItem[]) => void,
) {
  return onSnapshot(
    collection(db, "rooms", roomId, "items"),
    (snapshot) => {
      const items = sortRoomShareItemsByRecency(
        snapshot.docs.map((itemDoc) =>
          normalizeRoomShareItem(itemDoc.data() as Partial<RoomShareItem>),
        ),
      );
      callback(items);
    },
    () => {
      callback([]);
    },
  );
}

export function observeRoomShareItemsByRoomIds(
  roomIds: string[],
  callback: (items: RoomShareItem[]) => void,
) {
  const orderedRoomIds = Array.from(
    new Set(
      roomIds
        .map((roomId) => roomId.trim())
        .filter(Boolean),
    ),
  );

  if (!orderedRoomIds.length) {
    callback([]);
    return () => {};
  }

  const itemsByRoomId = new Map<string, RoomShareItem[]>();

  const emit = () => {
    const mergedItems = sortRoomShareItemsByRecency(
      Array.from(itemsByRoomId.values()).flat(),
    );
    callback(mergedItems);
  };

  const unsubscribers = orderedRoomIds.map((roomId) =>
    onSnapshot(
      collection(db, "rooms", roomId, "items"),
      (snapshot) => {
        itemsByRoomId.set(
          roomId,
          snapshot.docs.map((itemDoc) =>
            normalizeRoomShareItem(itemDoc.data() as Partial<RoomShareItem>),
          ),
        );
        emit();
      },
      () => {
        itemsByRoomId.delete(roomId);
        emit();
      },
    ),
  );

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
