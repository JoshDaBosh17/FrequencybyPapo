const ROOM_CODE_PREFIX = "RM";
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

function hashString(value: string, seed: number) {
  let hash = seed >>> 0;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function encodeHash(value: number, length: number) {
  let encoded = "";
  let remainder = value >>> 0;

  for (let index = 0; index < length; index += 1) {
    encoded = `${ROOM_CODE_ALPHABET[remainder % ROOM_CODE_ALPHABET.length]}${encoded}`;
    remainder = Math.floor(remainder / ROOM_CODE_ALPHABET.length);
  }

  return encoded.padStart(length, ROOM_CODE_ALPHABET[0]);
}

export function buildRoomCodeNormalized(roomId: string, attempt = 0) {
  return encodeHash(hashString(`${roomId}:${attempt}:room`, 2654435761), ROOM_CODE_LENGTH);
}

export function normalizeRoomCodeInput(value: string | null | undefined) {
  const sanitized = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!sanitized) {
    return null;
  }

  return sanitized.startsWith(ROOM_CODE_PREFIX) && sanitized.length > ROOM_CODE_LENGTH
    ? sanitized.slice(ROOM_CODE_PREFIX.length) || null
    : sanitized;
}

export function formatRoomCode(value: string | null | undefined) {
  const normalized = normalizeRoomCodeInput(value);

  if (!normalized) {
    return null;
  }

  const groups =
    normalized.length === ROOM_CODE_LENGTH
      ? [normalized.slice(0, 3), normalized.slice(3)]
      : normalized.match(/.{1,4}/g) ?? [normalized];

  return `${ROOM_CODE_PREFIX}-${groups.join("-")}`;
}

export function getRoomCodeCopyValue(value: string | null | undefined) {
  return formatRoomCode(value) ?? "";
}
