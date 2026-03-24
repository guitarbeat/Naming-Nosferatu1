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

/**
 * Flexible rating input — accepts either a full RatingData object or a
 * bare number (interpreted as rating with 0 wins/losses).
 */
export type RatingInput = RatingData | number;

// ═══════════════════════════════════════════════════════════════════════════════
// Tournament Types
// ═══════════════════════════════════════════════════════════════════════════════

/** A single match pairing. */
export type TournamentMode = "1v1" | "2v2";

export interface Team {
	id: string;
	memberIds: string[];
	memberNames: string[];
}

export interface TeamMatch {
	leftTeamId: string;
	rightTeamId: string;
}

export interface HeadToHeadMatch {
	mode: "1v1";
	left: NameItem | string;
	right: NameItem | string;
}

export interface TeamVersusMatch {
	mode: "2v2";
	left: Team;
	right: Team;
}

export type Match = HeadToHeadMatch | TeamVersusMatch;

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
interface VoteParticipant {
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

/** Persisted tournament progress (for resume-after-refresh). */
export interface PersistentTournamentState {
	matchHistory: MatchRecord[];
	currentRound: number;
	currentMatch: number;
	totalMatches: number;
	userName: string;
	lastUpdated: number;
	namesKey: string;
	ratings: Record<string, number>;
	mode: TournamentMode;
	teams: Team[];
	teamMatches: TeamMatch[];
	teamMatchIndex: number;
	bracketEntrants: string[];
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
	isProfileOpen: boolean;
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
