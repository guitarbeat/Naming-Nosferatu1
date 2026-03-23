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
	if (streak >= STREAK_THRESHOLDS.blazing) {
		return "blazing";
	}
	if (streak >= STREAK_THRESHOLDS.hot) {
		return "hot";
	}
	if (streak >= STREAK_THRESHOLDS.warm) {
		return "warm";
	}
	return null;
}

export function getHeatCardClasses(heatLevel: HeatLevel | null): string {
	switch (heatLevel) {
		case "blazing":
			return "ring-2 ring-orange-100/85 shadow-[0_0_105px_rgba(249,115,22,0.52)]";
		case "hot":
			return "ring-2 ring-amber-200/65 shadow-[0_0_78px_rgba(251,191,36,0.42)]";
		case "warm":
			return "ring-1 ring-orange-200/30 shadow-[0_0_35px_rgba(249,115,22,0.24)]";
		default:
			return "";
	}
}

export function getHeatTextClasses(heatLevel: HeatLevel): string {
	switch (heatLevel) {
		case "blazing":
			return "text-orange-200 border-orange-300/45 bg-orange-500/15";
		case "hot":
			return "text-amber-200 border-amber-300/45 bg-amber-500/15";
		default:
			return "text-orange-100 border-orange-300/35 bg-orange-500/10";
	}
}

export function getHeatGradientClasses(heatLevel: HeatLevel): string {
	switch (heatLevel) {
		case "blazing":
			return "bg-gradient-to-t from-orange-500/45 via-amber-400/25 to-transparent";
		case "hot":
			return "bg-gradient-to-t from-orange-500/35 via-amber-300/20 to-transparent";
		default:
			return "bg-gradient-to-t from-orange-500/20 via-amber-200/10 to-transparent";
	}
}

export function getFlameCount(streak: number, max = 8): number {
	return Math.min(max, Math.max(3, Math.round(streak * 1.2)));
}
