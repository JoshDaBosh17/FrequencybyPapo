const FRIEND_CODE_PREFIX = "FRQ";
const FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FRIEND_CODE_LENGTH = 10;

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
    encoded = `${FRIEND_CODE_ALPHABET[remainder % FRIEND_CODE_ALPHABET.length]}${encoded}`;
    remainder = Math.floor(remainder / FRIEND_CODE_ALPHABET.length);
  }

  return encoded.padStart(length, FRIEND_CODE_ALPHABET[0]);
}

export function buildFriendCodeNormalized(uid: string, attempt = 0) {
  // Keep the code deterministic for a given uid, while allowing collision retries
  // if a generated candidate is ever already taken by another profile.
  const left = encodeHash(hashString(`${uid}:${attempt}:left`, 2166136261), 5);
  const right = encodeHash(hashString(`${uid}:${attempt}:right`, 3141592653), 5);

  return `${left}${right}`;
}

export function normalizeFriendCodeInput(value: string | null | undefined) {
  const sanitized = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!sanitized) {
    return null;
  }

  return sanitized.startsWith(FRIEND_CODE_PREFIX) && sanitized.length > FRIEND_CODE_LENGTH
    ? sanitized.slice(FRIEND_CODE_PREFIX.length) || null
    : sanitized;
}

export function formatFriendCode(value: string | null | undefined) {
  const normalized = normalizeFriendCodeInput(value);

  if (!normalized) {
    return null;
  }

  const groups =
    normalized.length === FRIEND_CODE_LENGTH
      ? [normalized.slice(0, 5), normalized.slice(5)]
      : normalized.match(/.{1,4}/g) ?? [normalized];

  return `${FRIEND_CODE_PREFIX}-${groups.join("-")}`;
}

export function getFriendCodeCopyValue(value: string | null | undefined) {
  return formatFriendCode(value) ?? "";
}
