import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EloRating, PreferenceSorter } from "@/services/tournament";
import { useToast } from "@/app/providers/Providers";
import { useLocalStorage } from "@/shared/hooks";
import type { Match, MatchRecord, NameItem } from "@/shared/types";
import { useAudioManager } from "./useHelpers";

export interface UseTournamentStateResult {
	currentMatch: Match | null;
	ratings: Record<string, number>;
	round: number;
	matchNumber: number;
	totalMatches: number;
	isComplete: boolean;
	handleVote: (winnerId: string, loserId: string) => void;
	handleUndo: () => void;
	canUndo: boolean;
	handleQuit: () => void;
	progress: number;
	etaMinutes: number;
	isVoting: boolean;
	handleVoteWithAnimation: (winnerId: string, loserId: string) => void;
}

const VOTE_COOLDOWN = 300;

interface HistoryEntry {
	match: Match;
	ratings: Record<string, number>;
	round: number;
	matchNumber: number;
}

interface PersistentTournamentState {
	matchHistory: MatchRecord[];
	currentRound: number;
	currentMatch: number;
	totalMatches: number;
	userName: string;
	lastUpdated: number;
	namesKey: string;
	ratings: Record<string, number>;
}

function createDefaultPersistentState(userName: string): PersistentTournamentState {
	return {
		matchHistory: [],
		currentRound: 1,
		currentMatch: 1,
		totalMatches: 0,
		userName: userName || "anonymous",
		lastUpdated: Date.now(),
		namesKey: "",
		ratings: {},
	};
}

export function useTournamentState(names: NameItem[], userName?: string): UseTournamentStateResult {
	const toast = useToast();
	const audioManager = useAudioManager();
	const [isVoting, setIsVoting] = useState(false);

	const namesKey = useMemo(
		() =>
			names
				.map((n) => n?.id || n?.name || "")
				.filter(Boolean)
				.sort()
				.join(","),
		[names],
	);

	// --- Persistence setup ---
	const tournamentId = useMemo(() => {
		const sortedNames = names
			.map((n) => n.name || String(n.id))
			.sort()
			.join("-");
		const prefix = userName || "anonymous";
		return `tournament-${prefix}-${sortedNames}`;
	}, [names, userName]);

	const defaultPersistentState = useMemo(
		() => createDefaultPersistentState(userName || "anonymous"),
		[userName],
	);

	const [persistentStateRaw, setPersistentState] = useLocalStorage<PersistentTournamentState>(
		tournamentId,
		defaultPersistentState,
		{ debounceWait: 1000 },
	);

	const persistentState = useMemo((): PersistentTournamentState => {
		if (!persistentStateRaw || typeof persistentStateRaw !== "object" || Array.isArray(persistentStateRaw)) {
			return createDefaultPersistentState(userName || "anonymous");
		}

		const merged = {
			...createDefaultPersistentState(userName || "anonymous"),
			...persistentStateRaw,
		};

		return {
			...merged,
			matchHistory: Array.isArray(merged.matchHistory) ? merged.matchHistory : [],
			ratings: merged.ratings && typeof merged.ratings === "object" ? merged.ratings : {},
			namesKey: typeof merged.namesKey === "string" ? merged.namesKey : "",
		};
	}, [persistentStateRaw, userName]);

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

	// --- In-memory state ---
	const [ratings, setRatings] = useState<Record<string, number>>({});
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const sorter = useMemo(() => new PreferenceSorter(names.map((n) => String(n.id))), [names]);
	const [elo] = useState(() => new EloRating());
	const [_refreshKey, setRefreshKey] = useState(0);

	const initializedRef = useRef(false);
	const lastNamesKeyRef = useRef("");

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

		const hasValidPersistence = persistentState.namesKey === namesKey;

		if (hasValidPersistence) {
			if (sorter.currentIndex === 0 && persistentState.matchHistory.length > 0) {
				persistentState.matchHistory.forEach((record) => {
					if (record.winner && record.loser) {
						sorter.addPreference(record.winner, record.loser, 1);
					}
				});
			}

			if (persistentState.ratings && Object.keys(persistentState.ratings).length > 0) {
				setRatings(persistentState.ratings);
			} else {
				const initial: Record<string, number> = {};
				names.forEach((name) => {
					initial[name.id] = name.rating || 1500;
				});
				setRatings(initial);
			}
		} else {
			const estimatedMatches = (names.length * (names.length - 1)) / 2;

			const initial: Record<string, number> = {};
			names.forEach((name) => {
				initial[name.id] = name.rating || 1500;
			});
			setRatings(initial);

			updatePersistentState({
				matchHistory: [],
				currentRound: 1,
				currentMatch: 1,
				totalMatches: estimatedMatches,
				namesKey,
				ratings: initial,
			});
		}

		initializedRef.current = true;
		setRefreshKey((k) => k + 1);
	}, [namesKey, persistentState, sorter, names, updatePersistentState]);

	const ratingsRef = useRef(ratings);
	useEffect(() => {
		ratingsRef.current = ratings;
	}, [ratings]);

	const currentMatch = useMemo(() => {
		void _refreshKey;
		const nextMatch = sorter.getNextMatch();
		if (!nextMatch) {
			return null;
		}

		return {
			left: names.find((n) => String(n.id) === nextMatch.left) || {
				id: nextMatch.left,
				name: nextMatch.left,
			},
			right: names.find((n) => String(n.id) === nextMatch.right) || {
				id: nextMatch.right,
				name: nextMatch.right,
			},
		} as Match;
	}, [sorter, names, _refreshKey]);

	const isComplete = currentMatch === null;
	const totalPairs = (names.length * (names.length - 1)) / 2;
	const completedMatches = persistentState.matchHistory.length;
	const matchNumber = isComplete ? completedMatches : completedMatches + 1;
	const roundMatchIndex = Math.max(1, matchNumber);
	const round = Math.floor((roundMatchIndex - 1) / Math.max(1, names.length)) + 1;

	const progress = useMemo(() => {
		if (!totalPairs) {
			return 0;
		}
		return Math.round((Math.min(completedMatches, totalPairs) / totalPairs) * 100);
	}, [completedMatches, totalPairs]);

	const etaMinutes = useMemo(() => {
		if (!totalPairs || completedMatches >= totalPairs) {
			return 0;
		}
		const remaining = totalPairs - completedMatches;
		return Math.ceil((remaining * 3) / 60);
	}, [completedMatches, totalPairs]);

	const handleVote = useCallback(
		(winnerId: string, loserId: string) => {
			if (!currentMatch) {
				return;
			}

			const ratingsSnapshot = ratingsRef.current;

			const winnerRating = ratingsSnapshot[winnerId] || 1500;
			const loserRating = ratingsSnapshot[loserId] || 1500;

			const leftId = String(
				typeof currentMatch.left === "object" ? currentMatch.left.id : currentMatch.left,
			);
			const outcome = winnerId === leftId ? "left" : "right";

			const result = elo.calculateNewRatings(winnerRating, loserRating, outcome);
			const newRatings = {
				...ratingsSnapshot,
				[winnerId]: result.newRatingA,
				[loserId]: result.newRatingB,
			};

			setRatings(newRatings);

			const matchRecord: MatchRecord = {
				match: currentMatch,
				winner: winnerId,
				loser: loserId,
				voteType: "normal",
				matchNumber,
				roundNumber: round,
				timestamp: Date.now(),
			};

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
				ratings: newRatings,
			}));

			sorter.addPreference(winnerId, loserId, 1);
			setRefreshKey((k) => k + 1);
		},
		[currentMatch, elo, matchNumber, round, sorter, updatePersistentState],
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
		sorter.undoLastPreference();
		setRefreshKey((k) => k + 1);

		updatePersistentState((prev) => {
			const newHistory = (prev.matchHistory || []).slice(0, -1);
			return {
				matchHistory: newHistory,
				currentMatch: Math.max(1, prev.currentMatch - 1),
				ratings: lastEntry.ratings,
			};
		});
	}, [audioManager, history, sorter, toast, updatePersistentState]);

	const handleQuit = useCallback(() => {
		updatePersistentState({
			matchHistory: [],
			currentRound: 1,
			currentMatch: 1,
			totalMatches: 0,
			namesKey: "",
			ratings: {},
		});
		window.history.back();
	}, [updatePersistentState]);

	return {
		currentMatch,
		ratings,
		round,
		matchNumber,
		totalMatches: totalPairs,
		isComplete,
		handleVote,
		handleUndo,
		canUndo: history.length > 0,
		handleQuit,
		progress,
		etaMinutes,
		isVoting,
		handleVoteWithAnimation,
	};
}
