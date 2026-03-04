import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { EloRating, PreferenceSorter, buildTeamMatches, generateRandomTeams, resolveTournamentMode } from "@/services/tournament";
import { useLocalStorage } from "@/shared/hooks";
import type { Match, MatchRecord, NameItem, PersistentTournamentState, TournamentMode } from "@/shared/types";
import { useAudioManager } from "./useHelpers";
import {
	calculateTournamentMetrics,
	computeUpdatedRatings,
	createIdToNameMap,
	createMatchRecord,
	createTeamsById,
	resolveCurrentMatch,
	type HistoryEntry,
} from "./tournamentEngine";
import {
	buildInitialRatings,
	createDefaultPersistentState,
	createNamesKey,
	createTournamentId,
	sanitizePersistentState,
} from "./tournamentPersistence";

export interface UseTournamentStateResult {
	currentMatch: Match | null;
	ratings: Record<string, number>;
	round: number;
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

	const sorter = useMemo(() => new PreferenceSorter(names.map((n) => String(n.id))), [names]);
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

		if (hasValidPersistence) {
			if (tournamentMode === "1v1" && sorter.currentIndex === 0 && persistentState.matchHistory.length > 0) {
				for (const record of persistentState.matchHistory) {
					if (record.winner && record.loser) {
						sorter.addPreference(record.winner, record.loser, 1);
					}
				}
			}

			if (persistentState.ratings && Object.keys(persistentState.ratings).length > 0) {
				setRatings(persistentState.ratings);
			} else {
				setRatings(buildInitialRatings(names));
			}

			if (tournamentMode === "2v2") {
				const shouldRebuildTeams = persistentState.teams.length < 2;
				const shouldRebuildMatches = persistentState.teamMatches.length === 0;
				if (shouldRebuildTeams || shouldRebuildMatches) {
					const generatedTeams = generateRandomTeams(
						names.map((name) => ({ id: String(name.id), name: name.name })),
					);
					const generatedMatches = buildTeamMatches(generatedTeams);
					updatePersistentState({
						teams: generatedTeams,
						teamMatches: generatedMatches,
						totalMatches: generatedMatches.length,
						teamMatchIndex: Math.min(persistentState.teamMatchIndex, generatedMatches.length),
					});
				}
			}
		} else {
			const initialRatings = buildInitialRatings(names);

			if (tournamentMode === "2v2") {
				const generatedTeams = generateRandomTeams(
					names.map((name) => ({ id: String(name.id), name: name.name })),
				);
				const generatedMatches = buildTeamMatches(generatedTeams);
				setRatings(initialRatings);
				updatePersistentState({
					matchHistory: [],
					currentRound: 1,
					currentMatch: 1,
					totalMatches: generatedMatches.length,
					namesKey,
					ratings: initialRatings,
					mode: "2v2",
					teams: generatedTeams,
					teamMatches: generatedMatches,
					teamMatchIndex: 0,
				});
			} else {
				const estimatedMatches = (names.length * (names.length - 1)) / 2;
				setRatings(initialRatings);
				updatePersistentState({
					matchHistory: [],
					currentRound: 1,
					currentMatch: 1,
					totalMatches: estimatedMatches,
					namesKey,
					ratings: initialRatings,
					mode: "1v1",
					teams: [],
					teamMatches: [],
					teamMatchIndex: 0,
				});
			}
		}

		initializedRef.current = true;
		setRefreshKey((k) => k + 1);
	}, [namesKey, persistentState, sorter, names, updatePersistentState, tournamentMode]);

	const idToNameMap = useMemo(() => createIdToNameMap(names), [names]);
	const teamsById = useMemo(() => createTeamsById(persistentState.teams), [persistentState.teams]);

	const currentMatch = useMemo(() => {
		void refreshKey;
		return resolveCurrentMatch({
			tournamentMode,
			persistentState,
			teamsById,
			idToNameMap,
			sorter,
		});
	}, [sorter, refreshKey, idToNameMap, tournamentMode, persistentState.teamMatches, persistentState.teamMatchIndex, teamsById]);

	const isComplete = currentMatch === null;
	const metrics = useMemo(
		() =>
			calculateTournamentMetrics({
				currentMatch,
				tournamentMode,
				persistentState,
				namesLength: names.length,
			}),
		[currentMatch, tournamentMode, persistentState, names.length],
	);
	const { totalMatches, matchNumber, round, roundSize, progress, etaMinutes } = metrics;

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
				teamMatchIndex:
					tournamentMode === "2v2" ? Math.min(prev.teamMatchIndex + 1, prev.teamMatches.length) : prev.teamMatchIndex,
				ratings: newRatings,
			}));

			if (tournamentMode === "1v1") {
				sorter.addPreference(winnerId, loserId, 1);
			}

			setRefreshKey((k) => k + 1);
		},
		[currentMatch, elo, matchNumber, round, sorter, updatePersistentState, tournamentMode],
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
		if (tournamentMode === "1v1") {
			sorter.undoLastPreference();
		}
		setRefreshKey((k) => k + 1);

		updatePersistentState((prev) => {
			const newHistory = (prev.matchHistory || []).slice(0, -1);
			return {
				matchHistory: newHistory,
				currentMatch: Math.max(1, prev.currentMatch - 1),
				currentRound: Math.max(1, prev.currentRound - (prev.currentMatch % roundSize === 0 ? 1 : 0)),
				teamMatchIndex:
					tournamentMode === "2v2" ? Math.max(0, prev.teamMatchIndex - 1) : prev.teamMatchIndex,
				ratings: lastEntry.ratings,
			};
		});
	}, [audioManager, history, sorter, toast, updatePersistentState, tournamentMode, roundSize]);

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
		});
		setHistory([]);
		setRatings({});
		setRefreshKey((key) => key + 1);
	}, [updatePersistentState]);

	return {
		currentMatch,
		ratings,
		round,
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
