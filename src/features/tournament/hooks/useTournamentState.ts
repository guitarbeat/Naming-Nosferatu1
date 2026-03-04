import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { EloRating, generateRandomTeams, resolveTournamentMode } from "@/services/tournament";
import { useLocalStorage } from "@/shared/hooks";
import type {
	Match,
	MatchRecord,
	NameItem,
	PersistentTournamentState,
	TournamentMode,
} from "@/shared/types";
import {
	calculateTournamentMetrics,
	computeUpdatedRatings,
	createIdToNameMap,
	createMatchRecord,
	createTeamsById,
	deriveBracketState,
	type HistoryEntry,
	resolveCurrentMatch,
} from "./tournamentEngine";
import {
	buildInitialRatings,
	createBracketEntrants,
	createDefaultPersistentState,
	createNamesKey,
	createTournamentId,
	sanitizePersistentState,
} from "./tournamentPersistence";
import { useAudioManager } from "./useHelpers";

interface UseTournamentStateResult {
	currentMatch: Match | null;
	ratings: Record<string, number>;
	round: number;
	totalRounds: number;
	bracketStage: string;
	matchNumber: number;
	totalMatches: number;
	isComplete: boolean;
	tournamentMode: TournamentMode;
	handleVote: (winnerId: string, loserId: string) => void;
	handleUndo: () => void;
	canUndo: boolean;
	handleQuit: () => void;
	progress: number;
	etaMinutes: number;
	isVoting: boolean;
	handleVoteWithAnimation: (winnerId: string, loserId: string) => void;
	matchHistory: MatchRecord[];
}

const VOTE_COOLDOWN = 300;

function haveSameIds(a: string[], b: string[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	const left = [...a].sort();
	const right = [...b].sort();
	return left.every((id, index) => id === right[index]);
}

export function useTournamentState(names: NameItem[], userName?: string): UseTournamentStateResult {
	const toast = useToast();
	const audioManager = useAudioManager();
	const [isVoting, setIsVoting] = useState(false);
	const [ratings, setRatings] = useState<Record<string, number>>({});
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [refreshKey, setRefreshKey] = useState(0);
	const [elo] = useState(() => new EloRating());
	const tournamentMode = useMemo(() => resolveTournamentMode(names.length), [names.length]);

	const namesKey = useMemo(() => createNamesKey(names), [names]);
	const tournamentId = useMemo(() => createTournamentId(names, userName), [names, userName]);

	const defaultPersistentState = useMemo(
		() => createDefaultPersistentState(userName || "anonymous"),
		[userName],
	);

	const [persistentStateRaw, setPersistentState] = useLocalStorage<PersistentTournamentState>(
		tournamentId,
		defaultPersistentState,
		{ debounceWait: 1000 },
	);

	const persistentState = useMemo(
		(): PersistentTournamentState =>
			sanitizePersistentState(persistentStateRaw, userName || "anonymous"),
		[persistentStateRaw, userName],
	);

	const updatePersistentState = useCallback(
		(
			updates:
				| Partial<PersistentTournamentState>
				| ((prev: PersistentTournamentState) => Partial<PersistentTournamentState>),
		) => {
			setPersistentState((prev) => {
				const delta = typeof updates === "function" ? updates(prev) || {} : updates || {};
				return {
					...prev,
					...delta,
					lastUpdated: Date.now(),
					userName: userName || "anonymous",
				};
			});
		},
		[setPersistentState, userName],
	);

	const ratingsRef = useRef(ratings);
	const initializedRef = useRef(false);
	const lastNamesKeyRef = useRef("");

	useEffect(() => {
		ratingsRef.current = ratings;
	}, [ratings]);

	useEffect(() => {
		const isNewNames = lastNamesKeyRef.current !== namesKey;
		if (isNewNames) {
			initializedRef.current = false;
			lastNamesKeyRef.current = namesKey;
		}

		if (initializedRef.current) {
			return;
		}

		if (!Array.isArray(names) || names.length < 2) {
			return;
		}

		const hasValidPersistence =
			persistentState.namesKey === namesKey && persistentState.mode === tournamentMode;
		const initialRatings = buildInitialRatings(names);

		let teams = persistentState.teams;
		if (tournamentMode === "2v2" && teams.length < 2) {
			teams = generateRandomTeams(names.map((name) => ({ id: String(name.id), name: name.name })));
		}

		const participantIds =
			tournamentMode === "2v2"
				? teams.map((team) => team.id)
				: names.map((name) => String(name.id));
		const shouldResetBracket =
			!hasValidPersistence ||
			persistentState.bracketEntrants.length === 0 ||
			!haveSameIds(
				persistentState.bracketEntrants.filter((id) => !id.startsWith("__BYE__")),
				participantIds,
			);
		const bracketEntrants = shouldResetBracket
			? createBracketEntrants(participantIds)
			: persistentState.bracketEntrants;

		if (hasValidPersistence) {
			if (persistentState.ratings && Object.keys(persistentState.ratings).length > 0) {
				setRatings(persistentState.ratings);
			} else {
				setRatings(initialRatings);
			}

			if (shouldResetBracket || (tournamentMode === "2v2" && teams !== persistentState.teams)) {
				updatePersistentState({
					matchHistory: shouldResetBracket ? [] : persistentState.matchHistory,
					currentRound: 1,
					currentMatch: 1,
					totalMatches: Math.max(0, participantIds.length - 1),
					ratings: shouldResetBracket ? initialRatings : persistentState.ratings,
					teams,
					bracketEntrants,
				});
			}
		} else {
			setRatings(initialRatings);
			updatePersistentState({
				matchHistory: [],
				currentRound: 1,
				currentMatch: 1,
				totalMatches: Math.max(0, participantIds.length - 1),
				namesKey,
				ratings: initialRatings,
				mode: tournamentMode,
				teams: tournamentMode === "2v2" ? teams : [],
				teamMatches: [],
				teamMatchIndex: 0,
				bracketEntrants,
			});
		}

		initializedRef.current = true;
		setRefreshKey((k) => k + 1);
	}, [namesKey, persistentState, names, updatePersistentState, tournamentMode]);

	const idToNameMap = useMemo(() => createIdToNameMap(names), [names]);
	const teamsById = useMemo(() => createTeamsById(persistentState.teams), [persistentState.teams]);
	const bracketDerived = useMemo(
		() => deriveBracketState(persistentState.bracketEntrants, persistentState.matchHistory),
		[persistentState.bracketEntrants, persistentState.matchHistory],
	);

	const currentMatch = useMemo(() => {
		void refreshKey;
		return resolveCurrentMatch({
			tournamentMode,
			pendingMatchIds: bracketDerived.pendingMatchIds,
			teamsById,
			idToNameMap,
		});
	}, [refreshKey, idToNameMap, tournamentMode, bracketDerived.pendingMatchIds, teamsById]);

	const isComplete = bracketDerived.isComplete;
	const metrics = useMemo(
		() =>
			calculateTournamentMetrics({
				derived: bracketDerived,
			}),
		[bracketDerived],
	);
	const {
		totalMatches,
		matchNumber,
		round,
		totalRounds,
		stageLabel,
		roundSize,
		progress,
		etaMinutes,
	} = metrics;

	const handleVote = useCallback(
		(winnerId: string, loserId: string) => {
			if (!currentMatch) {
				return;
			}

			const ratingsSnapshot = ratingsRef.current;
			const newRatings = computeUpdatedRatings({
				currentMatch,
				tournamentMode,
				elo,
				ratingsSnapshot,
				winnerId,
				loserId,
			});

			setRatings(newRatings);

			const matchRecord: MatchRecord = createMatchRecord({
				currentMatch,
				winnerId,
				loserId,
				matchNumber,
				round,
			});

			setHistory((prev) => [
				...prev,
				{
					match: currentMatch,
					ratings: { ...ratingsSnapshot },
					round,
					matchNumber,
				},
			]);

			updatePersistentState((prev) => ({
				matchHistory: [...(prev.matchHistory || []), matchRecord],
				currentMatch: matchNumber + 1,
				currentRound: round,
				ratings: newRatings,
			}));

			setRefreshKey((k) => k + 1);
		},
		[currentMatch, elo, matchNumber, round, updatePersistentState, tournamentMode],
	);

	const handleVoteWithAnimation = useCallback(
		(winnerId: string, loserId: string) => {
			if (isVoting) {
				return;
			}
			setIsVoting(true);
			audioManager.playVoteSound();
			setTimeout(() => {
				handleVote(winnerId, loserId);
				setIsVoting(false);
			}, VOTE_COOLDOWN);
		},
		[handleVote, isVoting, audioManager],
	);

	const handleUndo = useCallback(() => {
		if (history.length === 0) {
			toast.showWarning("No more moves to undo");
			return;
		}

		const lastEntry = history[history.length - 1];
		if (!lastEntry) {
			return;
		}

		audioManager.playUndoSound();
		setRatings(lastEntry.ratings);
		setHistory((prev) => prev.slice(0, -1));
		setRefreshKey((k) => k + 1);

		updatePersistentState((prev) => {
			const newHistory = (prev.matchHistory || []).slice(0, -1);
			return {
				matchHistory: newHistory,
				currentMatch: Math.max(1, prev.currentMatch - 1),
				currentRound: Math.max(
					1,
					prev.currentRound - (prev.currentMatch % roundSize === 0 ? 1 : 0),
				),
				ratings: lastEntry.ratings,
			};
		});
	}, [audioManager, history, toast, updatePersistentState, roundSize]);

	const handleQuit = useCallback(() => {
		updatePersistentState({
			matchHistory: [],
			currentRound: 1,
			currentMatch: 1,
			totalMatches: 0,
			namesKey: "",
			ratings: {},
			mode: "1v1",
			teams: [],
			teamMatches: [],
			teamMatchIndex: 0,
			bracketEntrants: [],
		});
		setHistory([]);
		setRatings({});
		setRefreshKey((key) => key + 1);
	}, [updatePersistentState]);

	return {
		currentMatch,
		ratings,
		round,
		totalRounds,
		bracketStage: stageLabel,
		matchNumber,
		totalMatches,
		isComplete,
		tournamentMode,
		handleVote,
		handleUndo,
		canUndo: history.length > 0,
		handleQuit,
		progress,
		etaMinutes,
		isVoting,
		handleVoteWithAnimation,
		matchHistory: persistentState.matchHistory,
	};
}
