/**
 * @module constants
 * @description Centralized application configuration and constants.
 *
 * Every exported object uses `as const` for literal type inference.
 * Organize new constants under the most specific existing section,
 * or add a clearly-labeled new section at the bottom.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Cat Images
// ═══════════════════════════════════════════════════════════════════════════════

export const CAT_IMAGES = [
	"/assets/images/IMG_4844.avif",
	"/assets/images/IMG_4845.avif",
	"/assets/images/IMG_4846.avif",
	"/assets/images/IMG_4847.avif",
	"/assets/images/IMG_5044.avif",
	"/assets/images/IMG_5071.avif",
	"/assets/images/IMG_0778.avif",
	"/assets/images/IMG_0779.avif",
	"/assets/images/IMG_0865.avif",
	"/assets/images/IMG_0884.avif",
	"/assets/images/IMG_0923.avif",
	"/assets/images/IMG_1116.avif",
	"/assets/images/IMG_7205.avif",
	"/assets/images/75209580524__60DCC26F-55A1-4EF8-A0B2-14E80A026A8D.avif",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Elo Rating System
// ═══════════════════════════════════════════════════════════════════════════════

export const ELO_RATING = {
	DEFAULT_RATING: 1500,
	DEFAULT_K_FACTOR: 40,
	MIN_RATING: 800,
	MAX_RATING: 2400,
	RATING_DIVISOR: 400,

	// K-factor adjustment thresholds
	LOW_RATING_THRESHOLD: 1400,
	HIGH_RATING_THRESHOLD: 2000,
	NEW_PLAYER_GAME_THRESHOLD: 15,

	// K-factor multipliers
	NEW_PLAYER_K_MULTIPLIER: 2,
	EXTREME_RATING_K_MULTIPLIER: 1.5,

	// Match outcome scores
	WIN_SCORE: 1,
	LOSS_SCORE: 0,
	BOTH_WIN_SCORE: 0.7,
	NEITHER_WIN_SCORE: 0.3,
	TIE_SCORE: 0.5,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Local Storage Keys
// ═══════════════════════════════════════════════════════════════════════════════

export const STORAGE_KEYS = {
	USER: "catNamesUser",
	USER_ID: "catNamesUserId",
	USER_AVATAR: "catNamesUserAvatar",
	THEME: "theme",
	SWIPE_MODE: "tournamentSwipeMode",
	TOURNAMENT: "tournament-storage",
	USER_STORAGE: "user-storage",
	ANALYSIS_DASHBOARD_COLLAPSED: "analysis-dashboard-collapsed",
	ADMIN_ANALYTICS_COLLAPSED: "admin-analytics-collapsed",
	NAVBAR_COLLAPSED: "navbar-collapsed",
	SOUND_ENABLED: "soundEnabled",
	MUSIC_VOLUME: "musicVolume",
	EFFECTS_VOLUME: "effectsVolume",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Animation & Timing
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMING = {
	RIPPLE_ANIMATION_DURATION_MS: 400,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Notifications
// ═══════════════════════════════════════════════════════════════════════════════

export const NOTIFICATION = {
	ERROR_DURATION_MS: 5000,
	MAX_TOASTS: 5,
} as const;

export const FILTER_OPTIONS = {
	VISIBILITY: {
		ALL: "all",
		VISIBLE: "visible",
		HIDDEN: "hidden",
	},
} as const;
