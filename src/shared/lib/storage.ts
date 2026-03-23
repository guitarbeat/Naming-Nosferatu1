import { STORAGE_KEYS } from "./constants";

export function isStorageAvailable(): boolean {
        try {
                return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
        } catch {
                return false;
        }
}

export function getStorageString(key: string, fallback: string | null = null): string | null {
        if (!isStorageAvailable()) {
                return fallback;
        }

        try {
                return window.localStorage.getItem(key);
        } catch {
                return fallback;
        }
}

export function setStorageString(key: string, value: string): void {
        if (!isStorageAvailable()) {
                return;
        }

        try {
                window.localStorage.setItem(key, value);
        } catch {
                /* quota or privacy-mode errors */
        }
}

export function removeStorageItem(key: string): void {
        if (!isStorageAvailable()) {
                return;
        }

        try {
                window.localStorage.removeItem(key);
        } catch {
                /* quota or privacy-mode errors */
        }
}

export function parseJsonValue<T>(value: string | null, fallback: T): T {
        if (value === null) {
                return fallback;
        }

        try {
                return JSON.parse(value) as T;
        } catch {
                return fallback;
        }
}

export function readStorageJson<T>(key: string, fallback: T): T {
        return parseJsonValue<T>(getStorageString(key), fallback);
}

export function writeStorageJson<T>(key: string, value: T): void {
        if (!isStorageAvailable()) {
                return;
        }

        try {
                window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
                /* quota or privacy-mode errors */
        }
}

/**
 * Clears all persisted user data from localStorage on logout.
 *
 * Keys are derived from STORAGE_KEYS to avoid string-drift regressions.
 * "ratings_fallback" is an app-internal key that is not in STORAGE_KEYS.
 *
 * Call from every logout path (appStore.logout, supabaseAuthAdapter.logout)
 * so both share a single source of truth for what gets cleared.
 */
export function clearUserStorage(): void {
        const keysToRemove: string[] = [
                STORAGE_KEYS.USER,
                STORAGE_KEYS.USER_ID,
                STORAGE_KEYS.USER_AVATAR,
                STORAGE_KEYS.THEME,
                STORAGE_KEYS.SWIPE_MODE,
                STORAGE_KEYS.TOURNAMENT,
                STORAGE_KEYS.USER_STORAGE,
                "ratings_fallback",
        ];

        for (const key of keysToRemove) {
                removeStorageItem(key);
        }
}
