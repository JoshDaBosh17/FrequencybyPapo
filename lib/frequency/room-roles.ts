import type { FrequencyRoom, RoomMemberRole } from "@/lib/types";

export function normalizeRoomMemberRole(value: unknown): RoomMemberRole | null {
  if (value === "owner" || value === "member") {
    return value;
  }

  if (value === "co-owner" || value === "coOwner" || value === "co_owner") {
    return "co-owner";
  }

  return null;
}

export function normalizeRoomMemberRoles(
  value: unknown,
  options: {
    createdBy?: string | null;
    memberIds?: string[];
  } = {},
) {
  const roles: Record<string, RoomMemberRole> = {};

  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [uid, role] of Object.entries(value)) {
      const normalizedUid = uid.trim();
      const normalizedRole = normalizeRoomMemberRole(role);

      if (normalizedUid && normalizedRole) {
        roles[normalizedUid] = normalizedRole;
      }
    }
  }

  const createdBy = options.createdBy?.trim() ?? "";
  const memberIds = options.memberIds ?? [];

  for (const memberId of memberIds) {
    const normalizedMemberId = memberId.trim();

    if (!normalizedMemberId) {
      continue;
    }

    roles[normalizedMemberId] =
      normalizedMemberId === createdBy ? "owner" : roles[normalizedMemberId] ?? "member";
  }

  if (createdBy) {
    roles[createdBy] = "owner";
  }

  return roles;
}

export function getRoomMemberRole(
  room: Pick<FrequencyRoom, "createdBy" | "memberIds" | "memberRoles">,
  uid?: string | null,
) {
  const normalizedUid = uid?.trim() ?? "";

  if (!normalizedUid) {
    return null;
  }

  const explicitRole = normalizeRoomMemberRole(room.memberRoles?.[normalizedUid]);

  if (explicitRole) {
    return explicitRole;
  }

  if (room.createdBy === normalizedUid) {
    return "owner";
  }

  if (room.memberIds.includes(normalizedUid)) {
    return "member";
  }

  return null;
}

export function getRoomMemberRoleLabel(role: RoomMemberRole | null | undefined) {
  if (role === "owner") {
    return "Owner";
  }

  if (role === "co-owner") {
    return "Co-owner";
  }

  if (role === "member") {
    return "Member";
  }

  return null;
}

export function canManageRoom(
  room: Pick<FrequencyRoom, "createdBy" | "memberIds" | "memberRoles">,
  uid?: string | null,
) {
  const role = getRoomMemberRole(room, uid);

  return role === "owner" || role === "co-owner";
}

export function canLeaveRoom(
  room: Pick<FrequencyRoom, "createdBy" | "memberIds" | "memberRoles">,
  uid?: string | null,
) {
  const normalizedUid = uid?.trim() ?? "";

  if (!normalizedUid || !room.memberIds.includes(normalizedUid)) {
    return false;
  }

  if (!canManageRoom(room, normalizedUid)) {
    return true;
  }

  return room.memberIds.some((memberId) => {
    if (memberId === normalizedUid) {
      return false;
    }

    return canManageRoom(room, memberId);
  });
}
