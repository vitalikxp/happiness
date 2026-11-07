// Browser persistence (localStorage, per device). Storage may be missing or full (private mode,
// quotas): every access is guarded and the game keeps working without it.

const PREFIX = 'happiness.';

export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** Returns false when the value could not be stored. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
