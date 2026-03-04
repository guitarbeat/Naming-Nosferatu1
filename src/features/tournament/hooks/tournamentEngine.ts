import { ELO_RATING } from "@/shared/lib/constants";
import type {
	Match,
	MatchRecord,
	NameItem,
	PersistentTournamentState,
	Team,
	TournamentMode,
} from "@/shared/types";
import { EloRating, applyTeamMatchElo } from "@/services/tournament";

export interface HistoryEntry {
	match: Match;
	ratings: Record<string, number>;
	round: number;
	matchNumber: number;
}

export interface TournamentMetrics {
	totalMatches: number;
	completedMatches: number;
	matchNumber: number;
	roundSize: number;
	round: number;
	progress: number;
	etaMinutes: number;
}

export function createIdToNameMap(names: NameItem[]): Map<string, NameItem> {
	const map = new Map<string, NameItem>();
	names.forEach((n) => {
		map.set(String(n.id), n);
	});
	return map;
}

export function createTeamsById(teams: Team[]): Map<string, Team> {
	const map = new Map<string, Team>();
	for (const team of teams) {
		map.set(team.id, team);
	}
	return map;
}

export function resolveCurrentMatch({
	tournamentMode,
	persistentState,
	teamsById,
	idToNameMap,
	sorter,
}: {
	tournamentMode: TournamentMode;
	persistentState: PersistentTournamentState;
	teamsById: Map<string, Team>;
	idToNameMap: Map<string, NameItem>;
	sorter: { getNextMatch: () => { left: string; right: string } | null };
}): Match | null {
	if (tournamentMode === "2v2") {
		const teamMatch = persistentState.teamMatches[persistentState.teamMatchIndex];
		if (!teamMatch) {
			return null;
		}
		const leftTeam = teamsById.get(teamMatch.leftTeamId);
		const rightTeam = teamsById.get(teamMatch.rightTeamId);
		if (!leftTeam || !rightTeam) {
			return null;
		}
		return {
			mode: "2v2",
			left: leftTeam,
			right: rightTeam,
		};
	}

	const nextMatch = sorter.getNextMatch();
	if (!nextMatch) {
		return null;
	}

	return {
		mode: "1v1",
		left: idToNameMap.get(nextMatch.left) || {
			id: nextMatch.left,
			name: nextMatch.left,
		},
		right: idToNameMap.get(nextMatch.right) || {
			id: nextMatch.right,
			name: nextMatch.right,
		},
	};
}

export function calculateTournamentMetrics({
	currentMatch,
	tournamentMode,
	persistentState,
	namesLength,
}: {
	currentMatch: Match | null;
	tournamentMode: TournamentMode;
	persistentState: PersistentTournamentState;
	namesLength: number;
}): TournamentMetrics {
	const isComplete = currentMatch === null;
	const totalMatches =
		tournamentMode === "2v2"
			? persistentState.teamMatches.length
			: (namesLength * (namesLength - 1)) / 2;
	const completedMatches = persistentState.matchHistory.length;
	const matchNumber = isComplete ? completedMatches : completedMatches + 1;
	const roundMatchIndex = Math.max(1, matchNumber);
	const roundSize =
		tournamentMode === "2v2" ? Math.max(1, persistentState.teams.length) : Math.max(1, namesLength);
	const round = Math.floor((roundMatchIndex - 1) / roundSize) + 1;
	const progress = totalMatches
		? Math.round((Math.min(completedMatches, totalMatches) / totalMatches) * 100)
		: 0;
	const etaMinutes =
		!totalMatches || completedMatches >= totalMatches
			? 0
			: Math.ceil(((totalMatches - completedMatches) * 3) / 60);

	return {
		totalMatches,
		completedMatches,
		matchNumber,
		roundSize,
		round,
		progress,
		etaMinutes,
	};
}

export function computeUpdatedRatings({
	currentMatch,
	tournamentMode,
	elo,
	ratingsSnapshot,
	winnerId,
	loserId,
}: {
	currentMatch: Match;
	tournamentMode: TournamentMode;
	elo: EloRating;
	ratingsSnapshot: Record<string, number>;
	winnerId: string;
	loserId: string;
}): Record<string, number> {
	if (tournamentMode === "2v2" && currentMatch.mode === "2v2") {
		const winnerSide = winnerId === currentMatch.left.id ? "left" : "right";
		return applyTeamMatchElo({
			elo,
			ratings: ratingsSnapshot,
			leftTeam: currentMatch.left,
			rightTeam: currentMatch.right,
			winnerSide,
		});
	}

	const winnerRating = ratingsSnapshot[winnerId] || ELO_RATING.DEFAULT_RATING;
	const loserRating = ratingsSnapshot[loserId] || ELO_RATING.DEFAULT_RATING;
	const leftId = String(typeof currentMatch.left === "object" ? currentMatch.left.id : currentMatch.left);
	const outcome = winnerId === leftId ? "left" : "right";
	const result = elo.calculateNewRatings(winnerRating, loserRating, outcome);

	return {
		...ratingsSnapshot,
		[winnerId]: result.newRatingA,
		[loserId]: result.newRatingB,
	};
}

export function createMatchRecord({
	currentMatch,
	winnerId,
	loserId,
	matchNumber,
	round,
}: {
	currentMatch: Match;
	winnerId: string;
	loserId: string;
	matchNumber: number;
	round: number;
}): MatchRecord {
	return {
		match: currentMatch,
		winner: winnerId,
		loser: loserId,
		voteType: "normal",
		matchNumber,
		roundNumber: round,
		timestamp: Date.now(),
	};
}
