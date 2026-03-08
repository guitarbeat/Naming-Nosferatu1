/**
 * @module appStore
 * @description Centralized Zustand store for the entire application.
 *
 * Combines five concerns into isolated slices:
 *
 * 1. **Tournament** — names, ratings, vote history, selection
 * 2. **User** — identity, login/logout, avatar, admin status
 * 3. **UI** — theme, swipe mode, panels, editing state
 * 4. **Site Settings** — chosen name, feature flags
 * 5. **Errors** — current error, error history
 *
 * Also exports:
 * - Route + layout configuration (`routes`, `layoutConfig`)
 * - Navigation section configuration (`navSections`, `navAnimations`)
 * - Standalone selectors for granular subscriptions
 * - `useAppStoreInitialization` hook for bootstrapping from localStorage
 *
 * ## Design decisions
 *
 * - **No external service imports.** API calls are injected via action
 *   parameters or called by the consumer — keeps the store testable.
 * - **Domain types imported from `@/shared/types`.** The types file is
 *   the single source of truth; this file only adds action interfaces.
 * - **Theme listener is properly scoped.** `setTheme` tears down the
 *   previous `matchMedia` listener before attaching a new one (no leak).
 * - **Selectors are standalone functions.** Use `useAppStore(selectUserName)`
 *   for optimal re-render granularity.
 */

import { useEffect } from "react";
import { create, type StateCreator } from "zustand";
import { STORAGE_KEYS } from "@/shared/lib/constants";

import type {
	CatChosenName,
	ErrorLog,
	ErrorState,
	NameItem,
	RatingData,
	SiteSettingsState,
	ThemePreference,
	ThemeValue,
	TournamentState,
	UIState,
	UserState,
	VoteRecord,
} from "@/shared/types";

// Re-export domain types so consumers can import from either location
export type { NameItem, RatingData, VoteRecord };

// ═══════════════════════════════════════════════════════════════════════════════
// Action Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

export interface TournamentActions {
	setNames: (names: NameItem[] | null) => void;
	setRatings: (
		ratings:
			| Record<string, RatingData>
			| ((prev: Record<string, RatingData>) => Record<string, RatingData>),
	) => void;
	setComplete: (isComplete: boolean) => void;
	setLoading: (isLoading: boolean) => void;
	addVote: (vote: VoteRecord) => void;
	resetTournament: () => void;
	setSelection: (names: NameItem[]) => void;
}

interface UserActions {
	setUser: (data: Partial<UserState>) => void;
	login: (userName: string, onContext?: (name: string) => void) => void;
	logout: (onContext?: (name: null) => void) => void;
	setAdminStatus: (isAdmin: boolean) => void;
	setAvatar: (avatarUrl: string | undefined) => void;
	initializeFromStorage: (onContext?: (name: string) => void) => void;
}

interface UIActions {
	setTheme: (theme: ThemePreference) => void;
	initializeTheme: () => void;
	setMatrixMode: (enabled: boolean) => void;
	setGlobalAnalytics: (show: boolean) => void;
	setSwipeMode: (enabled: boolean) => void;
	setCatPictures: (show: boolean) => void;
	setUserComparison: (show: boolean) => void;
	setEditingProfile: (editing: boolean) => void;
}

interface SiteSettingsActions {
	setCatChosenName: (data: CatChosenName | null) => void;
	markSettingsLoaded: () => void;
}

interface ErrorActions {
	setError: (error: unknown | null) => void;
	clearError: () => void;
	logError: (error: unknown, context: string, metadata?: Record<string, unknown>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Combined Store Type
// ═══════════════════════════════════════════════════════════════════════════════

interface AppState {
	tournament: TournamentState;
	tournamentActions: TournamentActions;

	user: UserState;
	userActions: UserActions;

	ui: UIState;
	uiActions: UIActions;

	siteSettings: SiteSettingsState;
	siteSettingsActions: SiteSettingsActions;

	errors: ErrorState;
	errorActions: ErrorActions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

type SetFn = Parameters<StateCreator<AppState>>[0];

/** Merge partial updates into a nested slice. */
function patch<K extends keyof AppState>(set: SetFn, key: K, updates: Partial<AppState[K]>): void {
	set((state) => ({
		...state,
		[key]: { ...state[key], ...updates },
	}));
}

function readStorage(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* quota or security error */
	}
}

function removeStorage(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch {
		/* ignore */
	}
}

const IS_BROWSER = typeof window !== "undefined";
const IS_DEV = import.meta.env?.DEV ?? false;

// ═══════════════════════════════════════════════════════════════════════════════
// Initial State Readers
// ═══════════════════════════════════════════════════════════════════════════════

function getInitialUserState(): UserState {
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
			if (typeof parsed === "string") return { ...base, name: parsed, isLoggedIn: true };
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

function getInitialTheme(): Pick<UIState, "theme" | "themePreference"> {
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

function getInitialSwipeMode(): boolean {
	if (!IS_BROWSER) {
		return false;
	}
	return readStorage(STORAGE_KEYS.SWIPE_MODE) === "true";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tournament Slice
// ═══════════════════════════════════════════════════════════════════════════════

const createTournamentSlice: StateCreator<
	AppState,
	[],
	[],
	Pick<AppState, "tournament" | "tournamentActions">
> = (set, get) => ({
	tournament: {
		names: null,
		ratings: {},
		isComplete: false,
		isLoading: false,
		voteHistory: [],
		selectedNames: [],
	},

	tournamentActions: {
		setNames: (names) => {
			const currentRatings = get().tournament.ratings;
			patch(set, "tournament", {
				names:
					names?.map((n) => ({
						id: n.id,
						name: n.name,
						description: n.description,
						rating: currentRatings[n.name]?.rating ?? 1500,
					})) ?? null,
			});
		},

		setRatings: (ratingsOrFn) => {
			const current = get().tournament.ratings;
			const next = typeof ratingsOrFn === "function" ? ratingsOrFn(current) : ratingsOrFn;
			patch(set, "tournament", { ratings: { ...current, ...next } });
		},

		setComplete: (isComplete) => patch(set, "tournament", { isComplete }),
		setLoading: (isLoading) => patch(set, "tournament", { isLoading }),

		addVote: (vote) =>
			patch(set, "tournament", {
				voteHistory: [...get().tournament.voteHistory, vote],
			}),

		resetTournament: () =>
			patch(set, "tournament", {
				names: null,
				isComplete: false,
				voteHistory: [],
				isLoading: false,
			}),

		setSelection: (selectedNames) => patch(set, "tournament", { selectedNames }),
	},
});

// ═══════════════════════════════════════════════════════════════════════════════
// User & UI & Site Settings Slice
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Teardown handle for the system theme `matchMedia` listener.
 * Stored at module scope so `setTheme` can remove the old listener
 * before attaching a new one (prevents leak on repeated calls).
 */
let systemThemeCleanup: (() => void) | null = null;

const createUserAndSettingsSlice: StateCreator<
	AppState,
	[],
	[],
	Pick<
		AppState,
		"user" | "userActions" | "ui" | "uiActions" | "siteSettings" | "siteSettingsActions"
	>
> = (set, get) => ({
	// ── User ────────────────────────────────────────────────────────────────

	user: getInitialUserState(),

	userActions: {
		setUser: (data) => {
			patch(set, "user", data);
			const name = data.name ?? get().user.name;
			if (name) {
				writeStorage(STORAGE_KEYS.USER, name);
			} else {
				removeStorage(STORAGE_KEYS.USER);
			}
		},

		login: (userName, onContext) => {
			patch(set, "user", { name: userName, isLoggedIn: true });
			writeStorage(STORAGE_KEYS.USER, userName);
			onContext?.(userName);
		},

		logout: (onContext) => {
			removeStorage(STORAGE_KEYS.USER);
			onContext?.(null);
			set((state) => ({
				...state,
				user: { ...state.user, name: "", isLoggedIn: false, isAdmin: false },
				tournament: {
					...state.tournament,
					names: null,
					isComplete: false,
					voteHistory: [],
				},
			}));
		},

		setAdminStatus: (isAdmin) => patch(set, "user", { isAdmin }),

		setAvatar: (avatarUrl) => {
			patch(set, "user", { avatarUrl });
			if (avatarUrl) {
				writeStorage(STORAGE_KEYS.USER_AVATAR, avatarUrl);
			} else {
				removeStorage(STORAGE_KEYS.USER_AVATAR);
			}
		},

		initializeFromStorage: (onContext) => {
			const storedUser = readStorage(STORAGE_KEYS.USER);
			const storedAvatar = readStorage(STORAGE_KEYS.USER_AVATAR);
			const updates: Partial<UserState> = {};

			if (storedUser && get().user.name !== storedUser) {
				onContext?.(storedUser);
				updates.name = storedUser;
				updates.isLoggedIn = true;
			}
			if (storedAvatar && get().user.avatarUrl !== storedAvatar) {
				updates.avatarUrl = storedAvatar;
			}
			if (Object.keys(updates).length > 0) {
				patch(set, "user", updates);
			}
		},
	},

	// ── UI ───────────────────────────────────────────────────────────────────

	ui: {
		...getInitialTheme(),
		showGlobalAnalytics: false,
		showUserComparison: false,
		matrixMode: false,
		isSwipeMode: getInitialSwipeMode(),
		showCatPictures: true,
		isEditingProfile: false,
	},

	uiActions: {
		setTheme: (preference) => {
			systemThemeCleanup?.();
			systemThemeCleanup = null;

			let resolved: ThemeValue;

			if (preference === "system" && IS_BROWSER) {
				const mql = window.matchMedia("(prefers-color-scheme: dark)");
				resolved = mql.matches ? "dark" : "light";

				const onChange = (e: MediaQueryListEvent) => {
					if (get().ui.themePreference === "system") {
						patch(set, "ui", { theme: e.matches ? "dark" : "light" });
					}
				};
				mql.addEventListener("change", onChange);
				systemThemeCleanup = () => mql.removeEventListener("change", onChange);
			} else {
				resolved = preference === "light" ? "light" : "dark";
			}

			patch(set, "ui", { theme: resolved, themePreference: preference });
			writeStorage(STORAGE_KEYS.THEME, preference);
		},

		initializeTheme: () => {
			if (!IS_BROWSER) {
				return;
			}
			const stored = readStorage(STORAGE_KEYS.THEME) ?? "dark";
			const pref = (
				["light", "dark", "system"].includes(stored) ? stored : "dark"
			) as ThemePreference;
			get().uiActions.setTheme(pref);
		},

		setMatrixMode: (enabled) => patch(set, "ui", { matrixMode: enabled }),
		setGlobalAnalytics: (show) => patch(set, "ui", { showGlobalAnalytics: show }),

		setSwipeMode: (enabled) => {
			patch(set, "ui", { isSwipeMode: enabled });
			writeStorage(STORAGE_KEYS.SWIPE_MODE, String(enabled));
		},

		setCatPictures: (show) => patch(set, "ui", { showCatPictures: show }),
		setUserComparison: (show) => patch(set, "ui", { showUserComparison: show }),
		setEditingProfile: (editing) => patch(set, "ui", { isEditingProfile: editing }),
	},

	// ── Site Settings ────────────────────────────────────────────────────────

	siteSettings: {
		catChosenName: null,
		isLoaded: false,
	},

	siteSettingsActions: {
		setCatChosenName: (data) => patch(set, "siteSettings", { catChosenName: data }),
		markSettingsLoaded: () => patch(set, "siteSettings", { isLoaded: true }),
	},
});

// ═══════════════════════════════════════════════════════════════════════════════
// Error Slice
// ═══════════════════════════════════════════════════════════════════════════════

const createErrorSlice: StateCreator<
	AppState,
	[],
	[],
	Pick<AppState, "errors" | "errorActions">
> = (set, get) => ({
	errors: {
		current: null,
		history: [],
	},

	errorActions: {
		setError: (error) => {
			const log: ErrorLog | null = error
				? {
						error,
						context: "setError",
						metadata: {},
						timestamp: new Date().toISOString(),
					}
				: null;

			patch(set, "errors", {
				current: error,
				history: log ? [...get().errors.history, log] : get().errors.history,
			});
		},

		clearError: () => patch(set, "errors", { current: null }),

		logError: (error, context, metadata = {}) => {
			const entry: ErrorLog = {
				error,
				context,
				metadata,
				timestamp: new Date().toISOString(),
			};

			patch(set, "errors", {
				history: [...get().errors.history, entry],
			});

			if (IS_DEV) {
				console.error("[Store] Error logged:", entry);
			}
		},
	},
});

// ═══════════════════════════════════════════════════════════════════════════════
// Store Creation
// ═══════════════════════════════════════════════════════════════════════════════

const useAppStore = create<AppState>()((...args) => ({
	...createTournamentSlice(...args),
	...createUserAndSettingsSlice(...args),
	...createErrorSlice(...args),
}));

export default useAppStore;

// ═══════════════════════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════════════════════
//
// Use: `const userName = useAppStore(selectUserName);`

// ═══════════════════════════════════════════════════════════════════════════════
// Initialization Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Call once at the app root to hydrate the store from localStorage.
 *
 * @param onUserContext - Optional callback invoked with the stored username
 *   (e.g., to set Supabase user context).
 *
 * @example
 * function App() {
 *   useAppStoreInitialization((name) => updateSupabaseUserContext(name));
 *   return <Router />;
 * }
 */
export function useAppStoreInitialization(onUserContext?: (name: string) => void): void {
	const initUser = useAppStore((s) => s.userActions.initializeFromStorage);
	const initTheme = useAppStore((s) => s.uiActions.initializeTheme);

	useEffect(() => {
		initUser(onUserContext);
		initTheme();
	}, [initUser, initTheme, onUserContext]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// App Route Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export const errorContexts = {
	tournamentFlow: "Tournament Flow",
	analysisDashboard: "Analysis Dashboard",
	mainLayout: "Main Application Layout",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Navigation Configuration
// ═══════════════════════════════════════════════════════════════════════════════
