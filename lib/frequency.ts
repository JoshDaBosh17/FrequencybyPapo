import type { FrequencyRoom, UserProfile } from "@/lib/types";
import { formatCount } from "./utils";

export const PLACEHOLDER_ROOM_SONGS = [
  {
    id: "placeholder-1",
    title: "First songs land here",
    artist: "Frequency",
    duration: "0:00",
    context: "Song activity will show up as soon as the room starts moving.",
    artworkColor: "#d9a85e",
  },
  {
    id: "placeholder-2",
    title: "Shared queue coming next",
    artist: "Frequency",
    duration: "0:00",
    context: "Playback stays stubbed for now while rooms and auth become real.",
    artworkColor: "#8bb9d8",
  },
];

export const PLACEHOLDER_ROOM_TRENDS = [
  {
    id: "trend-1",
    title: "The room is ready for a first signal",
    detail: "One song or one person is enough to turn this into a shared space.",
  },
  {
    id: "trend-2",
    title: "Genre channels are already seeded",
    detail: "House, Afro House, Rap, Chill, and the social layers are ready to go.",
  },
  {
    id: "trend-3",
    title: "Invites are next",
    detail: "You can prepare the room now and bring people in once links are live.",
  },
];

export function buildHomeGreeting(profile: UserProfile | null) {
  const firstName = profile?.displayName?.split(" ")[0] ?? "there";
  return `Welcome back, ${firstName}`;
}

export function buildHomeSubtitle(profile: UserProfile | null, rooms: FrequencyRoom[]) {
  if (!rooms.length) {
    return "Start with your taste, then give it a room to live in.";
  }

  if (!profile?.favoriteArtists.length) {
    return "Your rooms are live. Add a few favorite artists to sharpen the vibe.";
  }

  return `${formatCount(rooms.length, "room")} ready for you and ${profile.favoriteArtists.length} artist cues shaping the vibe.`;
}

export function buildRoomDescriptor(room: FrequencyRoom) {
  if (room.starterVibe) {
    return `${room.starterVibe} leaning`;
  }

  return room.songCount > 0 ? "Shared room energy building" : "Ready for its first shared signal";
}
