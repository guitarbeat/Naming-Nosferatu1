import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	type KeyboardEvent,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { ErrorComponent } from "@/shared/components/layout/Feedback";
import { getRandomCatImage, getVisibleNames } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import {
	Clock,
	Gamepad2,
	LogOut,
	Medal,
	Music,
	PawPrint,
	SkipBack,
	SkipForward,
	Trophy,
	Undo2,
	Volume2,
	VolumeX,
	X,
} from "@/shared/lib/icons";
import type { TournamentProps } from "@/shared/types";
import useAppStore from "@/store/appStore";
import { BracketTree } from "./components/BracketTree";
import { MatchSideCard } from "./components/MatchSideCard";
import { TournamentComplete } from "./components/TournamentComplete";
import { useAudioManager } from "./hooks";
import { useTournamentState } from "./hooks/useTournamentState";
import {
	getFlameCount,
	getHeatLevel,
	getHeatTextClasses,
	type HeatLevel,
	STREAK_THRESHOLDS,
} from "./utils/heat";
import { extractMatchData, getMatchSideId } from "./utils/matchHelpers";
import { useTimedState } from "./utils/useTimedState";

interface StreakBurst {
	key: number;
	side: "left" | "right";
	winnerName: string;
	streak: number;
	heatLevel: HeatLevel;
}

function TournamentContent({
	onComplete,
	names = [],
	onVote,
}: TournamentProps) {
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

	const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(
		null,
	);
	const voteAnnouncement = useTimedState<string | null>(null);
	const roundAnnouncement = useTimedState<number | null>(null);
	const streakBurst = useTimedState<StreakBurst | null>(null);
	const previousRoundRef = useRef(roundNumber);

	// Calculate winning streaks
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
				if (leftId !== targetId && rightId !== targetId) {
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

	const leftStreak = useMemo(
		() =>
			currentMatch
				? calculateWinStreak(getMatchSideId(currentMatch, "left"))
				: 0,
		[currentMatch, calculateWinStreak],
	);
	const rightStreak = useMemo(
		() =>
			currentMatch
				? calculateWinStreak(getMatchSideId(currentMatch, "right"))
				: 0,
		[currentMatch, calculateWinStreak],
	);
	const leftHeatLevel = useMemo(() => getHeatLevel(leftStreak), [leftStreak]);
	const rightHeatLevel = useMemo(
		() => getHeatLevel(rightStreak),
		[rightStreak],
	);

	// Vote adapter for external onVote callback
	const handleVoteAdapter = useCallback(
		(winnerId: string, _loserId: string) => {
			if (!onVote || !currentMatch) return;
			const sideData = (side: "left" | "right") => {
				const p = currentMatch[side];
				const id = typeof p === "object" ? String(p.id) : String(p);
				const name =
					currentMatch.mode === "2v2"
						? (
								currentMatch[side] as { memberNames: string[] }
							).memberNames.join(" + ")
						: typeof p === "object"
							? p.name
							: String(p);
				return {
					name,
					id,
					description: "",
					outcome: winnerId === id ? "winner" : "loser",
				};
			};
			onVote({
				match: { left: sideData("left"), right: sideData("right") },
				result: winnerId === sideData("left").id ? 1 : 0,
				ratings,
				timestamp: new Date().toISOString(),
			});
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
			const results: Record<
				string,
				{ rating: number; wins: number; losses: number }
			> = {};
			for (const [id, rating] of Object.entries(ratings)) {
				results[idToName.get(id) ?? id] = { rating, wins: 0, losses: 0 };
			}
			onComplete(results);
		}
	}, [isComplete, ratings, onComplete, idToName, audioManager]);

	const showCatPictures = useAppStore((state) => state.ui.showCatPictures);
	const setCatPictures = useAppStore((state) => state.uiActions.setCatPictures);

	const matchData = useMemo(
		() => (currentMatch ? extractMatchData(currentMatch) : null),
		[currentMatch],
	);

	useEffect(() => {
		if (!currentMatch) {
			setSelectedSide(null);
			streakBurst.set(null);
			return;
		}
		setSelectedSide(null);
	}, [currentMatch, streakBurst.set]);

	// Round change announcements
	useEffect(() => {
		if (isComplete) {
			previousRoundRef.current = roundNumber;
			return;
		}
		if (roundNumber > previousRoundRef.current) {
			audioManager.playSurpriseSound();
			roundAnnouncement.setTimed(
				roundNumber,
				prefersReducedMotion ? 350 : 1200,
			);
		}
		previousRoundRef.current = roundNumber;
	}, [
		roundNumber,
		isComplete,
		audioManager,
		roundAnnouncement,
		prefersReducedMotion,
	]);

	const handleVoteForSide = useCallback(
		(side: "left" | "right") => {
			if (isVoting || !matchData) return;
			audioManager.primeAudioExperience();

			const winnerId = side === "left" ? matchData.leftId : matchData.rightId;
			const loserId = side === "left" ? matchData.rightId : matchData.leftId;
			const winnerName =
				side === "left" ? matchData.leftName : matchData.rightName;
			const expectedStreak = (side === "left" ? leftStreak : rightStreak) + 1;
			const heatLevel = getHeatLevel(expectedStreak);

			if (heatLevel) {
				streakBurst.setTimed(
					{
						key: Date.now(),
						side,
						winnerName,
						streak: expectedStreak,
						heatLevel,
					},
					prefersReducedMotion ? 280 : 950,
				);
				audioManager.playStreakSound(expectedStreak);
			}

			setSelectedSide(side);
			voteAnnouncement.setTimed(winnerName, prefersReducedMotion ? 250 : 900);
			handleVoteWithAnimation(winnerId, loserId);
			if (onVote) handleVoteAdapter(winnerId, loserId);
		},
		[
			isVoting,
			matchData,
			audioManager,
			leftStreak,
			rightStreak,
			streakBurst,
			prefersReducedMotion,
			voteAnnouncement,
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
		showCatPictures && matchData
			? getRandomCatImage(matchData.leftId, CAT_IMAGES)
			: null;
	const rightImg =
		showCatPictures && matchData
			? getRandomCatImage(matchData.rightId, CAT_IMAGES)
			: null;
	const hasSelectionFeedback = selectedSide !== null;
	const currentMatchKey = matchData
		? `${roundNumber}-${currentMatchNumber}-${matchData.leftId}-${matchData.rightId}`
		: `${roundNumber}-${currentMatchNumber}`;

	const quitTournament = useCallback(() => {
		handleQuit();
		tournamentActions.resetTournament();
		navigate("/");
	}, [handleQuit, tournamentActions, navigate]);

	// Completion screen
	if (isComplete) {
		return (
			<TournamentComplete
				totalMatches={totalMatches}
				participantCount={visibleNames.length}
				onNewTournament={quitTournament}
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
				? {
						name: matchData.leftName,
						streak: leftStreak,
						heatLevel: leftHeatLevel ?? ("warm" as HeatLevel),
					}
				: null
			: rightStreak >= STREAK_THRESHOLDS.warm
				? {
						name: matchData.rightName,
						streak: rightStreak,
						heatLevel: rightHeatLevel ?? ("warm" as HeatLevel),
					}
				: null;

	return (
		<div className="relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col font-display text-foreground selection:bg-primary/30">
			<header className="px-2 sm:px-4 pt-1.5 sm:pt-2 pb-1 flex-shrink-0 space-y-1 sm:space-y-1.5">
				{/* Row 1: Round info, progress bar, match count, controls */}
				<div className="flex items-center gap-2 sm:gap-3">
					<div className="shrink-0 px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-foreground/10 backdrop-blur-md border border-border/20">
						<Gamepad2 className="text-primary size-3" />
						<span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-foreground/90 whitespace-nowrap">
							R{roundNumber}/{totalRounds} · {bracketStage}
						</span>
						<span className="text-[10px] sm:text-xs text-foreground/50">·</span>
						<span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-foreground/70">
							{tournamentMode === "2v2" ? "2v2" : "1v1"}
						</span>
					</div>

					<div className="flex-1 h-1.5 bg-foreground/5 rounded-full overflow-hidden min-w-0">
						<div
							className={`h-full rounded-full transition-all duration-500 bg-primary shadow-[0_0_10px_#a65eed]`}
							style={{
								width: `${progress || (currentMatchNumber / totalMatches) * 100}%`,
							}}
						/>
					</div>

					<div className="shrink-0 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-foreground/70">
						<Medal className="text-accent size-3.5" />
						<span>
							{currentMatchNumber}/{totalMatches}
						</span>
						{etaMinutes > 0 && (
							<>
								<Clock className="size-3 text-muted-foreground" />
								<span className="text-muted-foreground">~{etaMinutes}m</span>
							</>
						)}
					</div>

					{/* Controls - wrap on mobile */}
					<div className="shrink-0 flex flex-wrap items-center gap-1">
						{(
							[
								{
									action: audioManager.handleToggleMute,
									icon: audioManager.isMuted ? VolumeX : Volume2,
									label: audioManager.isMuted ? "Unmute" : "Mute",
								},
								{
									action: audioManager.toggleBackgroundMusic,
									icon: Music,
									label: audioManager.backgroundMusicEnabled
										? "Stop music"
										: "Play music",
									active: audioManager.backgroundMusicEnabled,
								},
								{
									action: () => setCatPictures(!showCatPictures),
									icon: PawPrint,
									label: showCatPictures ? "Names only" : "Show cats",
									active: showCatPictures,
								},
							] as const
						).map(({ action, icon: Icon, label, active }) => (
							<button
								key={label}
								type="button"
								onClick={action}
								className={`size-7 sm:size-8 flex items-center justify-center rounded-lg transition-colors ${
									active
										? "bg-primary/20 text-primary"
										: "bg-foreground/5 text-muted-foreground hover:text-foreground"
								}`}
								aria-label={label}
							>
								<Icon className="size-3" />
							</button>
						))}
						{/* Track controls hidden on mobile to save space */}
						<button
							type="button"
							onClick={audioManager.handlePreviousTrack}
							className="hidden sm:flex size-8 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Previous track"
						>
							<SkipBack className="size-3" />
						</button>
						<button
							type="button"
							onClick={audioManager.handleNextTrack}
							className="hidden sm:flex size-8 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Next track"
						>
							<SkipForward className="size-3" />
						</button>
						{handleQuit && (
							<button
								type="button"
								onClick={handleQuit}
								className="size-7 sm:size-8 flex items-center justify-center rounded-lg bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors"
								aria-label="Quit tournament"
							>
								<X className="size-3.5" />
							</button>
						)}
					</div>
				</div>

				{/* Row 2: Bracket path + streak (hidden on mobile) */}
				<div className="hidden sm:flex items-center justify-between gap-2">
					<BracketTree round={roundNumber} totalRounds={totalRounds} />
					{dominantStreak && (
						<span
							className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${getHeatTextClasses(dominantStreak.heatLevel)}`}
						>
							🔥 {dominantStreak.name} x{dominantStreak.streak}
						</span>
					)}
				</div>
			</header>

			<main className="relative flex flex-1 flex-col items-center justify-start px-1 py-2 min-h-0 sm:px-4 sm:py-2 sm:justify-center">
				{/* Animated blob backgrounds - smaller on mobile */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
					<div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full animate-blob animation-delay-2000" />
					<div className="absolute top-1/4 right-0 w-24 h-24 bg-stardust/20 rounded-full animate-blob" />
					<div className="absolute bottom-1/4 left-1/4 w-28 h-28 bg-primary/15 rounded-full animate-blob animation-delay-4000" />
					<div className="absolute bottom-0 right-1/3 w-36 h-36 bg-stardust/15 rounded-full animate-blob animation-delay-2000" />
				</div>

				<div className="sr-only" aria-live="polite">
					{roundAnnouncement.value !== null &&
						`Round ${roundAnnouncement.value} begins.`}
					{voteAnnouncement.value && `${voteAnnouncement.value} advances.`}
					{streakBurst.value &&
						`${streakBurst.value.winnerName} is on a ${streakBurst.value.streak} win streak.`}
				</div>

				{/* Vote announcement overlay */}
				<AnimatePresence>
					{voteAnnouncement.value && (
						<motion.div
							key={`${voteAnnouncement.value}-${currentMatchKey}`}
							initial={
								prefersReducedMotion
									? { opacity: 0 }
									: { opacity: 0, y: -16, scale: 0.95 }
							}
							animate={
								prefersReducedMotion
									? { opacity: 1 }
									: { opacity: 1, y: 0, scale: 1 }
							}
							exit={
								prefersReducedMotion
									? { opacity: 0 }
									: { opacity: 0, y: -20, scale: 0.98 }
							}
							transition={{ duration: prefersReducedMotion ? 0.01 : 0.28 }}
							className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] sm:w-auto max-w-full"
						>
							<div className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 sm:px-4 py-2 backdrop-blur-md shadow-[0_0_40px_rgba(16,185,129,0.35)]">
								<div className="flex items-center gap-2 text-emerald-100">
									<Trophy className="text-emerald-300 size-4" />
									<span className="text-xs sm:text-sm font-bold tracking-wide truncate">
										{voteAnnouncement.value} advances
									</span>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Streak burst overlay */}
				<AnimatePresence>
					{streakBurst.value && (
						<motion.div
							key={`streak-burst-${streakBurst.value.key}`}
							initial={
								prefersReducedMotion
									? { opacity: 0 }
									: { opacity: 0, y: 18, scale: 0.94 }
							}
							animate={
								prefersReducedMotion
									? { opacity: 1 }
									: { opacity: 1, y: 0, scale: 1 }
							}
							exit={
								prefersReducedMotion
									? { opacity: 0 }
									: { opacity: 0, y: -18, scale: 1.03 }
							}
							transition={{ duration: prefersReducedMotion ? 0.01 : 0.28 }}
							className={`pointer-events-none absolute z-30 top-[20%] ${
								streakBurst.value.side === "left"
									? "left-3 sm:left-6"
									: "right-3 sm:right-6 text-right"
							}`}
						>
							<div
								className={`rounded-2xl border px-4 py-3 backdrop-blur-lg shadow-[0_0_40px_rgba(249,115,22,0.35)] ${getHeatTextClasses(streakBurst.value.heatLevel)}`}
							>
								<p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] opacity-80">
									Streak Ignited
								</p>
								<p className="text-base sm:text-lg font-black tracking-tight">
									{streakBurst.value.winnerName} x{streakBurst.value.streak}
								</p>
								<div className="flex gap-1 mt-1">
									{Array.from({
										length: getFlameCount(streakBurst.value.streak, 9),
									}).map((_, i) => (
										<span
											// biome-ignore lint/suspicious/noArrayIndexKey: Safe for decorative flames
											key={`streak-flame-${streakBurst.value?.key}-${i}`}
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

				{/* Round announcement overlay */}
				<AnimatePresence>
					{roundAnnouncement.value !== null && (
						<motion.div
							key={`round-announcement-${roundAnnouncement.value}`}
							initial={
								prefersReducedMotion
									? { opacity: 0 }
									: { opacity: 0, scale: 0.96 }
							}
							animate={
								prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
							}
							exit={
								prefersReducedMotion
									? { opacity: 0 }
									: { opacity: 0, scale: 1.02 }
							}
							transition={{ duration: prefersReducedMotion ? 0.01 : 0.35 }}
							className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4"
						>
							<motion.div
								initial={
									prefersReducedMotion
										? { opacity: 1 }
										: { opacity: 0.85, y: 8 }
								}
								animate={
									prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
								}
								exit={
									prefersReducedMotion
										? { opacity: 1 }
										: { opacity: 0.7, y: -6 }
								}
								transition={{ duration: prefersReducedMotion ? 0.01 : 0.3 }}
								className="relative overflow-hidden rounded-2xl border border-purple-300/40 bg-slate-900/80 px-5 sm:px-8 py-5 sm:py-6 text-center shadow-[0_0_80px_rgba(168,85,247,0.35)] backdrop-blur-xl"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/10 to-blue-500/20" />
								<div className="relative">
									<p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-purple-200/70 mb-2">
										Next Stage
									</p>
									<p className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
										Round {roundAnnouncement.value}
									</p>
									<p className="text-xs sm:text-sm text-purple-100/80 mt-1">
										New head-to-head matchups ready
									</p>
								</div>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Match cards */}
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={currentMatchKey}
						initial={
							prefersReducedMotion
								? { opacity: 0 }
								: { opacity: 0, y: 14, filter: "blur(6px)" }
						}
						animate={
							prefersReducedMotion
								? { opacity: 1 }
								: { opacity: 1, y: 0, filter: "blur(0px)" }
						}
						exit={
							prefersReducedMotion
								? { opacity: 0 }
								: { opacity: 0, y: -12, filter: "blur(6px)" }
						}
						transition={{ duration: prefersReducedMotion ? 0.01 : 0.32 }}
						className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-stretch gap-4 sm:grid sm:h-full sm:min-h-0 sm:grid-cols-[1fr_auto_1fr] sm:gap-4"
					>
						<MatchSideCard
							side="left"
							name={matchData.leftName}
							img={leftImg}
							heatLevel={leftHeatLevel}
							streak={leftStreak}
							isVoting={isVoting}
							isSelected={selectedSide === "left"}
							hasSelectionFeedback={hasSelectionFeedback}
							isTeam={matchData.leftIsTeam}
							members={matchData.leftMembers}
							description={matchData.leftDescription}
							pronunciation={matchData.leftPronunciation}
							onKeyDown={(e) => handleKeyDown(e, "left")}
							onVote={() => handleVoteForSide("left")}
						/>

						{/* VS Indicator */}
						<div className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2 py-1 w-full sm:w-20">
							<div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 border-border/30 bg-primary/20 backdrop-blur-md shadow-lg flex-shrink-0">
								<span className="font-bold text-sm sm:text-2xl italic tracking-tighter">
									VS
								</span>
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
										canUndo
											? "cursor-pointer hover:bg-white/5"
											: "cursor-not-allowed opacity-40"
									}`}
									aria-label="Undo last vote"
									disabled={!canUndo}
								>
									<Undo2 className="size-3.5 text-primary" />
								</button>
								<button
									type="button"
									onClick={quitTournament}
									className="glass-panel py-1.5 px-3 sm:px-2 rounded-full flex items-center justify-center border border-destructive/20 cursor-pointer hover:bg-destructive/10 transition-colors"
									aria-label="Quit tournament"
								>
									<LogOut className="size-3.5 text-destructive" />
								</button>
							</div>
						</div>

						<MatchSideCard
							side="right"
							name={matchData.rightName}
							img={rightImg}
							heatLevel={rightHeatLevel}
							streak={rightStreak}
							isVoting={isVoting}
							isSelected={selectedSide === "right"}
							hasSelectionFeedback={hasSelectionFeedback}
							isTeam={matchData.rightIsTeam}
							members={matchData.rightMembers}
							description={matchData.rightDescription}
							pronunciation={matchData.rightPronunciation}
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
