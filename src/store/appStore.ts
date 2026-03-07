import { useEffect } from "react";
import { create } from "zustand";
import type { NameItem, RatingData, VoteRecord } from "@/shared/types";
import { createErrorSlice } from "@/store/slices/errorSlice";
import { createTournamentSlice } from "@/store/slices/tournamentSlice";
import { createUserAndSettingsSlice } from "@/store/slices/userAndSettingsSlice";
import type { AppState } from "./types";

export type {
	AppState,
	ErrorActions,
	SiteSettingsActions,
	TournamentActions,
	UIActions,
	UserActions,
} from "./types";

export type { NameItem, RatingData, VoteRecord };

const useAppStore = create<AppState>()((...args) => ({
	...createTournamentSlice(...args),
	...createUserAndSettingsSlice(...args),
	...createErrorSlice(...args),
}));

export default useAppStore;

export function useAppStoreInitialization(onUserContext?: (name: string) => void): void {
	const initUser = useAppStore((s) => s.userActions.initializeFromStorage);
	const initTheme = useAppStore((s) => s.uiActions.initializeTheme);

	useEffect(() => {
		initUser(onUserContext);
		initTheme();
	}, [initUser, initTheme, onUserContext]);
}

export const errorContexts = {
	tournamentFlow: "Tournament Flow",
	analysisDashboard: "Analysis Dashboard",
	mainLayout: "Main Application Layout",
} as const;
