import { ELO_RATING } from "@/shared/lib/constants";
import type { Team, TeamMatch, TournamentMode } from "@/shared/types";
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
		// Use constant multiplier for new players (< 15 games) for faster convergence
		const kMultiplier =
			games < ELO_RATING.NEW_PLAYER_GAME_THRESHOLD ? ELO_RATING.NEW_PLAYER_K_MULTIPLIER : 1;
		const k = this.kFactor * kMultiplier;
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

		const gamesA = (stats?.winsA || 0) + (stats?.lossesA || 0);
		const gamesB = (stats?.winsB || 0) + (stats?.lossesB || 0);

		return {
			newRatingA: this.updateRating(ra, expA, actA, gamesA),
			newRatingB: this.updateRating(rb, expB, actB, gamesB),
			winsA,
			lossesA,
			winsB,
			lossesB,
		};
	}
}

const clampRating = (rating: number): number =>
	Math.max(ELO_RATING.MIN_RATING, Math.min(ELO_RATING.MAX_RATING, rating));

export function resolveTournamentMode(selectedCount: number): TournamentMode {
	return selectedCount >= 4 && selectedCount % 4 === 0 ? "2v2" : "1v1";
}

function shuffleArray<T>(items: T[]): T[] {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffled[i];
		shuffled[i] = shuffled[j] as T;
		shuffled[j] = temp as T;
	}
	return shuffled;
}

export function generateRandomTeams(participants: Array<{ id: string; name: string }>): Team[] {
	const shuffled = shuffleArray(participants);
	const teams: Team[] = [];

	for (let i = 0; i + 1 < shuffled.length; i += 2) {
		const first = shuffled[i];
		const second = shuffled[i + 1];
		if (!first || !second) {
			continue;
		}
		teams.push({
			id: `team-${teams.length + 1}`,
			memberIds: [first.id, second.id],
			memberNames: [first.name, second.name],
		});
	}

	return teams;
}

export function buildTeamMatches(teams: Team[]): TeamMatch[] {
	const matches: TeamMatch[] = [];
	for (let i = 0; i < teams.length - 1; i += 1) {
		for (let j = i + 1; j < teams.length; j += 1) {
			const left = teams[i];
			const right = teams[j];
			if (!left || !right) {
				continue;
			}
			matches.push({ leftTeamId: left.id, rightTeamId: right.id });
		}
	}
	return matches;
}

export function applyTeamMatchElo({
	elo,
	ratings,
	leftTeam,
	rightTeam,
	winnerSide,
}: {
	elo: EloRating;
	ratings: Record<string, number>;
	leftTeam: Team;
	rightTeam: Team;
	winnerSide: "left" | "right";
}): Record<string, number> {
	const leftRatings = leftTeam.memberIds.map((id) => ratings[id] ?? ELO_RATING.DEFAULT_RATING);
	const rightRatings = rightTeam.memberIds.map((id) => ratings[id] ?? ELO_RATING.DEFAULT_RATING);
	const leftAverage = leftRatings.reduce((sum, value) => sum + value, 0) / leftRatings.length;
	const rightAverage = rightRatings.reduce((sum, value) => sum + value, 0) / rightRatings.length;

	const teamResult = elo.calculateNewRatings(leftAverage, rightAverage, winnerSide);
	const leftDeltaPerMember = teamResult.newRatingA - leftAverage;
	const rightDeltaPerMember = teamResult.newRatingB - rightAverage;

	const nextRatings = { ...ratings };
	for (const memberId of leftTeam.memberIds) {
		const current = ratings[memberId] ?? ELO_RATING.DEFAULT_RATING;
		nextRatings[memberId] = clampRating(Math.round(current + leftDeltaPerMember));
	}
	for (const memberId of rightTeam.memberIds) {
		const current = ratings[memberId] ?? ELO_RATING.DEFAULT_RATING;
		nextRatings[memberId] = clampRating(Math.round(current + rightDeltaPerMember));
	}

	return nextRatings;
}

export function getBracketStageLabel(round: number, totalRounds: number): string {
	const safeRound = Math.max(1, round);
	const safeTotal = Math.max(1, totalRounds);
	const remaining = safeTotal - safeRound;

	if (remaining <= 0) {
		return "Final";
	}
	if (remaining === 1) {
		return "Semifinal";
	}
	if (remaining === 2) {
		return "Quarterfinal";
	}
	return `Round ${safeRound}`;
}
