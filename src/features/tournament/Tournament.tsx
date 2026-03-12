import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/shared/components/layout/Card";
import CatImage from "@/shared/components/layout/CatImage";
import { ErrorComponent } from "@/shared/components/layout/Feedback";
import { getRandomCatImage, getVisibleNames } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import {
	Clock,
	Gamepad2,
	LogOut,
	Medal,
	Music,
	PartyPopper,
	PawPrint,
	SkipBack,
	SkipForward,
	Trophy,
	Undo2,
	Volume2,
	VolumeX,
	X,
} from "@/shared/lib/icons";
import type { Match, NameItem, TournamentProps } from "@/shared/types";
import useAppStore from "@/store/appStore";
import { useAudioManager } from "./hooks";
import { useTournamentState } from "./hooks/useTournamentState";

type HeatLevel = "warm" | "hot" | "blazing";

const STREAK_THRESHOLDS = {
	warm: 3,
	hot: 5,
	blazing: 7,
} as const;

interface StreakBurst {
	key: number;
	side: "left" | "right";
	winnerName: string;
	streak: number;
	heatLevel: HeatLevel;
}

const getHeatLevel = (streak: number): HeatLevel | null => {
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
};

const getHeatCardClasses = (heatLevel: HeatLevel | null): string => {
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
};

const getHeatTextClasses = (heatLevel: HeatLevel): string => {
	switch (heatLevel) {
		case "blazing":
			return "text-orange-200 border-orange-300/45 bg-orange-500/15";
		case "hot":
			return "text-amber-200 border-amber-300/45 bg-amber-500/15";
		default:
			return "text-orange-100 border-orange-300/35 bg-orange-500/10";
	}
};

const getFlameCount = (streak: number, max = 8): number => {
	return Math.min(max, Math.max(3, Math.round(streak * 1.2)));
};

function getMatchSideId(match: Match, side: "left" | "right"): string {
	const participant = match[side];
	return typeof participant === "object" ? String(participant.id) : String(participant);
}

function getMatchSideName(match: Match, side: "left" | "right"): string {
	if (match.mode === "2v2") {
		const team = side === "left" ? match.left : match.right;
		return team.memberNames.join(" + ");
	}
	const participant = match[side];
	return typeof participant === "object" ? participant.name : String(participant);
}

interface MatchSideCardProps {
	side: "left" | "right";
	name: string;
	img: string | null;
	heatLevel: HeatLevel | null;
	streak: number;
	isVoting: boolean;
	isSelected: boolean;
	hasSelectionFeedback: boolean;
	isTeam: boolean;
	members: string[];
	description?: string;
	pronunciation?: string;
	onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
	onVote: () => void;
	animationDelay?: string;
}

function MatchSideCard({
	side,
	name,
	img,
	heatLevel,
	streak,
	isVoting,
	isSelected,
	hasSelectionFeedback,
	isTeam,
	members,
	description,
	pronunciation,
	onKeyDown,
	onVote,
	animationDelay,
}: MatchSideCardProps) {
	const isRight = side === "right";
	const overlayTextAlign = isRight ? "text-left sm:text-right" : "";
	const headingWrapClass = isRight ? "justify-end sm:justify-end" : "";
	const headingTextClass = isRight ? "text-left sm:text-right" : "";
	const pronunciationClass = isRight ? "mr-2" : "ml-2";
	const memberWrapClass = isRight ? "justify-start sm:justify-end" : "";
	const selectionClass = isSelected
		? "ring-2 ring-emerald-400/80 shadow-[0_0_45px_rgba(16,185,129,0.35)] scale-[1.02]"
		: hasSelectionFeedback
			? "opacity-[0.55] scale-[0.98]"
			: "";

	return (
		<div className="flex-1 flex flex-col min-h-[250px] sm:min-h-0">
			<Card
				interactive={true}
				padding="none"
				className={`relative overflow-hidden group cursor-pointer flex-1 animate-float transition-all duration-300 ${
					isVoting ? "pointer-events-none" : ""
				} ${getHeatCardClasses(heatLevel)} ${selectionClass}`}
				style={animationDelay ? { animationDelay } : undefined}
				variant="default"
				role="button"
				tabIndex={isVoting ? -1 : 0}
				aria-label={`Vote for ${isTeam ? "team" : "name"} ${name}`}
				aria-disabled={isVoting}
				onKeyDown={onKeyDown}
				onClick={onVote}
			>
				<div className="relative w-full h-full flex items-center justify-center bg-foreground/10">
					{img ? (
						<CatImage
							src={img}
							alt={name}
							objectFit="cover"
							containerClassName="w-full h-full"
							imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
						/>
					) : (
						<span className="text-foreground/20 text-6xl font-bold select-none">
							{name[0]?.toUpperCase() || "?"}
						</span>
					)}

					{heatLevel && (
						<div className="pointer-events-none absolute inset-0 z-10">
							<div
								className={`absolute inset-0 ${
									heatLevel === "blazing"
										? "bg-gradient-to-t from-orange-500/45 via-amber-400/25 to-transparent"
										: heatLevel === "hot"
											? "bg-gradient-to-t from-orange-500/35 via-amber-300/20 to-transparent"
											: "bg-gradient-to-t from-orange-500/20 via-amber-200/10 to-transparent"
								}`}
							/>
							<div className="absolute bottom-14 left-0 right-0 flex justify-center gap-0.5 opacity-90">
								{Array.from({ length: getFlameCount(streak) }).map((_, i) => (
									<span
										key={`${side}-heat-${name}-${streak}-${i}`}
										className="text-sm sm:text-base animate-flame"
										style={{ animationDelay: `${i * 60}ms` }}
									>
										🔥
									</span>
								))}
							</div>
						</div>
					)}

					<div
						className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-background/90 via-background/40 to-transparent z-20 flex flex-col justify-end pointer-events-none ${overlayTextAlign}`}
					>
						<div className={`flex items-center gap-2 flex-wrap ${headingWrapClass}`}>
							{isRight && streak >= STREAK_THRESHOLDS.warm && (
								<div className="flex gap-0.5">
									{Array.from({ length: Math.min(streak, 6) }).map((_, i) => (
										<span
											key={`${side}-pre-title-streak-${i}`}
											className="text-lg sm:text-2xl animate-pulse"
										>
											🔥
										</span>
									))}
								</div>
							)}
							<h3
								className={`font-whimsical text-2xl sm:text-3xl text-foreground tracking-wide break-words drop-shadow-md leading-tight ${headingTextClass}`}
							>
								{name}
							</h3>
							{!isRight && streak >= STREAK_THRESHOLDS.warm && (
								<div className="flex gap-0.5">
									{Array.from({ length: Math.min(streak, 6) }).map((_, i) => (
										<span
											key={`${side}-post-title-streak-${i}`}
											className="text-lg sm:text-2xl animate-pulse"
										>
											🔥
										</span>
									))}
								</div>
							)}
						</div>
						{pronunciation && (
							<span
								className={`${pronunciationClass} text-amber-400 text-lg sm:text-xl font-bold italic opacity-90`}
							>
								[{pronunciation}]
							</span>
						)}
						{isTeam ? (
							<div className={`mt-2 flex flex-wrap gap-1.5 ${memberWrapClass}`}>
								{members.map((member) => (
									<span
										key={`${side}-member-${member}`}
										className="rounded-full border border-border/30 bg-background/35 px-2 py-0.5 text-[10px] sm:text-xs font-bold tracking-wide"
									>
										{member}
									</span>
								))}
							</div>
						) : description ? (
							<p
								className={`text-xs sm:text-sm text-foreground/90 italic line-clamp-2 mt-1 drop-shadow-sm ${overlayTextAlign}`}
							>
								{description}
							</p>
						) : null}
					</div>
				</div>
			</Card>
		</div>
	);
}

function BracketTree({ round, totalRounds }: { round: number; totalRounds: number }) {
	const rounds = useMemo(
		() => Array.from({ length: Math.max(1, totalRounds) }, (_, index) => index + 1),
		[totalRounds],
	);
	const stageFlavor = useMemo(() => {
		if (round >= totalRounds) {
			return "Crown Fight";
		}
		if (totalRounds - round === 1) {
			return "Final Four Chaos";
		}
		if (round <= 2) {
			return "Chaos Ladder";
		}
		return "Bracket Grind";
	}, [round, totalRounds]);

	return (
		<div className="rounded-xl border border-border/15 bg-foreground/[0.03] px-3 py-2">
			<div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				<span>Bracket Path</span>
				<span>{stageFlavor}</span>
			</div>
			<div className="flex items-center gap-1 overflow-x-auto pb-1">
				{rounds.map((stageRound, index) => {
					const isDone = stageRound < round;
					const isActive = stageRound === round;
					const tone = isActive
						? "border-primary/70 bg-primary/20 text-primary shadow-[0_0_18px_rgba(166,94,237,0.45)]"
						: isDone
							? "border-chart-2/45 bg-chart-2/10 text-chart-2"
							: "border-border/20 bg-foreground/5 text-foreground/65";
					const caption =
						stageRound === totalRounds
							? "Final"
							: stageRound === totalRounds - 1
								? "Semi"
								: stageRound === totalRounds - 2
									? "Quarter"
									: `R${stageRound}`;

					return (
						<div key={`bracket-tree-round-${stageRound}`} className="flex items-center gap-1">
							<div
								className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${tone}`}
							>
								{caption}
								{isActive ? " ✦" : ""}
							</div>
							{index < rounds.length - 1 && (
								<div
									className={`h-[1px] w-4 sm:w-6 ${
										isDone ? "bg-chart-2/70" : isActive ? "bg-primary/70" : "bg-border/20"
									}`}
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function TournamentContent({ onComplete, names = [], onVote }: TournamentProps) {
	// Optimization: Only select user.name to avoid re-renders on other store changes
	const navigate = useNavigate();
	const userName = useAppStore((state) => state.user.name);
	const tournamentActions = useAppStore((state) => state.tournamentActions);
	const visibleNames = useMemo(() => getVisibleNames(names), [names]);
	const audioManager = useAudioManager();
	const prefersReducedMotion = useReducedMotion();

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

	// Calculate winning streaks for current contestants
	const calculateWinStreak = useCallback(
		(contestantId: string | number | null | undefined) => {
			if (!contestantId || matchHistory.length === 0) {
				return 0;
			}

			const targetId = String(contestantId);
			let streak = 0;

			// Iterate from most-recent backward; only stop when this contestant appears and loses.
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

	// Adapter to convert VoteData to winnerId/loserId for the hook
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

	// idToName memoizes based on visibleNames, so tracking idToName implicitly tracks visibleNames
	useEffect(() => {
		if (isComplete && onComplete) {
			// Play celebration sounds!
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
			<div className="relative min-h-screen w-full flex flex-col overflow-hidden font-display text-white selection:bg-primary/30">
				{/* Celebration background */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-0 left-0 w-40 h-40 bg-green-500/20 rounded-full animate-blob animation-delay-2000" />
					<div className="absolute top-1/3 right-0 w-32 h-32 bg-primary/20 rounded-full animate-blob" />
					<div className="absolute bottom-1/4 left-1/4 w-36 h-36 bg-yellow-500/20 rounded-full animate-blob animation-delay-4000" />
					<div className="absolute bottom-0 right-1/3 w-44 h-44 bg-green-500/15 rounded-full animate-blob animation-delay-2000" />
				</div>

				<div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
					<Card className="max-w-2xl w-full text-center p-8" variant="default">
						<div className="mb-6 flex justify-center">
							<Trophy className="size-16 text-green-400" />
						</div>
						<h1 className="font-whimsical text-4xl text-foreground tracking-wide mb-4">
							Tournament Complete!
						</h1>
						<p className="text-foreground/80 mb-6">
							Congratulations! Your tournament results are ready to review.
						</p>

						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4 text-left">
								<div className="bg-foreground/5 rounded-lg p-4">
									<div className="text-sm text-muted-foreground mb-1">Total Matches</div>
									<div className="text-xl font-bold text-foreground">{totalMatches}</div>
								</div>
								<div className="bg-foreground/5 rounded-lg p-4">
									<div className="text-sm text-muted-foreground mb-1">Participants</div>
									<div className="text-xl font-bold text-foreground">{visibleNames.length}</div>
								</div>
							</div>

							<div className="flex flex-col gap-3 pt-4">
								<button
									type="button"
									onClick={quitTournament}
									className="w-full glass-panel py-3 px-6 rounded-full flex items-center justify-center gap-3 border border-primary/20 cursor-pointer hover:bg-foreground/5 transition-colors"
								>
									<LogOut className="text-primary" />
									<span className="font-bold text-foreground">Start New Tournament</span>
								</button>

								<button
									type="button"
									onClick={() => navigate("/analysis")}
									className="w-full glass-panel py-3 px-6 rounded-full flex items-center justify-center gap-3 border border-border/20 cursor-pointer hover:bg-foreground/5 transition-colors"
								>
									<Trophy className="text-foreground" />
									<span className="font-bold text-foreground">View Analysis</span>
								</button>
							</div>
						</div>
					</Card>
				</div>
			</div>
		);
	}

	if (!matchData) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading tournament...</div>
			</div>
		);
	}

	const {
		leftName,
		rightName,
		leftMembers,
		rightMembers,
		leftIsTeam,
		rightIsTeam,
		leftDescription,
		rightDescription,
		leftPronunciation,
		rightPronunciation,
	} = matchData;

	const dominantStreak =
		leftStreak >= rightStreak
			? leftStreak >= STREAK_THRESHOLDS.warm
				? { name: leftName, streak: leftStreak, heatLevel: leftHeatLevel ?? "warm" }
				: null
			: rightStreak >= STREAK_THRESHOLDS.warm
				? { name: rightName, streak: rightStreak, heatLevel: rightHeatLevel ?? "warm" }
				: null;
	return (
		<div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col font-display text-foreground selection:bg-primary/30">
			<header className="pt-2 px-3 sm:px-4 space-y-2 flex-shrink-0">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-2 sm:gap-4">
						<div className="px-3 py-1.5 sm:px-4 rounded-full flex items-center gap-2 bg-foreground/10 backdrop-blur-md border border-border/20">
							<Gamepad2 className="text-primary size-3.5" />
							<span className="text-[11px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase text-foreground/90">
								{isComplete
									? "Tournament Complete!"
									: `Round ${roundNumber} / ${totalRounds} · ${bracketStage}`}
							</span>
						</div>
						<div className="px-3 py-1.5 sm:px-4 rounded-full flex items-center gap-2 bg-foreground/10 backdrop-blur-md border border-border/20">
							<span className="text-[11px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase text-foreground/90">
								Mode: {tournamentMode === "2v2" ? "2v2 Teams" : "1v1"}
							</span>
						</div>
						{isComplete && (
							<div className="px-3 py-1 rounded-full flex items-center gap-2 bg-green-500/20 border border-green-500/30">
								<PartyPopper className="text-green-400 size-3.5" />
								<span className="text-[11px] sm:text-xs font-bold text-green-400">
									Results Downloaded
								</span>
							</div>
						)}
					</div>
					<div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
						<div className="flex items-center gap-2">
							<Medal className="text-accent" />
							<span className="text-[11px] sm:text-xs font-bold">
								{currentMatchNumber} / {totalMatches}
							</span>
						</div>
						{etaMinutes > 0 && !isComplete && (
							<div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
								<Clock className="size-3.5" />
								<span>~{etaMinutes}m</span>
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
						<div
							className={`h-full rounded-full shadow-[0_0_10px_#a65eed] transition-all duration-500 ${
								isComplete ? "bg-green-500" : "bg-primary"
							}`}
							style={{ width: `${progress || (currentMatchNumber / totalMatches) * 100}%` }}
						/>
					</div>
					<div className="text-center text-[11px] sm:text-xs text-muted-foreground">
						{isComplete ? (
							<span className="text-green-400 font-bold">🎉 Tournament Complete! 🎉</span>
						) : (
							<>
								{progress}% Complete · {bracketStage}
							</>
						)}
					</div>
					<BracketTree round={roundNumber} totalRounds={totalRounds} />
					{dominantStreak && (
						<div className="text-center text-[11px] sm:text-xs">
							<span
								className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold tracking-wide ${getHeatTextClasses(dominantStreak.heatLevel)}`}
							>
								<span>🔥</span>
								<span>
									Hot streak: {dominantStreak.name} ({dominantStreak.streak} wins)
								</span>
							</span>
						</div>
					)}
				</div>
			</header>

			<section className="px-3 sm:px-4 py-1.5 flex-shrink-0">
				<Card
					className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
					padding="small"
					variant="default"
				>
					<div className="w-full sm:w-auto flex flex-wrap gap-2 items-center justify-center sm:justify-start">
						<button
							type="button"
							onClick={audioManager.handleToggleMute}
							className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
							aria-label={audioManager.isMuted ? "Unmute audio" : "Mute audio"}
							aria-pressed={!audioManager.isMuted}
							title={audioManager.isMuted ? "Unmute audio" : "Mute audio"}
						>
							{audioManager.isMuted ? <VolumeX /> : <Volume2 />}
						</button>
						<input
							type="range"
							min="0"
							max="1"
							step="0.1"
							value={audioManager.volume}
							onChange={(e) => audioManager.handleVolumeChange(null, parseFloat(e.target.value))}
							className="w-full max-w-[180px] sm:w-20 h-1 bg-foreground/20 rounded-lg appearance-none cursor-pointer slider"
							aria-label="Volume control"
							title={`Volume: ${Math.round(audioManager.volume * 100)}%`}
						/>
						<button
							type="button"
							onClick={audioManager.handlePreviousTrack}
							className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Previous track"
							title="Previous track"
						>
							<SkipBack className="size-3.5" />
						</button>
						<button
							type="button"
							onClick={audioManager.toggleBackgroundMusic}
							className={`w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg transition-colors ${
								audioManager.backgroundMusicEnabled
									? "bg-primary/20 text-primary"
									: "bg-foreground/5 text-muted-foreground hover:text-foreground"
							}`}
							aria-label={
								audioManager.backgroundMusicEnabled
									? "Stop background music"
									: "Play background music"
							}
							aria-pressed={audioManager.backgroundMusicEnabled}
							title={`${audioManager.backgroundMusicEnabled ? "Stop" : "Play"} background music: ${audioManager.currentTrack}`}
						>
							<Music className="size-3.5" />
						</button>
						<button
							type="button"
							onClick={audioManager.handleNextTrack}
							className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Next track"
							title="Next track"
						>
							<SkipForward className="size-3.5" />
						</button>
						{handleQuit && (
							<button
								type="button"
								onClick={handleQuit}
								className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors"
								aria-label="Quit tournament"
								title="Quit tournament"
							>
								<X />
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={() => setCatPictures(!showCatPictures)}
						className={`w-full sm:w-auto justify-center flex items-center gap-2 px-4 h-11 sm:h-10 rounded-lg font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-lg ${showCatPictures ? "bg-primary shadow-primary/20" : "bg-foreground/10"}`}
						aria-pressed={showCatPictures}
						title={showCatPictures ? "Hide cat pictures" : "Show cat pictures"}
					>
						<PawPrint className="size-3.5" />
						<span>{showCatPictures ? "Names Only" : "Show Cats"}</span>
					</button>
				</Card>
			</section>

			<main className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4 relative py-2 min-h-0">
				{/* Animated blob backgrounds */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full animate-blob animation-delay-2000" />
					<div className="absolute top-1/4 right-0 w-24 h-24 bg-stardust/20 rounded-full animate-blob" />
					<div className="absolute bottom-1/4 left-1/4 w-28 h-28 bg-primary/15 rounded-full animate-blob animation-delay-4000" />
					<div className="absolute bottom-0 right-1/3 w-36 h-36 bg-stardust/15 rounded-full animate-blob animation-delay-2000" />
				</div>

				<div className="sr-only" aria-live="polite">
					{roundAnnouncement !== null && `Round ${roundAnnouncement} begins.`}
					{voteAnnouncement && `${voteAnnouncement} advances.`}
					{streakBurst &&
						`${streakBurst.winnerName} is on a ${streakBurst.streak} win streak. Heat is rising.`}
				</div>

				<AnimatePresence>
					{voteAnnouncement && (
						<motion.div
							key={`${voteAnnouncement}-${currentMatchKey}`}
							initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.95 }}
							animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
							exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.98 }}
							transition={{ duration: prefersReducedMotion ? 0.01 : 0.28 }}
							className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] sm:w-auto max-w-full"
						>
							<div className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 sm:px-4 py-2 backdrop-blur-md shadow-[0_0_40px_rgba(16,185,129,0.35)]">
								<div className="flex items-center gap-2 text-emerald-100">
									<Trophy className="text-emerald-300 size-4" />
									<span className="text-xs sm:text-sm font-bold tracking-wide truncate">
										{voteAnnouncement} advances
									</span>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{streakBurst && (
						<motion.div
							key={`streak-burst-${streakBurst.key}`}
							initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
							animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
							exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 1.03 }}
							transition={{ duration: prefersReducedMotion ? 0.01 : 0.28 }}
							className={`pointer-events-none absolute z-30 top-[20%] ${
								streakBurst.side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6 text-right"
							}`}
						>
							<div
								className={`rounded-2xl border px-4 py-3 backdrop-blur-lg shadow-[0_0_40px_rgba(249,115,22,0.35)] ${getHeatTextClasses(streakBurst.heatLevel)}`}
							>
								<p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] opacity-80">
									Streak Ignited
								</p>
								<p className="text-base sm:text-lg font-black tracking-tight">
									{streakBurst.winnerName} x{streakBurst.streak}
								</p>
								<div className="flex gap-1 mt-1">
									{Array.from({ length: getFlameCount(streakBurst.streak, 9) }).map((_, i) => (
										<span
											key={`streak-flame-${streakBurst.key}-${i}`}
											className="text-sm sm:text-base animate-flame"
											style={{ animationDelay: `${i * 80}ms` }}
										>
											🔥
										</span>
									))}
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{roundAnnouncement !== null && (
						<motion.div
							key={`round-announcement-${roundAnnouncement}`}
							initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
							animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
							exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
							transition={{ duration: prefersReducedMotion ? 0.01 : 0.35 }}
							className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4"
						>
							<motion.div
								initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0.85, y: 8 }}
								animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
								exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0.7, y: -6 }}
								transition={{ duration: prefersReducedMotion ? 0.01 : 0.3 }}
								className="relative overflow-hidden rounded-2xl border border-purple-300/40 bg-slate-900/80 px-5 sm:px-8 py-5 sm:py-6 text-center shadow-[0_0_80px_rgba(168,85,247,0.35)] backdrop-blur-xl"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/10 to-blue-500/20" />
								<div className="relative">
									<p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-purple-200/70 mb-2">
										Next Stage
									</p>
									<p className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
										Round {roundAnnouncement}
									</p>
									<p className="text-xs sm:text-sm text-purple-100/80 mt-1">
										New head-to-head matchups ready
									</p>
								</div>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={currentMatchKey}
						initial={
							prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }
						}
						animate={
							prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }
						}
						exit={
							prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: "blur(6px)" }
						}
						transition={{ duration: prefersReducedMotion ? 0.01 : 0.32 }}
						className="relative flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] gap-4 sm:gap-4 w-full max-w-5xl mx-auto z-10 items-stretch h-full min-h-0"
					>
						{/* Left Card */}
						<MatchSideCard
							side="left"
							name={leftName}
							img={leftImg}
							heatLevel={leftHeatLevel}
							streak={leftStreak}
							isVoting={isVoting}
							isSelected={leftSelected}
							hasSelectionFeedback={hasSelectionFeedback}
							isTeam={leftIsTeam}
							members={leftMembers}
							description={leftDescription}
							pronunciation={leftPronunciation}
							onKeyDown={(e) => handleKeyDown(e, "left")}
							onVote={() => handleVoteForSide("left")}
						/>

						{/* VS Indicator */}
						<div className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2 py-1 w-full sm:w-20">
							<div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 border-border/30 bg-primary/20 backdrop-blur-md shadow-lg flex-shrink-0">
								<span className="font-bold text-sm sm:text-2xl italic tracking-tighter">VS</span>
							</div>
							{dominantStreak && (
								<div
									className={`rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-black tracking-wider uppercase ${getHeatTextClasses(dominantStreak.heatLevel)}`}
								>
									🔥 x{dominantStreak.streak}
								</div>
							)}
							<div className="flex flex-row sm:flex-col gap-1.5 w-auto sm:w-full">
								<button
									type="button"
									onClick={() => handleUndo()}
									className={`glass-panel py-1.5 px-3 sm:px-2 rounded-full flex items-center justify-center border border-primary/20 transition-colors ${
										canUndo ? "cursor-pointer hover:bg-white/5" : "cursor-not-allowed opacity-40"
									}`}
									aria-label="Undo last vote"
									title="Undo last vote"
									disabled={!canUndo}
								>
									<Undo2 className="size-3.5 text-primary" />
								</button>
								<button
									type="button"
									onClick={quitTournament}
									className="glass-panel py-1.5 px-3 sm:px-2 rounded-full flex items-center justify-center border border-destructive/20 cursor-pointer hover:bg-destructive/10 transition-colors"
									aria-label="Quit tournament"
									title="Quit tournament"
								>
									<LogOut className="size-3.5 text-destructive" />
								</button>
							</div>
						</div>

						{/* Right Card */}
						<MatchSideCard
							side="right"
							name={rightName}
							img={rightImg}
							heatLevel={rightHeatLevel}
							streak={rightStreak}
							isVoting={isVoting}
							isSelected={rightSelected}
							hasSelectionFeedback={hasSelectionFeedback}
							isTeam={rightIsTeam}
							members={rightMembers}
							description={rightDescription}
							pronunciation={rightPronunciation}
							onKeyDown={(e) => handleKeyDown(e, "right")}
							onVote={() => handleVoteForSide("right")}
							animationDelay="2s"
						/>
					</motion.div>
				</AnimatePresence>
			</main>

			<div className="absolute top-[-10%] left-[-10%] w-40 h-40 sm:size-64 bg-primary/10 rounded-full blur-[100px] -z-10" />
			<div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 sm:size-64 bg-stardust/10 rounded-full blur-[100px] -z-10" />
		</div>
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
