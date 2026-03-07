import { AnimatePresence, motion } from "framer-motion";
import { type KeyboardEvent } from "react";
import {
	getFlameCount,
	getHeatTextClasses,
	type HeatLevel,
} from "@/features/tournament/lib/tournamentUi";
import { Card } from "@/shared/components/layout/Card";
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
import { TournamentBracketTree } from "./TournamentBracketTree";
import { TournamentMatchSideCard } from "./TournamentMatchSideCard";

interface StreakBurst {
	key: number;
	side: "left" | "right";
	winnerName: string;
	streak: number;
	heatLevel: HeatLevel;
}

interface TournamentActiveViewProps {
	roundNumber: number;
	totalRounds: number;
	bracketStage: string;
	currentMatchNumber: number;
	totalMatches: number;
	tournamentMode: "1v1" | "2v2";
	isComplete: boolean;
	etaMinutes: number;
	progress: number;
	audioManager: {
		handleToggleMute: () => void;
		isMuted: boolean;
		volume: number;
		handleVolumeChange: (_event: Event | null, newValue: number | number[]) => void;
		handlePreviousTrack: () => void;
		toggleBackgroundMusic: () => void;
		backgroundMusicEnabled: boolean;
		currentTrack: string;
		handleNextTrack: () => void;
	};
	handleQuit?: () => void;
	showCatPictures: boolean;
	setCatPictures: (show: boolean) => void;
	quitTournament: () => void;
	canUndo: boolean;
	handleUndo: () => void;
	voteAnnouncement: string | null;
	roundAnnouncement: number | null;
	streakBurst: StreakBurst | null;
	currentMatchKey: string;
	prefersReducedMotion: boolean;
	leftName: string;
	rightName: string;
	leftImg: string | null;
	rightImg: string | null;
	leftHeatLevel: HeatLevel | null;
	rightHeatLevel: HeatLevel | null;
	leftStreak: number;
	rightStreak: number;
	isVoting: boolean;
	leftSelected: boolean;
	rightSelected: boolean;
	hasSelectionFeedback: boolean;
	leftIsTeam: boolean;
	rightIsTeam: boolean;
	leftMembers: string[];
	rightMembers: string[];
	leftDescription?: string;
	rightDescription?: string;
	leftPronunciation?: string;
	rightPronunciation?: string;
	handleKeyDown: (e: KeyboardEvent<HTMLElement>, side: "left" | "right") => void;
	handleVoteForSide: (side: "left" | "right") => void;
	dominantStreak: {
		name: string;
		streak: number;
		heatLevel: HeatLevel;
	} | null;
}

export function TournamentActiveView({
	roundNumber,
	totalRounds,
	bracketStage,
	currentMatchNumber,
	totalMatches,
	tournamentMode,
	isComplete,
	etaMinutes,
	progress,
	audioManager,
	handleQuit,
	showCatPictures,
	setCatPictures,
	quitTournament,
	canUndo,
	handleUndo,
	voteAnnouncement,
	roundAnnouncement,
	streakBurst,
	currentMatchKey,
	prefersReducedMotion,
	leftName,
	rightName,
	leftImg,
	rightImg,
	leftHeatLevel,
	rightHeatLevel,
	leftStreak,
	rightStreak,
	isVoting,
	leftSelected,
	rightSelected,
	hasSelectionFeedback,
	leftIsTeam,
	rightIsTeam,
	leftMembers,
	rightMembers,
	leftDescription,
	rightDescription,
	leftPronunciation,
	rightPronunciation,
	handleKeyDown,
	handleVoteForSide,
	dominantStreak,
}: TournamentActiveViewProps) {
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
					<TournamentBracketTree round={roundNumber} totalRounds={totalRounds} />
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
						<TournamentMatchSideCard
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

						<TournamentMatchSideCard
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
