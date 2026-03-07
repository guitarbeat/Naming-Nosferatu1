import { useEffect } from "react";
import { create } from "zustand";
import { createErrorSlice } from "@/store/slices/errorSlice";
import { createTournamentSlice } from "@/store/slices/tournamentSlice";
import { createUserAndSettingsSlice } from "@/store/slices/userAndSettingsSlice";
import type { AppState } from "./types";

export type { TournamentActions } from "./types";

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
