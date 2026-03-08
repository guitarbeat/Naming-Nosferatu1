/**
 * @module GlassPresets
 * @description Standardized glass configuration presets for LiquidGlass components.
 * Single source of truth for glassmorphism effects across the app.
 */

export interface GlassPreset {
	radius: number;
	frost: number;
	saturation: number;
	outputBlur: number;
	inputBlur?: number;
	scale?: number;
	width?: number;
	height?: number;
}

/**
 * Standardized glass presets for consistent glassmorphism effects
 */
export const GLASS_PRESETS = {
	/**
	 * Card preset - Used for ProfileSection, NameSuggestion, and similar containers
	 * Provides a subtle, elegant frosted glass effect
	 */
	card: {
		radius: 24,
		frost: 0.2,
		saturation: 1.1,
		outputBlur: 0.8,
	} satisfies GlassPreset,

	/**
	 * Toast preset - Used for notification toasts
	 * Lighter effect for quick-dismiss UI elements
	 */
	toast: {
		radius: 10,
		frost: 0.02,
		saturation: 1.0,
		outputBlur: 0.4,
		inputBlur: 6,
		scale: -100,
		width: 280,
		height: 60,
	} satisfies GlassPreset,

	/**
	 * Modal preset - Used for modal dialogs
	 * Stronger effect for overlay contexts
	 */
	modal: {
		radius: 20,
		frost: 0.08,
		saturation: 1.05,
		outputBlur: 1.2,
		inputBlur: 8,
		scale: -80,
		width: 500,
		height: 600,
	} satisfies GlassPreset,

	/**
	 * Panel preset - Used for larger containers and panels
	 * Balanced effect for content-heavy areas
	 */
	panel: {
		radius: 16,
		frost: 0.15,
		saturation: 1.08,
		outputBlur: 0.6,
	} satisfies GlassPreset,

	/**
	 * Subtle preset - Used for minimal glass effects
	 * Very light frosting for backgrounds
	 */
	subtle: {
		radius: 12,
		frost: 0.05,
		saturation: 1.02,
		outputBlur: 0.3,
	} satisfies GlassPreset,
} as const;

export function getGlassPreset(name: keyof typeof GLASS_PRESETS): GlassPreset {
	return GLASS_PRESETS[name];
}
