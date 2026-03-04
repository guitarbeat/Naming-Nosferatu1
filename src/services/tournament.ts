import { CAT_IMAGES, ELO_RATING } from "@/shared/lib/constants";
/* =========================================================================
   SERVICE
   ========================================================================= */

/* =========================================================================
   ELO RATING
   ========================================================================= */

export class EloRating {
	constructor(
		public defaultRating: number = ELO_RATING.DEFAULT_RATING,
		public kFactor: number = ELO_RATING.DEFAULT_K_FACTOR,
	) {}
	getExpectedScore(ra: number, rb: number) {
		return 1 / (1 + 10 ** ((rb - ra) / ELO_RATING.RATING_DIVISOR));
	}
	updateRating(r: number, exp: number, act: number, games = 0) {
		// Double K-factor for new players (< 15 games) for faster convergence
		const k = games < ELO_RATING.NEW_PLAYER_GAME_THRESHOLD ? this.kFactor * 2 : this.kFactor;
		const updated = Math.round(r + k * (act - exp));
		return Math.max(ELO_RATING.MIN_RATING, Math.min(ELO_RATING.MAX_RATING, updated));
	}
	calculateNewRatings(
		ra: number,
		rb: number,
		outcome: string,
		stats?: { winsA: number; lossesA: number; winsB: number; lossesB: number },
	) {
		const expA = this.getExpectedScore(ra, rb);
		const expB = this.getExpectedScore(rb, ra);
		const actA = outcome === "left" ? 1 : outcome === "right" ? 0 : 0.5;
		const actB = outcome === "right" ? 1 : outcome === "left" ? 0 : 0.5;

		const winsA = (stats?.winsA || 0) + (actA === 1 ? 1 : 0);
		const lossesA = (stats?.lossesA || 0) + (actA === 0 ? 1 : 0);
		const winsB = (stats?.winsB || 0) + (actB === 1 ? 1 : 0);
		const lossesB = (stats?.lossesB || 0) + (actB === 0 ? 1 : 0);

		return {
			newRatingA: this.updateRating(ra, expA, actA),
			newRatingB: this.updateRating(rb, expB, actB),
			winsA,
			lossesA,
			winsB,
			lossesB,
		};
	}
}

/* =========================================================================
   PREFERENCE SORTER
   ========================================================================= */

export class PreferenceSorter {
	preferences = new Map<string, number>();
	currentIndex = 0;
	private matchHistory: string[] = [];
	private cachedPreferences: Set<string> | null = null; // Cache for faster lookups

	// Total possible pairs is N * (N - 1) / 2
	// We no longer store the `pairs` array to save memory (O(N^2) -> O(1))
	constructor(public items: string[]) {}

	/**
	 * Calculates the pair indices (i, j) corresponding to the linear index k.
	 * This avoids generating the O(N^2) pairs array.
	 */
	private getIndicesFromIndex(index: number, n: number) {
		let current = index;
		// Iterate through rows (i)
		for (let i = 0; i < n - 1; i++) {
			const pairsInRow = n - 1 - i;
			if (current < pairsInRow) {
				return { i, j: i + 1 + current };
			}
			current -= pairsInRow;
		}
		return null; // Index out of bounds
	}

	addPreference(a: string, b: string, val: number) {
		const key = `${a}-${b}`;
		this.preferences.set(key, val);
		this.matchHistory.push(key);
		this.currentIndex++;
		this.cachedPreferences = null; // Invalidate cache on preference change
	}

	undoLastPreference() {
		const lastMatch = this.matchHistory.pop();
		if (!lastMatch) {
			return;
		}
		this.preferences.delete(lastMatch);
		// Reset currentIndex to the number of remaining preferences so that
		// getNextMatch() re-scans from the correct position after an undo.
		this.currentIndex = this.matchHistory.length;
		this.cachedPreferences = null; // Invalidate cache on preference change
	}

	getNextMatch() {
		// Calculate total pairs: N * (N - 1) / 2
		const n = this.items.length;
		const totalPairs = (n * (n - 1)) / 2;

		if (n < 2) {
			return null;
		}

		// Build preference lookup set on first call (memoized)
		if (!this.cachedPreferences) {
			this.cachedPreferences = new Set(this.preferences.keys());
		}

		// Calculate initial (i, j) for currentIndex
		const indices = this.getIndicesFromIndex(this.currentIndex, n);
		if (!indices) {
			return null;
		}

		let { i, j } = indices;

		// Limit iterations to avoid long pauses (prevents O(N²) worst case)
		// In practice, we'll find a match quickly since most pairs aren't done
		const maxIterations = Math.min(totalPairs - this.currentIndex, 10000);
		let iterationCount = 0;

		while (this.currentIndex < totalPairs && iterationCount < maxIterations) {
			iterationCount++;
			const a = this.items[i];
			const b = this.items[j];

			if (a && b) {
				// Use cached Set for faster O(1) lookup vs Map
				const key1 = `${a}-${b}`;
				const key2 = `${b}-${a}`;
				if (!this.cachedPreferences.has(key1) && !this.cachedPreferences.has(key2)) {
					return { left: a, right: b };
				}
			}

			// Advance to next pair
			this.currentIndex++;
			j++;
			if (j >= n) {
				i++;
				j = i + 1;
			}
		}

		return null;
	}
}

/* =========================================================================
   GENERAL UTILS
   ========================================================================= */

/**
 * Calculate bracket round based on number of names and current match
 */
export function calculateBracketRound(totalNames: number, currentMatch: number): number {
	if (totalNames <= 2) {
		return 1;
	}
	const matchesPerRound = Math.ceil(totalNames / 2);
	return Math.ceil(currentMatch / matchesPerRound);
}

export { CAT_IMAGES };
