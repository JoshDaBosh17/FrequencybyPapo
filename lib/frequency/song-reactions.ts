import type {
  RoomShareReactionKind,
  RoomShareReactions,
} from "@/lib/types";

export const SONG_REACTION_OPTIONS = [
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "love", emoji: "❤️", label: "Love" },
  { id: "headphones", emoji: "🐐", label: "GOAT" },
] satisfies Array<{
  id: RoomShareReactionKind;
  emoji: string;
  label: string;
}>;

export function buildSongReactionKey(
  roomId: string,
  itemId: string,
  reaction: RoomShareReactionKind,
) {
  return `${roomId}:${itemId}:${reaction}`;
}

export function getSongReactionCount(
  reactions: RoomShareReactions | null | undefined,
  reaction: RoomShareReactionKind,
) {
  return reactions?.[reaction]?.length ?? 0;
}

export function getSongReactionTotal(
  reactions: RoomShareReactions | null | undefined,
) {
  return SONG_REACTION_OPTIONS.reduce(
    (sum, reaction) => sum + getSongReactionCount(reactions, reaction.id),
    0,
  );
}
