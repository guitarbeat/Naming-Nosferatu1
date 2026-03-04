import { shuffleArray } from "@/shared/lib/basic";
import { ELO_RATING } from "@/shared/lib/constants";
import type {
	NameItem,
	PersistentTournamentState,
	Team,
	TeamMatch,
	TournamentMode,
} from "@/shared/types";

export function createDefaultPersistentState(userName: string): PersistentTournamentState {
	return {
		matchHistory: [],
		currentRound: 1,
		currentMatch: 1,
		totalMatches: 0,
		userName: userName || "anonymous",
		lastUpdated: Date.now(),
		namesKey: "",
		ratings: {},
		mode: "1v1",
		teams: [],
		teamMatches: [],
		teamMatchIndex: 0,
		bracketEntrants: [],
	};
}

export function buildInitialRatings(names: NameItem[]): Record<string, number> {
	const initial: Record<string, number> = {};
	for (const name of names) {
		initial[String(name.id)] = name.rating || ELO_RATING.DEFAULT_RATING;
	}
	return initial;
}

export function createNamesKey(names: NameItem[]): string {
	return names
		.map((n) => n?.id || n?.name || "")
		.filter(Boolean)
		.map(String)
		.sort()
		.join(",");
}

export function createTournamentId(names: NameItem[], userName?: string): string {
	const sortedNames = names
		.map((n) => n.name || String(n.id))
		.sort()
		.join("-");
	const prefix = userName || "anonymous";
	return `tournament-${prefix}-${sortedNames}`;
}

export function createBracketEntrants(participantIds: string[]): string[] {
	return shuffleArray(participantIds);
}

function isValidTeam(value: unknown): value is Team {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Team;
	return (
		typeof candidate.id === "string" &&
		Array.isArray(candidate.memberIds) &&
		candidate.memberIds.length === 2 &&
		Array.isArray(candidate.memberNames) &&
		candidate.memberNames.length === 2
	);
}

function isValidTeamMatch(value: unknown): value is TeamMatch {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as TeamMatch;
	return typeof candidate.leftTeamId === "string" && typeof candidate.rightTeamId === "string";
}

export function sanitizePersistentState(
	persistentStateRaw: unknown,
	userName: string,
): PersistentTournamentState {
	if (
		!persistentStateRaw ||
		typeof persistentStateRaw !== "object" ||
		Array.isArray(persistentStateRaw)
	) {
		return createDefaultPersistentState(userName || "anonymous");
	}

	const merged = {
		...createDefaultPersistentState(userName || "anonymous"),
		...(persistentStateRaw as Record<string, unknown>),
	};

	const mode: TournamentMode = merged.mode === "2v2" ? "2v2" : "1v1";
	const teams = Array.isArray(merged.teams) ? merged.teams.filter(isValidTeam) : [];
	const teamMatches = Array.isArray(merged.teamMatches)
		? merged.teamMatches.filter(isValidTeamMatch)
		: [];

	return {
		...merged,
		mode,
		matchHistory: Array.isArray(merged.matchHistory) ? merged.matchHistory : [],
		ratings: merged.ratings && typeof merged.ratings === "object" ? merged.ratings : {},
		namesKey: typeof merged.namesKey === "string" ? merged.namesKey : "",
		teams,
		teamMatches,
		teamMatchIndex:
			typeof merged.teamMatchIndex === "number" && merged.teamMatchIndex >= 0
				? merged.teamMatchIndex
				: 0,
		bracketEntrants: Array.isArray(merged.bracketEntrants)
			? merged.bracketEntrants.map(String)
			: [],
	} as PersistentTournamentState;
}
