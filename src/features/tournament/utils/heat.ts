/**
 * @module heat
 * @description Heat/streak visual utilities for tournament UI
 */

export type HeatLevel = "warm" | "hot" | "blazing";

export const STREAK_THRESHOLDS = {
	warm: 3,
	hot: 5,
	blazing: 7,
} as const;

export function getHeatLevel(streak: number): HeatLevel | null {
	if (streak >= STREAK_THRESHOLDS.blazing) return "blazing";
	if (streak >= STREAK_THRESHOLDS.hot) return "hot";
	if (streak >= STREAK_THRESHOLDS.warm) return "warm";
	return null;
}

export function getHeatCardClasses(heatLevel: HeatLevel | null): string {
	switch (heatLevel) {
		case "blazing":
			return "border-orange-200/40 bg-orange-500/[0.05] shadow-[0_16px_40px_rgba(249,115,22,0.14)]";
		case "hot":
			return "border-amber-200/35 bg-amber-500/[0.04] shadow-[0_12px_30px_rgba(251,191,36,0.1)]";
		case "warm":
			return "border-orange-200/20 bg-orange-500/[0.03]";
		default:
			return "";
	}
}

export function getHeatTextClasses(heatLevel: HeatLevel): string {
	switch (heatLevel) {
		case "blazing":
			return "text-orange-100 border-orange-300/30 bg-orange-500/10";
		case "hot":
			return "text-amber-100 border-amber-300/30 bg-amber-500/10";
		default:
			return "text-orange-50 border-orange-300/20 bg-orange-500/[0.08]";
	}
}

export function getHeatLabel(heatLevel: HeatLevel): string {
	switch (heatLevel) {
		case "blazing":
			return "Blazing streak";
		case "hot":
			return "Hot streak";
		default:
			return "Warm streak";
	}
}
