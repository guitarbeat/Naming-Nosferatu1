/**
 * @module shared/types
 * @description Canonical type definitions for the application.
 *
 * This is the single source of truth for all shared types. Domain types
 * (NameItem, RatingData, etc.) live here; store-specific slice types
 * live in appStore.ts and import from here.
 *
 * ## Guidelines
 * - Keep types that are used across 2+ files here.
 * - Component-local types belong in the component file.
 * - Store action/slice types belong in appStore.ts (they import domain types from here).
 * - Never duplicate a type — import it.
 */

import type React from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// Identifiers
// ═══════════════════════════════════════════════════════════════════════════════

/** IDs may be strings (UUIDs) or numbers (auto-increment). */
export type IdType = string | number;

// ═══════════════════════════════════════════════════════════════════════════════
// Core Domain Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A name entry — the fundamental data unit of the app.
 *
 * Uses both `camelCase` and `snake_case` for hidden/rating fields to
 * accommodate both client conventions and raw database rows.
 */
export interface NameItem {
	id: IdType;
	name: string;
	description?: string;
	pronunciation?: string;

	// Visibility
	isHidden?: boolean;
	is_hidden?: boolean;

	// Admin controls
	lockedIn?: boolean;
	locked_in?: boolean;
	sortOrder?: number;
	sort_order?: number;

	// Ratings & stats
	rating?: number;
	avgRating?: number;
	avg_rating?: number;
	wins?: number;
	losses?: number;
	popularity_score?: number;

	// Selection (client-side UI state)
	isSelected?: boolean;

	// Provenance & lifecycle
	owner?: string;
	status?: "candidate" | "intake" | "tournament" | "eliminated" | "archived";
	provenance?: ProvenanceEntry[];

	/** Allow additional database columns without type errors. */
	[key: string]: unknown;
}

export interface ProvenanceEntry {
	action: string;
	timestamp: string;
	userId?: string;
	details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rating Types
// ═══════════════════════════════════════════════════════════════════════════════

/** A rating record with win/loss counts. */
export interface RatingData {
	rating: number;
	wins: number;
	losses: number;
}

/** A named rating entry (for arrays/lists). */
export interface RatingItem extends RatingData {
	name: string;
}

/**
 * Flexible rating input — accepts either a full RatingData object or a
 * bare number (interpreted as rating with 0 wins/losses).
 */
export type RatingInput = RatingData | number;

// ═══════════════════════════════════════════════════════════════════════════════
// Tournament Types
// ═══════════════════════════════════════════════════════════════════════════════

/** A single match pairing. */
export interface Match {
	left: NameItem | string;
	right: NameItem | string;
}

/** Serialized record of a completed match. */
export interface MatchRecord {
	match: Match;
	winner: string | null;
	loser: string | null;
	voteType: string;
	matchNumber: number;
	roundNumber: number;
	timestamp: number;
}

/** A vote participant with outcome metadata. */
export interface VoteParticipant {
	name: string;
	id: IdType | null;
	description: string;
	outcome: string;
}

/** Full vote data payload (sent to analytics / API). */
export interface VoteData {
	match: {
		left: VoteParticipant;
		right: VoteParticipant;
	};
	result: number;
	ratings: Record<string, number>;
	timestamp: string;
}

/** Minimal vote record for store history. */
export interface VoteRecord {
	winnerId: IdType;
	loserId: IdType;
	timestamp: number;
	[key: string]: unknown;
}

/** Props for the core Tournament component. */
export interface TournamentProps {
	names: NameItem[];
	existingRatings?: Record<string, RatingInput>;
	onComplete: (ratings: Record<string, RatingData>) => void;
	userName?: string;
	onVote?: (voteData: VoteData) => Promise<void> | void;
}

/** UI-facing tournament state (for display components). */
export interface TournamentUIState {
	currentMatch: Match | null;
	currentMatchNumber: number;
	roundNumber: number;
	totalMatches: number;
	currentRatings: Record<string, RatingData>;
	isTransitioning: boolean;
	isError: boolean;
	canUndo: boolean;
	sorter: unknown;
}

/** Persisted tournament progress (for resume-after-refresh). */
export interface PersistentTournamentState {
	matchHistory: MatchRecord[];
	currentRound: number;
	currentMatch: number;
	totalMatches: number;
	userName: string;
	lastUpdated: number;
	namesKey: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filter Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface TournamentFilters {
	category?: string;
	filterStatus?: "all" | "visible" | "hidden";
	userFilter?: "all" | "user" | "other";
	selectionFilter?: "all" | "selected" | "unselected";
	dateFilter?: "all" | "today" | "week" | "month";
	searchTerm?: string;
}

export type NameManagementViewExtensions = {
	header?: React.ReactNode | (() => React.ReactNode);
	dashboard?: React.ReactNode | React.ComponentType | (() => React.ReactNode);
	contextLogic?: React.ReactNode | (() => React.ReactNode);
	bulkActions?: React.ReactNode | React.ComponentType | (() => React.ReactNode);
} & Record<string, unknown>;

export interface UseNameManagementViewProps {
	mode: "tournament" | "profile";
	userName?: string;
	profileProps?: Record<string, unknown>;
	tournamentProps?: Record<string, unknown>;
	analysisMode: boolean;
	setAnalysisMode: React.Dispatch<React.SetStateAction<boolean>>;
	extensions?: NameManagementViewExtensions;
}

export interface UseNameManagementViewResult {
	names: NameItem[];
	filteredNames: NameItem[];
	filteredNamesForSwipe: NameItem[];
	sortedNames: NameItem[];

	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	dataError: Error | null;
	refetch: () => void;
	clearErrors: () => void;

	setNames: (updater: NameItem[] | ((prev: NameItem[]) => NameItem[])) => void;
	setHiddenIds: (ids: Set<string | number>) => void;

	selectedNames: NameItem[];
	selectedIds: Set<IdType>;
	selectedCount: number;
	isSelected: (id: IdType) => boolean;

	isSelectionMode: boolean;
	setIsSelectionMode: (value: boolean) => void;

	toggleName: (name: NameItem) => void;
	toggleNameById: (id: IdType) => void;
	toggleNamesByIds: (ids: IdType[]) => void;
	clearSelection: () => void;
	selectAll: () => void;

	filterStatus: "all" | "visible" | "hidden";
	setFilterStatus: React.Dispatch<React.SetStateAction<"all" | "visible" | "hidden">>;
	showSelectedOnly: boolean;
	setShowSelectedOnly: React.Dispatch<React.SetStateAction<boolean>>;
	selectionFilter: "all" | "selected" | "unselected";
	setSelectionFilter: React.Dispatch<React.SetStateAction<"all" | "selected" | "unselected">>;
	userFilter: "all" | "user" | "other";
	setUserFilter: React.Dispatch<React.SetStateAction<"all" | "user" | "other">>;
	dateFilter: "all" | "today" | "week" | "month";
	setDateFilter: React.Dispatch<React.SetStateAction<"all" | "today" | "week" | "month">>;
	searchTerm: string;
	setSearchTerm: React.Dispatch<React.SetStateAction<string>>;

	isSwipeMode: boolean;
	showCatPictures: boolean;

	activeTab: string;
	setActiveTab: React.Dispatch<React.SetStateAction<string>>;

	stats: {
		total: number;
		visible: number;
		hidden: number;
		selected: number;
	};

	filterConfig: TournamentFilters;
	handleFilterChange: (name: keyof TournamentFilters, value: string | number | boolean) => void;
	handleAnalysisModeToggle: () => void;

	profileProps: Record<string, unknown>;
	tournamentProps: Record<string, unknown>;
	analysisMode: boolean;
	setAnalysisMode: React.Dispatch<React.SetStateAction<boolean>>;
	extensions: NameManagementViewExtensions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Site Settings
// ═══════════════════════════════════════════════════════════════════════════════

export interface CatChosenName {
	first_name: string;
	middle_names: string[];
	last_name: string;
	greeting_text: string;
	display_name: string;
	is_set: boolean;
	show_banner: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// User Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface UserPreferences {
	theme?: string;
	notifications?: boolean;
	showCatPictures?: boolean;
	matrixMode?: boolean;
}

export interface UserBubbleProfile {
	username: string;
	display_name?: string;
	avatar_url?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store State Types
// ═══════════════════════════════════════════════════════════════════════════════
//
// These define the *shape* of each store slice. Action interfaces live in
// appStore.ts because they reference `set`/`get` closures.

export interface UserState {
	id: string | null;
	name: string;
	isLoggedIn: boolean;
	isAdmin: boolean;
	avatarUrl?: string;
	preferences: UserPreferences;
}

export type ThemeValue = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

export interface UIState {
	theme: ThemeValue;
	themePreference: ThemePreference;
	showGlobalAnalytics: boolean;
	showUserComparison: boolean;
	matrixMode: boolean;
	isSwipeMode: boolean;
	showCatPictures: boolean;
	isEditingProfile: boolean;
}

export interface TournamentState {
	names: NameItem[] | null;
	ratings: Record<string, RatingData>;
	isComplete: boolean;
	isLoading: boolean;
	voteHistory: VoteRecord[];
	selectedNames: NameItem[];
}

export interface SiteSettingsState {
	catChosenName: CatChosenName | null;
	isLoaded: boolean;
}

export interface ErrorLog {
	error: unknown;
	context: string;
	metadata: Record<string, unknown>;
	timestamp: string;
}

export interface ErrorState {
	current: unknown | null;
	history: ErrorLog[];
}
