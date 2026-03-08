/**
 * @module navConfig
 * @description Centralized configuration for navigation structure and section mapping.
 * Extracted from FluidNav.tsx to consolidate nav configuration.
 */

import {
	BarChart3,
	CheckCircle,
	Layers,
	LayoutGrid,
	Lightbulb,
	Trophy,
	User,
} from "@/shared/lib/icons";

/** Map navigation keys to section IDs (for scroll targeting) */
export const keyToSectionId: Record<string, string> = {
	pick: "pick",
	play: "play",
	analyze: "analysis",
	suggest: "suggest",
	profile: "profile",
};

/** Navigation section configuration */
export const navSections = {
	pick: {
		id: "pick",
		label: "Pick",
		icon: CheckCircle,
	},
	play: {
		id: "play",
		label: "Play",
		icon: Trophy,
	},
	analyze: {
		id: "analyze",
		label: "Analyze",
		icon: BarChart3,
	},
	suggest: {
		id: "suggest",
		label: "Suggest",
		icon: Lightbulb,
	},
	profile: {
		id: "profile",
		label: "Profile",
		icon: User,
	},
} as const;

/** View mode toggle icons */
export const viewModeIcons = {
	swipe: Layers,
	grid: LayoutGrid,
} as const;

/** Navigation animation and display constants */
export const navAnimations = {
	navTransitionDuration: 500,
	navSpringConfig: {
		stiffness: 260,
		damping: 20,
	},
	scrollSmoothBehavior: "smooth" as const,
} as const;

export type NavSectionKey = keyof typeof navSections;
