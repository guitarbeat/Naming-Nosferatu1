import type { StateCreator } from "zustand";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import type { ThemePreference, ThemeValue, UserState } from "@/shared/types";
import type { AppState } from "./types";

export type SetFn = Parameters<StateCreator<AppState>>[0];

export function patch<K extends keyof AppState>(
	set: SetFn,
	key: K,
	updates: Partial<AppState[K]>,
): void {
	set((state) => ({
		...state,
		[key]: { ...state[key], ...updates },
	}));
}

export function readStorage(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function writeStorage(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* ignore */
	}
}

export function removeStorage(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch {
		/* ignore */
	}
}

export const IS_BROWSER = typeof window !== "undefined";
export const IS_DEV = import.meta.env?.DEV ?? false;

export function getInitialUserState(): UserState {
	const base: UserState = {
		id: null,
		name: "",
		isLoggedIn: false,
		isAdmin: false,
		preferences: {},
	};

	if (!IS_BROWSER) {
		return base;
	}

	const stored = readStorage(STORAGE_KEYS.USER);
	if (stored?.trim()) {
		try {
			const parsed = JSON.parse(stored);
			if (typeof parsed === "string") {
				return { ...base, name: parsed, isLoggedIn: true };
			}
			if (parsed && typeof parsed === "object" && parsed.name) {
				return { ...base, name: parsed.name, isLoggedIn: true, isAdmin: !!parsed.isAdmin };
			}
		} catch {
			return { ...base, name: stored.trim(), isLoggedIn: true };
		}
	}
	return base;
}

export function getInitialTheme(): Pick<AppState["ui"], "theme" | "themePreference"> {
	if (!IS_BROWSER) {
		return { theme: "dark", themePreference: "dark" };
	}

	const stored = readStorage(STORAGE_KEYS.THEME);
	if (stored === "light" || stored === "dark" || stored === "system") {
		const resolved: ThemeValue =
			stored === "system"
				? window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light"
				: stored;
		return { theme: resolved, themePreference: stored };
	}
	return { theme: "dark", themePreference: "dark" };
}

export function getInitialSwipeMode(): boolean {
	if (!IS_BROWSER) {
		return false;
	}
	return readStorage(STORAGE_KEYS.SWIPE_MODE) === "true";
}

export function normalizeThemePreference(value: string | null): ThemePreference {
	const raw = value ?? "dark";
	return (["light", "dark", "system"].includes(raw) ? raw : "dark") as ThemePreference;
}
