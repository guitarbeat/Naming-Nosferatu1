import type {
	CatChosenName,
	ErrorState,
	NameItem,
	RatingData,
	SiteSettingsState,
	TournamentState,
	UIState,
	UserState,
	VoteRecord,
} from "@/shared/types";

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

export interface UserActions {
	setUser: (data: Partial<UserState>) => void;
	login: (userName: string, onContext?: (name: string) => void) => void;
	logout: (onContext?: (name: null) => void) => void;
	setAdminStatus: (isAdmin: boolean) => void;
	setAvatar: (avatarUrl: string | undefined) => void;
	initializeFromStorage: (onContext?: (name: string) => void) => void;
}

export interface UIActions {
	setTheme: (theme: "light" | "dark" | "system") => void;
	initializeTheme: () => void;
	setMatrixMode: (enabled: boolean) => void;
	setGlobalAnalytics: (show: boolean) => void;
	setSwipeMode: (enabled: boolean) => void;
	setCatPictures: (show: boolean) => void;
	setUserComparison: (show: boolean) => void;
	setEditingProfile: (editing: boolean) => void;
}

export interface SiteSettingsActions {
	setCatChosenName: (data: CatChosenName | null) => void;
	markSettingsLoaded: () => void;
}

export interface ErrorActions {
	setError: (error: unknown | null) => void;
	clearError: () => void;
	logError: (error: unknown, context: string, metadata?: Record<string, unknown>) => void;
}

export interface AppState {
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
