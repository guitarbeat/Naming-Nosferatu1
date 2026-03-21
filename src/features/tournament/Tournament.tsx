import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	type KeyboardEvent,
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/shared/components/layout/Button";
import { ErrorComponent } from "@/shared/components/layout/Feedback";
import { LoadingSequence } from "@/shared/components/layout/LoadingSequence";
import { getRandomCatImage, getVisibleNames } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import {
	ChevronDown,
	Gamepad2,
	Layers,
	LogOut,
	Music,
	PawPrint,
	SkipBack,
	SkipForward,
	Trophy,
	Undo2,
	Volume2,
	VolumeX,
} from "@/shared/lib/icons";
import type { TournamentProps } from "@/shared/types";
import useAppStore from "@/store/appStore";
import { MatchSideCard } from "./components/MatchSideCard";
import { TournamentComplete } from "./components/TournamentComplete";
import { useAudioManager } from "./hooks";
import { useTournamentState } from "./hooks/useTournamentState";
import { getHeatLevel } from "./utils/heat";
import { extractMatchData, getMatchSideId } from "./utils/matchHelpers";
import { useTimedState } from "./utils/useTimedState";

function TournamentContent({ onComplete, names = [], onVote }: TournamentProps) {
	const navigate = useNavigate();
	const userName = useAppStore((state) => state.user.name);
	const tournamentActions = useAppStore((state) => state.tournamentActions);
	const visibleNames = useMemo(() => getVisibleNames(names), [names]);
	const audioManager = useAudioManager();
	const prefersReducedMotion = useReducedMotion();

	const tournament = useTournamentState(visibleNames, userName);
	const playLevelUpSound = audioManager.playLevelUpSound;
	const playWowSound = audioManager.playWowSound;
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
		handleVoteWithAnimation,
		isVoting,
		matchHistory,
	} = tournament;

	const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
	const [isUtilityPanelOpen, setIsUtilityPanelOpen] = useState(false);
	const voteAnnouncement = useTimedState<string | null>(null);
	const roundAnnouncement = useTimedState<number | null>(null);
	const previousRoundRef = useRef(roundNumber);
	const winnerSequenceShownRef = useRef(false);
	const completionHandledRef = useRef(false);
	const [showWinnerSequence, setShowWinnerSequence] = useState(false);

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
		() => (currentMatch ? calculateWinStreak(getMatchSideId(currentMatch, "left")) : 0),
		[currentMatch, calculateWinStreak],
	);
	const rightStreak = useMemo(
		() => (currentMatch ? calculateWinStreak(getMatchSideId(currentMatch, "right")) : 0),
		[currentMatch, calculateWinStreak],
	);
	const leftHeatLevel = useMemo(() => getHeatLevel(leftStreak), [leftStreak]);
	const rightHeatLevel = useMemo(() => getHeatLevel(rightStreak), [rightStreak]);

	// Vote adapter for external onVote callback
	const handleVoteAdapter = useCallback(
		(winnerId: string, _loserId: string) => {
			if (!onVote || !currentMatch) {
				return;
			}
			const sideData = (side: "left" | "right") => {
				const p = currentMatch[side];
				const id = typeof p === "object" ? String(p.id) : String(p);
				const name =
					currentMatch.mode === "2v2"
						? (currentMatch[side] as any).memberNames.join(" + ")
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
		if (!isComplete) {
			completionHandledRef.current = false;
			return;
		}

		if (!onComplete || completionHandledRef.current) {
			return;
		}

		completionHandledRef.current = true;
		playLevelUpSound();
		setTimeout(() => playWowSound(), 500);
		const results: Record<string, { rating: number; wins: number; losses: number }> = {};
		for (const [id, rating] of Object.entries(ratings)) {
			results[idToName.get(id) ?? id] = { rating, wins: 0, losses: 0 };
		}
		onComplete(results);
	}, [idToName, isComplete, onComplete, playLevelUpSound, playWowSound, ratings]);

	useLayoutEffect(() => {
		if (!isComplete) {
			winnerSequenceShownRef.current = false;
			setShowWinnerSequence(false);
			return;
		}

		if (winnerSequenceShownRef.current) {
			return;
		}

		winnerSequenceShownRef.current = true;
		setShowWinnerSequence(true);
	}, [isComplete]);

	const showCatPictures = useAppStore((state) => state.ui.showCatPictures);
	const setCatPictures = useAppStore((state) => state.uiActions.setCatPictures);

	const matchData = useMemo(
		() => (currentMatch ? extractMatchData(currentMatch) : null),
		[currentMatch],
	);

	useEffect(() => {
		if (!currentMatch) {
			setSelectedSide(null);
			setIsUtilityPanelOpen(false);
			return;
		}
		setSelectedSide(null);
		setIsUtilityPanelOpen(false);
	}, [currentMatch]);

	// Round change announcements
	useEffect(() => {
		if (isComplete) {
			previousRoundRef.current = roundNumber;
			return;
		}
		if (roundNumber > previousRoundRef.current) {
			audioManager.playSurpriseSound();
			roundAnnouncement.setTimed(roundNumber, prefersReducedMotion ? 350 : 1200);
		}
		previousRoundRef.current = roundNumber;
	}, [roundNumber, isComplete, audioManager, roundAnnouncement, prefersReducedMotion]);

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
				audioManager.playStreakSound(expectedStreak);
			}

			setIsUtilityPanelOpen(false);
			setSelectedSide(side);
			voteAnnouncement.setTimed(winnerName, prefersReducedMotion ? 250 : 900);
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
		showCatPictures && matchData ? getRandomCatImage(matchData.leftId, CAT_IMAGES) : null;
	const rightImg =
		showCatPictures && matchData ? getRandomCatImage(matchData.rightId, CAT_IMAGES) : null;
	const hasSelectionFeedback = selectedSide !== null;
	const currentMatchKey = matchData
		? `${roundNumber}-${currentMatchNumber}-${matchData.leftId}-${matchData.rightId}`
		: `${roundNumber}-${currentMatchNumber}`;
	const progressPercent = totalMatches
		? Math.round(Math.max(0, Math.min(100, progress || (currentMatchNumber / totalMatches) * 100)))
		: 0;

	const quitTournament = useCallback(() => {
		handleQuit();
		tournamentActions.resetTournament();
		navigate("/");
	}, [handleQuit, tournamentActions, navigate]);
	const handleWinnerSequenceComplete = useCallback(() => {
		setShowWinnerSequence(false);
	}, []);

	// Completion screen
	if (isComplete) {
		return (
			<>
				<TournamentComplete
					totalMatches={totalMatches}
					participantCount={visibleNames.length}
					onNewTournament={quitTournament}
				/>
				{showWinnerSequence && (
					<LoadingSequence
						tone="victory"
						title="A Victor Emerges"
						subtitle="Sealing the bracket before the final analysis."
						onComplete={handleWinnerSequenceComplete}
					/>
				)}
			</>
		);
	}

	if (!matchData) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading tournament...</div>
			</div>
		);
	}

	const utilityControls = [
		{
			action: audioManager.handleToggleMute,
			icon: audioManager.isMuted ? VolumeX : Volume2,
			label: audioManager.isMuted ? "Unmute sound" : "Mute sound",
		},
		{
			action: audioManager.handlePreviousTrack,
			icon: SkipBack,
			label: "Previous track",
		},
		{
			action: audioManager.toggleBackgroundMusic,
			icon: Music,
			label: audioManager.backgroundMusicEnabled ? "Stop music" : "Play music",
		},
		{
			action: audioManager.handleNextTrack,
			icon: SkipForward,
			label: "Next track",
		},
		{
			action: () => setCatPictures(!showCatPictures),
			icon: PawPrint,
			label: showCatPictures ? "Hide cat pictures" : "Show cat pictures",
		},
	] as const;

	const activeStatus = voteAnnouncement.value
		? {
				key: `vote-${currentMatchKey}-${voteAnnouncement.value}`,
				eyebrow: "Choice locked",
				title: `${voteAnnouncement.value} advances`,
				detail: "Preparing the next matchup.",
				icon: Trophy,
				toneClass:
					"border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-50 shadow-[0_12px_32px_rgba(16,185,129,0.18)]",
			}
		: roundAnnouncement.value !== null
			? {
					key: `round-${roundAnnouncement.value}`,
					eyebrow: `Round ${roundAnnouncement.value}`,
					title: `${bracketStage} matchups ready`,
					detail: "Fresh pairings are on deck.",
					icon: Gamepad2,
					toneClass:
						"border-primary/25 bg-primary/[0.08] text-foreground shadow-[0_12px_32px_rgba(166,94,237,0.14)]",
				}
			: null;
	const StatusIcon = activeStatus?.icon;

	return (
		<div className="relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col font-display text-foreground selection:bg-primary/30">
			<header className="px-3 sm:px-4 pt-2 pb-3 flex-shrink-0">
				<div className="rounded-[1.35rem] border border-border/15 bg-foreground/[0.04] px-3 py-3 shadow-[0_20px_45px_rgba(0,0,0,0.12)] backdrop-blur-md">
					<div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
						<div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border/15 bg-foreground/[0.05] px-3 py-2">
							<Gamepad2 className="size-3.5 text-primary" />
							<div className="flex flex-col leading-none">
								<span className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">
									{bracketStage}
								</span>
								<span className="text-xs font-semibold text-foreground/90">
									R{roundNumber}/{totalRounds}
									{tournamentMode === "2v2" ? " · 2v2" : ""}
								</span>
							</div>
						</div>

						<div className="min-w-[9rem] flex-1">
							<div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
								<span>
									Match {currentMatchNumber} of {totalMatches}
								</span>
								<span>{progressPercent}%</span>
							</div>
							<div className="h-1.5 min-w-0 overflow-hidden rounded-full bg-foreground/8">
								<div
									className="h-full rounded-full bg-primary transition-all duration-500"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>

						<div className="ml-auto flex items-center gap-1.5">
							<Button
								type="button"
								onClick={() => handleUndo()}
								variant="ghost"
								size="icon"
								iconOnly={true}
								shape="pill"
								className={`size-9 ${
									canUndo
										? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/14 hover:text-primary"
										: "border-border/10 bg-foreground/[0.03] text-foreground/35"
								}`}
								aria-label="Undo last vote"
								disabled={!canUndo}
							>
								<Undo2 className="size-3.5" />
							</Button>
							<Button
								type="button"
								onClick={() => setIsUtilityPanelOpen((open) => !open)}
								variant="ghost"
								presentation="chip"
								shape="pill"
								className="border border-border/15 bg-foreground/[0.05] text-foreground/80 hover:bg-foreground/[0.08] hover:text-foreground"
								aria-label={
									isUtilityPanelOpen ? "Hide tournament utilities" : "Show tournament utilities"
								}
								aria-expanded={isUtilityPanelOpen}
							>
								<Layers className="size-3.5" />
								<span className="hidden sm:inline">Tools</span>
								<ChevronDown
									className={`size-3 transition-transform ${
										isUtilityPanelOpen ? "rotate-180" : ""
									}`}
								/>
							</Button>
							<Button
								type="button"
								onClick={quitTournament}
								variant="ghost"
								size="icon"
								iconOnly={true}
								shape="pill"
								className="size-9 border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/14 hover:text-destructive"
								aria-label="Quit tournament"
							>
								<LogOut className="size-3.5" />
							</Button>
						</div>
					</div>

					{isUtilityPanelOpen && (
						<div className="mt-3 flex justify-end" data-testid="tournament-utilities">
							<div className="flex max-w-full flex-wrap justify-end gap-2 rounded-[1rem] border border-border/12 bg-foreground/[0.03] p-2">
								{utilityControls.map(({ action, icon: Icon, label }) => (
									<Button
										key={label}
										type="button"
										onClick={action}
										variant="ghost"
										presentation="chip"
										shape="pill"
										className="border border-border/12 bg-background/40 text-foreground/75 hover:bg-background/65 hover:text-foreground"
										aria-label={label}
										startIcon={<Icon className="size-3.5" />}
									>
										<span>{label}</span>
									</Button>
								))}
							</div>
						</div>
					)}
				</div>
			</header>

			<main className="relative flex flex-1 flex-col items-center justify-start px-2 py-3 min-h-0 sm:px-4 sm:py-2 sm:justify-center">
				<div className="sr-only" aria-live="polite">
					{roundAnnouncement.value !== null && `Round ${roundAnnouncement.value} begins.`}
					{voteAnnouncement.value && `${voteAnnouncement.value} advances.`}
				</div>

				<AnimatePresence mode="wait" initial={false}>
					{activeStatus && (
						<motion.div
							key={activeStatus.key}
							initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
							animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
							exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
							transition={{ duration: prefersReducedMotion ? 0.01 : 0.22 }}
							className="pointer-events-none absolute top-2 left-1/2 z-20 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 px-2"
						>
							<div
								className={`rounded-[1.1rem] border px-4 py-3 backdrop-blur-xl ${activeStatus.toneClass}`}
							>
								<div className="flex items-start gap-3">
									{StatusIcon ? <StatusIcon className="mt-0.5 size-4 shrink-0" /> : null}
									<div className="min-w-0">
										<p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
											{activeStatus.eyebrow}
										</p>
										<p className="truncate text-sm font-semibold sm:text-base">
											{activeStatus.title}
										</p>
										<p className="text-xs opacity-70">{activeStatus.detail}</p>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Match cards */}
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
						<div className="flex flex-row sm:flex-col items-center justify-center gap-3 py-1 w-full sm:w-20">
							<div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border border-border/20 bg-foreground/[0.04] backdrop-blur-md flex-shrink-0">
								<span className="font-bold text-sm sm:text-2xl italic tracking-tighter">VS</span>
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
						/>
					</motion.div>
				</AnimatePresence>
			</main>
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
