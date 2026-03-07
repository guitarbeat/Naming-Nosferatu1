import type { StateCreator } from "zustand";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import type { ThemePreference, ThemeValue, UserState } from "@/shared/types";
import {
	getInitialSwipeMode,
	getInitialTheme,
	getInitialUserState,
	IS_BROWSER,
	normalizeThemePreference,
	patch,
	readStorage,
	removeStorage,
	writeStorage,
} from "@/store/storeUtils";
import type { AppState } from "@/store/types";

let systemThemeCleanup: (() => void) | null = null;

export const createUserAndSettingsSlice: StateCreator<
	AppState,
	[],
	[],
	Pick<
		AppState,
		"user" | "userActions" | "ui" | "uiActions" | "siteSettings" | "siteSettingsActions"
	>
> = (set, get) => ({
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
			const pref = normalizeThemePreference(readStorage(STORAGE_KEYS.THEME));
			get().uiActions.setTheme(pref as ThemePreference);
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

	siteSettings: {
		catChosenName: null,
		isLoaded: false,
	},

	siteSettingsActions: {
		setCatChosenName: (data) => patch(set, "siteSettings", { catChosenName: data }),
		markSettingsLoaded: () => patch(set, "siteSettings", { isLoaded: true }),
	},
});
