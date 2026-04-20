export function buildRoomInvitePath(roomCode: string | null | undefined) {
  if (!roomCode) {
    return null;
  }

  return `/join/room/${encodeURIComponent(roomCode)}`;
}

export function buildFriendInvitePath(friendCode: string | null | undefined) {
  if (!friendCode) {
    return null;
  }

  return `/join/friend/${encodeURIComponent(friendCode)}`;
}

export function buildAbsoluteInviteUrl(path: string | null | undefined, origin?: string | null) {
  if (!path) {
    return null;
  }

  const resolvedOrigin =
    origin?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!resolvedOrigin) {
    return path;
  }

  return new URL(path, resolvedOrigin).toString();
}
