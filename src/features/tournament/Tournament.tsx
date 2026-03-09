import { useReducedMotion } from "framer-motion";
import { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TournamentActiveView } from "@/features/tournament/components/TournamentActiveView";
import { TournamentCompleteView } from "@/features/tournament/components/TournamentCompleteView";
import {
	getHeatLevel,
	getMatchSideId,
	getMatchSideName,
	type HeatLevel,
	STREAK_THRESHOLDS,
} from "@/features/tournament/lib/tournamentUi";
import { ErrorComponent } from "@/shared/components/layout/Feedback/ErrorBoundary";
import { getRandomCatImage, getVisibleNames } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import type { NameItem, TournamentProps } from "@/shared/types";
import useAppStore from "@/store/appStore";
import { useAudioManager } from "./hooks/useHelpers";
import { useTournamentState } from "./hooks/useTournamentState";

interface StreakBurst {
	key: number;
	side: "left" | "right";
	winnerName: string;
	streak: number;
	heatLevel: HeatLevel;
}

function TournamentContent({ onComplete, names = [], onVote }: TournamentProps) {
	const navigate = useNavigate();
	const userName = useAppStore((state) => state.user.name);
	const tournamentActions = useAppStore((state) => state.tournamentActions);
	const visibleNames = useMemo(() => getVisibleNames(names), [names]);
	const audioManager = useAudioManager();

	const tournament = useTournamentState(visibleNames, userName);
	const {
		currentMatch,
		ratings,
		isComplete,
		tournamentMode,
		round: roundNumber,
		totalRounds,
		bracketStage,
		matchNumber: currentMatchNumber,
		totalMatches,
		handleUndo,
		canUndo,
		handleQuit,
		progress,
		etaMinutes = 0,
		handleVoteWithAnimation,
		isVoting,
		matchHistory,
	} = tournament;
	const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
	const [voteAnnouncement, setVoteAnnouncement] = useState<string | null>(null);
	const [roundAnnouncement, setRoundAnnouncement] = useState<number | null>(null);
	const [streakBurst, setStreakBurst] = useState<StreakBurst | null>(null);
	const previousRoundRef = useRef(roundNumber);
	const voteAnnouncementTimeoutRef = useRef<number | null>(null);
	const roundAnnouncementTimeoutRef = useRef<number | null>(null);
	const streakBurstTimeoutRef = useRef<number | null>(null);
	const prefersReducedMotion = useReducedMotion();

	const clearVoteAnnouncementTimeout = useCallback(() => {
		if (voteAnnouncementTimeoutRef.current !== null) {
			window.clearTimeout(voteAnnouncementTimeoutRef.current);
			voteAnnouncementTimeoutRef.current = null;
		}
	}, []);

	const clearRoundAnnouncementTimeout = useCallback(() => {
		if (roundAnnouncementTimeoutRef.current !== null) {
			window.clearTimeout(roundAnnouncementTimeoutRef.current);
			roundAnnouncementTimeoutRef.current = null;
		}
	}, []);

	const clearStreakBurstTimeout = useCallback(() => {
		if (streakBurstTimeoutRef.current !== null) {
			window.clearTimeout(streakBurstTimeoutRef.current);
			streakBurstTimeoutRef.current = null;
		}
	}, []);

	const calculateWinStreak = useCallback(
		(contestantId: string | number | null | undefined) => {
			if (!contestantId || matchHistory.length === 0) {
				return 0;
			}

			const targetId = String(contestantId);
			let streak = 0;

			for (let i = matchHistory.length - 1; i >= 0; i--) {
				const record = matchHistory[i];
				if (!record) {
					continue;
				}
				const leftId = getMatchSideId(record.match, "left");
				const rightId = getMatchSideId(record.match, "right");

				const isInMatch = leftId === targetId || rightId === targetId;
				if (!isInMatch) {
					continue;
				}

				if (record.winner === targetId) {
					streak++;
				} else {
					break;
				}
			}
			return streak;
		},
		[matchHistory],
	);

	const leftStreak = useMemo(() => {
		if (!currentMatch) {
			return 0;
		}
		return calculateWinStreak(getMatchSideId(currentMatch, "left"));
	}, [currentMatch, calculateWinStreak]);

	const rightStreak = useMemo(() => {
		if (!currentMatch) {
			return 0;
		}
		return calculateWinStreak(getMatchSideId(currentMatch, "right"));
	}, [currentMatch, calculateWinStreak]);

	const leftHeatLevel = useMemo(() => getHeatLevel(leftStreak), [leftStreak]);
	const rightHeatLevel = useMemo(() => getHeatLevel(rightStreak), [rightStreak]);

	useEffect(() => {
		return () => {
			clearVoteAnnouncementTimeout();
			clearRoundAnnouncementTimeout();
			clearStreakBurstTimeout();
		};
	}, [clearVoteAnnouncementTimeout, clearRoundAnnouncementTimeout, clearStreakBurstTimeout]);

	const handleVoteAdapter = useCallback(
		(winnerId: string, _loserId: string) => {
			if (onVote && currentMatch) {
				const leftId = getMatchSideId(currentMatch, "left");
				const rightId = getMatchSideId(currentMatch, "right");
				const leftName = getMatchSideName(currentMatch, "left");
				const rightName = getMatchSideName(currentMatch, "right");

				const voteData = {
					match: {
						left: {
							name: leftName,
							id: leftId,
							description: "",
							outcome: winnerId === leftId ? "winner" : "loser",
						},
						right: {
							name: rightName,
							id: rightId,
							description: "",
							outcome: winnerId === rightId ? "winner" : "loser",
						},
					},
					result: winnerId === leftId ? 1 : 0,
					ratings,
					timestamp: new Date().toISOString(),
				};
				onVote(voteData);
			}
		},
		[onVote, currentMatch, ratings],
	);

	const idToName = useMemo(
		() => new Map(visibleNames.map((n) => [String(n.id), n.name])),
		[visibleNames],
	);

	useEffect(() => {
		if (isComplete && onComplete) {
			audioManager.playLevelUpSound();
			setTimeout(() => audioManager.playWowSound(), 500);

			const results: Record<string, { rating: number; wins: number; losses: number }> = {};

			for (const [id, rating] of Object.entries(ratings)) {
				const name = idToName.get(id) ?? id;
				results[name] = { rating, wins: 0, losses: 0 };
			}

			onComplete(results);
		}
	}, [isComplete, ratings, onComplete, idToName, audioManager]);

	const showCatPictures = useAppStore((state) => state.ui.showCatPictures);
	const setCatPictures = useAppStore((state) => state.uiActions.setCatPictures);
	const matchData = useMemo(() => {
		if (!currentMatch) {
			return null;
		}

		if (currentMatch.mode === "2v2") {
			const leftMembers = currentMatch.left.memberNames;
			const rightMembers = currentMatch.right.memberNames;
			return {
				leftId: currentMatch.left.id,
				rightId: currentMatch.right.id,
				leftName: leftMembers.join(" + "),
				rightName: rightMembers.join(" + "),
				leftMembers,
				rightMembers,
				leftIsTeam: true,
				rightIsTeam: true,
				leftDescription: undefined,
				rightDescription: undefined,
				leftPronunciation: undefined,
				rightPronunciation: undefined,
			};
		}

		return {
			leftId: String(
				typeof currentMatch.left === "object" ? currentMatch.left.id : currentMatch.left,
			),
			rightId: String(
				typeof currentMatch.right === "object" ? currentMatch.right.id : currentMatch.right,
			),
			leftName: String(
				typeof currentMatch.left === "object" ? currentMatch.left.name : currentMatch.left,
			),
			rightName: String(
				typeof currentMatch.right === "object" ? currentMatch.right.name : currentMatch.right,
			),
			leftMembers: [
				String(typeof currentMatch.left === "object" ? currentMatch.left.name : currentMatch.left),
			],
			rightMembers: [
				String(
					typeof currentMatch.right === "object" ? currentMatch.right.name : currentMatch.right,
				),
			],
			leftIsTeam: false,
			rightIsTeam: false,
			leftDescription:
				typeof currentMatch.left === "object" ? currentMatch.left.description : undefined,
			rightDescription:
				typeof currentMatch.right === "object" ? currentMatch.right.description : undefined,
			leftPronunciation:
				typeof currentMatch.left === "object"
					? (currentMatch.left as NameItem).pronunciation
					: undefined,
			rightPronunciation:
				typeof currentMatch.right === "object"
					? (currentMatch.right as NameItem).pronunciation
					: undefined,
		};
	}, [currentMatch]);

	useEffect(() => {
		if (!currentMatch) {
			setSelectedSide(null);
			setStreakBurst(null);
			return;
		}
		setSelectedSide(null);
	}, [currentMatch]);

	useEffect(() => {
		if (isComplete) {
			previousRoundRef.current = roundNumber;
			return;
		}

		if (roundNumber > previousRoundRef.current) {
			setRoundAnnouncement(roundNumber);
			audioManager.playSurpriseSound();
			clearRoundAnnouncementTimeout();
			roundAnnouncementTimeoutRef.current = window.setTimeout(
				() => setRoundAnnouncement(null),
				prefersReducedMotion ? 350 : 1200,
			);
		}
		previousRoundRef.current = roundNumber;
	}, [roundNumber, isComplete, audioManager, clearRoundAnnouncementTimeout, prefersReducedMotion]);

	const triggerVoteFeedback = useCallback(
		(winnerName: string, side: "left" | "right") => {
			setSelectedSide(side);
			setVoteAnnouncement(winnerName);
			clearVoteAnnouncementTimeout();
			voteAnnouncementTimeoutRef.current = window.setTimeout(
				() => setVoteAnnouncement(null),
				prefersReducedMotion ? 250 : 900,
			);
		},
		[clearVoteAnnouncementTimeout, prefersReducedMotion],
	);

	const handleVoteForSide = useCallback(
		(side: "left" | "right") => {
			if (isVoting || !matchData) {
				return;
			}

			audioManager.primeAudioExperience();

			const winnerId = side === "left" ? matchData.leftId : matchData.rightId;
			const loserId = side === "left" ? matchData.rightId : matchData.leftId;
			const winnerName = side === "left" ? matchData.leftName : matchData.rightName;
			const expectedStreak = (side === "left" ? leftStreak : rightStreak) + 1;
			const heatLevel = getHeatLevel(expectedStreak);

			if (heatLevel) {
				setStreakBurst({
					key: Date.now(),
					side,
					winnerName,
					streak: expectedStreak,
					heatLevel,
				});
				audioManager.playStreakSound(expectedStreak);
				clearStreakBurstTimeout();
				streakBurstTimeoutRef.current = window.setTimeout(
					() => setStreakBurst(null),
					prefersReducedMotion ? 280 : 950,
				);
			}

			triggerVoteFeedback(winnerName, side);
			handleVoteWithAnimation(winnerId, loserId);

			if (onVote) {
				handleVoteAdapter(winnerId, loserId);
			}
		},
		[
			isVoting,
			matchData,
			audioManager,
			leftStreak,
			rightStreak,
			clearStreakBurstTimeout,
			prefersReducedMotion,
			triggerVoteFeedback,
			handleVoteWithAnimation,
			onVote,
			handleVoteAdapter,
		],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLElement>, side: "left" | "right") => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleVoteForSide(side);
			}
		},
		[handleVoteForSide],
	);

	const leftImg =
		showCatPictures && matchData ? getRandomCatImage(matchData.leftId, CAT_IMAGES) : null;
	const rightImg =
		showCatPictures && matchData ? getRandomCatImage(matchData.rightId, CAT_IMAGES) : null;
	const hasSelectionFeedback = selectedSide !== null;
	const leftSelected = selectedSide === "left";
	const rightSelected = selectedSide === "right";
	const currentMatchKey = matchData
		? `${roundNumber}-${currentMatchNumber}-${matchData.leftId}-${matchData.rightId}`
		: `${roundNumber}-${currentMatchNumber}`;

	const quitTournament = useCallback(() => {
		handleQuit();
		tournamentActions.resetTournament();
		navigate("/");
	}, [handleQuit, tournamentActions, navigate]);

	if (isComplete) {
		return (
			<TournamentCompleteView
				totalMatches={totalMatches}
				participantCount={visibleNames.length}
				onStartNew={quitTournament}
			/>
		);
	}

	if (!matchData) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading tournament...</div>
			</div>
		);
	}

	const dominantStreak =
		leftStreak >= rightStreak
			? leftStreak >= STREAK_THRESHOLDS.warm
				? { name: matchData.leftName, streak: leftStreak, heatLevel: leftHeatLevel ?? "warm" }
				: null
			: rightStreak >= STREAK_THRESHOLDS.warm
				? { name: matchData.rightName, streak: rightStreak, heatLevel: rightHeatLevel ?? "warm" }
				: null;

	return (
		<TournamentActiveView
			roundNumber={roundNumber}
			totalRounds={totalRounds}
			bracketStage={bracketStage}
			currentMatchNumber={currentMatchNumber}
			totalMatches={totalMatches}
			tournamentMode={tournamentMode}
			isComplete={isComplete}
			etaMinutes={etaMinutes}
			progress={progress}
			audioManager={audioManager}
			handleQuit={handleQuit}
			showCatPictures={showCatPictures}
			setCatPictures={setCatPictures}
			quitTournament={quitTournament}
			canUndo={canUndo}
			handleUndo={handleUndo}
			voteAnnouncement={voteAnnouncement}
			roundAnnouncement={roundAnnouncement}
			streakBurst={streakBurst}
			currentMatchKey={currentMatchKey}
			prefersReducedMotion={prefersReducedMotion}
			leftName={matchData.leftName}
			rightName={matchData.rightName}
			leftImg={leftImg}
			rightImg={rightImg}
			leftHeatLevel={leftHeatLevel}
			rightHeatLevel={rightHeatLevel}
			leftStreak={leftStreak}
			rightStreak={rightStreak}
			isVoting={isVoting}
			leftSelected={leftSelected}
			rightSelected={rightSelected}
			hasSelectionFeedback={hasSelectionFeedback}
			leftIsTeam={matchData.leftIsTeam}
			rightIsTeam={matchData.rightIsTeam}
			leftMembers={matchData.leftMembers}
			rightMembers={matchData.rightMembers}
			leftDescription={matchData.leftDescription}
			rightDescription={matchData.rightDescription}
			leftPronunciation={matchData.leftPronunciation}
			rightPronunciation={matchData.rightPronunciation}
			handleKeyDown={handleKeyDown}
			handleVoteForSide={handleVoteForSide}
			dominantStreak={dominantStreak}
		/>
	);
}

const MemoizedTournament = memo(TournamentContent);

export default function Tournament(props: TournamentProps) {
	return (
		<ErrorComponent variant="boundary">
			<MemoizedTournament {...props} />
		</ErrorComponent>
	);
}
