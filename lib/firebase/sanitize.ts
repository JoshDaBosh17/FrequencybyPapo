export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((entry) => removeUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (isPlainObject(value)) {
    const cleanedEntries = Object.entries(value).flatMap(([key, entry]) => {
      const cleanedValue = removeUndefinedDeep(entry);
      return cleanedValue === undefined ? [] : [[key, cleanedValue] as const];
    });

    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
}
