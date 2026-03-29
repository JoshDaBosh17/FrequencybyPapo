function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function toComparableValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => toComparableValue(entry))
      .filter((entry) => entry !== undefined);
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).flatMap(([key, entry]) => {
      const comparable = toComparableValue(entry);
      return comparable === undefined ? [] : [[key, comparable] as const];
    });

    return Object.fromEntries(entries);
  }

  return undefined;
}

function pickCurrentComparable(current: unknown, shape: unknown): unknown {
  if (shape === undefined) {
    return undefined;
  }

  if (
    shape === null ||
    typeof shape === "string" ||
    typeof shape === "number" ||
    typeof shape === "boolean"
  ) {
    if (current instanceof Date) {
      return current.toISOString();
    }

    return current;
  }

  if (Array.isArray(shape)) {
    if (!Array.isArray(current)) {
      return current;
    }

    return current.map((entry) => toComparableValue(entry));
  }

  if (isPlainObject(shape)) {
    const source = isPlainObject(current) ? current : {};
    const entries = Object.entries(shape).map(([key, value]) => [
      key,
      pickCurrentComparable(source[key], value),
    ]);

    return Object.fromEntries(entries);
  }

  return undefined;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((entry, index) => deepEqual(entry, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
}

export type FirestoreWriteAnalysis = {
  comparablePayload: unknown;
  comparableCurrent: unknown;
  meaningfullyChanged: boolean;
  hasComparablePayload: boolean;
};

const triggerWriteCounts = new Map<string, number>();
let totalWriteEvents = 0;

export function recordWriteTrigger(triggerReason: string, executed: boolean) {
  if (process.env.NODE_ENV !== "development") {
    return {
      triggerCount: 0,
      totalWriteEvents: 0,
      topTriggers: [] as Array<{ triggerReason: string; count: number }>,
    };
  }

  totalWriteEvents += 1;
  const key = `${triggerReason}:${executed ? "executed" : "skipped"}`;
  const nextCount = (triggerWriteCounts.get(key) ?? 0) + 1;
  triggerWriteCounts.set(key, nextCount);

  const topTriggers = [...triggerWriteCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ triggerReason: reason, count }));

  return {
    triggerCount: nextCount,
    totalWriteEvents,
    topTriggers,
  };
}

export function analyzeFirestoreWrite(
  currentData: unknown,
  payload: Record<string, unknown>,
): FirestoreWriteAnalysis {
  const comparablePayload = toComparableValue(payload);
  const hasComparablePayload =
    comparablePayload !== undefined &&
    (!isPlainObject(comparablePayload) || Object.keys(comparablePayload).length > 0);
  const comparableCurrent = hasComparablePayload
    ? pickCurrentComparable(currentData, comparablePayload)
    : undefined;

  return {
    comparablePayload,
    comparableCurrent,
    meaningfullyChanged: hasComparablePayload
      ? !deepEqual(comparableCurrent, comparablePayload)
      : false,
    hasComparablePayload,
  };
}
