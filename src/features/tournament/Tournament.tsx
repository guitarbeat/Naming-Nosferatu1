import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Card } from "@/shared/components/layout/Card";
import CatImage from "@/shared/components/layout/CatImage";
import { ErrorComponent } from "@/shared/components/layout/Feedback";
import {
        exportTournamentResultsToCSV,
        getRandomCatImage,
        getVisibleNames,
} from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import {
        Clock,
        Gamepad2,
        Home,
        LogOut,
        Medal,
        Music,
        PartyPopper,
        PawPrint,
        RefreshCcw,
        SkipBack,
        SkipForward,
        Trophy,
        Undo2,
        Volume2,
        VolumeX,
        X,
} from "@/shared/lib/icons";
import type { NameItem, TournamentProps } from "@/shared/types";
import useAppStore from "@/store/appStore";
import { useAudioManager, useTournamentState } from "./hooks";

function TournamentContent({ onComplete, names = [], onVote }: TournamentProps) {
        // Optimization: Only select user.name to avoid re-renders on other store changes
        const userName = useAppStore((state) => state.user.name);
        const visibleNames = useMemo(() => getVisibleNames(names), [names]);
        const audioManager = useAudioManager();
        const prefersReducedMotion = useReducedMotion();

        const tournament = useTournamentState(visibleNames, userName);
        const {
                currentMatch,
                ratings,
                isComplete,
                round: roundNumber,
                matchNumber: currentMatchNumber,
                totalMatches,
                handleUndo,
                handleQuit,
                progress,
                etaMinutes = 0,
                handleVoteWithAnimation,
                isVoting,
        } = tournament;
        const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
        const [voteAnnouncement, setVoteAnnouncement] = useState<string | null>(null);
        const [roundAnnouncement, setRoundAnnouncement] = useState<number | null>(null);
        const previousRoundRef = useRef(roundNumber);
        const voteAnnouncementTimeoutRef = useRef<number | null>(null);
        const roundAnnouncementTimeoutRef = useRef<number | null>(null);

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

        useEffect(() => {
                return () => {
                        clearVoteAnnouncementTimeout();
                        clearRoundAnnouncementTimeout();
                };
        }, [clearVoteAnnouncementTimeout, clearRoundAnnouncementTimeout]);

        // Adapter to convert VoteData to winnerId/loserId for the hook
        const handleVoteAdapter = useCallback(
                (winnerId: string, _loserId: string) => {
                        if (onVote && currentMatch) {
                                const leftId = String(
                                        typeof currentMatch.left === "object" ? currentMatch.left.id : currentMatch.left,
                                );
                                const rightId = String(
                                        typeof currentMatch.right === "object" ? currentMatch.right.id : currentMatch.right,
                                );
                                const leftName =
                                        typeof currentMatch.left === "object" ? currentMatch.left.name : currentMatch.left;
                                const rightName =
                                        typeof currentMatch.right === "object" ? currentMatch.right.name : currentMatch.right;

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
                        const nameItems: NameItem[] = [];

                        for (const [id, rating] of Object.entries(ratings)) {
                                const name = idToName.get(id) ?? id;
                                results[name] = { rating, wins: 0, losses: 0 };
                                nameItems.push({
                                        id,
                                        name,
                                        rating,
                                        wins: 0,
                                        losses: 0,
                                } as NameItem);
                        }

                        // Auto-export results to CSV
                        exportTournamentResultsToCSV(
                                nameItems,
                                `tournament_results_${new Date().toISOString().slice(0, 10)}.csv`,
                        );

                        onComplete(results);
                }
        }, [isComplete, ratings, onComplete, idToName, audioManager]);

        const showCatPictures = useAppStore((state) => state.ui.showCatPictures);
        const setCatPictures = useAppStore((state) => state.uiActions.setCatPictures);
        const matchData = useMemo(() => {
                if (!currentMatch) {
                        return null;
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
        const selectedName =
                selectedSide === "left"
                        ? (matchData?.leftName ?? null)
                        : selectedSide === "right"
                                ? (matchData?.rightName ?? null)
                                : null;

        useEffect(() => {
                if (!currentMatch) {
                        setSelectedSide(null);
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

                        const winnerId = side === "left" ? matchData.leftId : matchData.rightId;
                        const loserId = side === "left" ? matchData.rightId : matchData.leftId;
                        const winnerName = side === "left" ? matchData.leftName : matchData.rightName;

                        triggerVoteFeedback(winnerName, side);
                        handleVoteWithAnimation(winnerId, loserId);

                        if (onVote) {
                                handleVoteAdapter(winnerId, loserId);
                        }
                },
                [isVoting, matchData, triggerVoteFeedback, handleVoteWithAnimation, onVote, handleVoteAdapter],
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
                                                <h1 className="font-whimsical text-4xl text-white tracking-wide mb-4">
                                                        Tournament Complete!
                                                </h1>
                                                <p className="text-white/80 mb-6">
                                                        Congratulations! Your tournament results have been downloaded as a CSV file.
                                                </p>

                                                <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4 text-left">
                                                                <div className="bg-white/5 rounded-lg p-4">
                                                                        <div className="text-sm text-white/60 mb-1">Total Matches</div>
                                                                        <div className="text-xl font-bold text-white">{totalMatches}</div>
                                                                </div>
                                                                <div className="bg-white/5 rounded-lg p-4">
                                                                        <div className="text-sm text-white/60 mb-1">Participants</div>
                                                                        <div className="text-xl font-bold text-white">{visibleNames.length}</div>
                                                                </div>
                                                        </div>

                                                        <div className="flex flex-col gap-3 pt-4">
                                                                <button
                                                                        onClick={() => window.location.reload()}
                                                                        className="w-full glass-panel py-3 px-6 rounded-full flex items-center justify-center gap-3 border border-primary/20 cursor-pointer hover:bg-white/5 transition-colors"
                                                                >
                                                                        <RefreshCcw className="text-primary" />
                                                                        <span className="font-bold text-white">Start New Tournament</span>
                                                                </button>

                                                                {onComplete && (
                                                                        <button
                                                                                onClick={() => onComplete({})}
                                                                                className="w-full glass-panel py-3 px-6 rounded-full flex items-center justify-center gap-3 border border-white/20 cursor-pointer hover:bg-white/5 transition-colors"
                                                                        >
                                                                                <Home className="text-white" />
                                                                                <span className="font-bold text-white">Back to Main Menu</span>
                                                                        </button>
                                                                )}
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
                                <div className="text-white/60">Loading tournament...</div>
                        </div>
                );
        }

        const {
                leftName,
                rightName,
                leftDescription,
                rightDescription,
                leftPronunciation,
                rightPronunciation,
        } = matchData;

        return (
                <div className="relative h-screen w-full overflow-hidden flex flex-col font-display text-white selection:bg-primary/30">
                        <header className="pt-2 px-3 sm:px-4 space-y-2 flex-shrink-0">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                                <div className="px-3 py-1.5 sm:px-4 rounded-full flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20">
                                                        <Gamepad2 className="text-primary size-3.5" />
                                                        <span className="text-[11px] sm:text-xs font-bold tracking-wider sm:tracking-widest uppercase text-white/90">
                                                                {isComplete ? "Tournament Complete!" : `Round ${roundNumber}`}
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
                                                        <Medal className="text-stardust" />
                                                        <span className="text-[11px] sm:text-xs font-bold">
                                                                {currentMatchNumber} / {totalMatches}
                                                        </span>
                                                </div>
                                                {etaMinutes > 0 && !isComplete && (
                                                        <div className="flex items-center gap-1 text-[11px] sm:text-xs text-white/60">
                                                                <Clock className="size-3.5" />
                                                                <span>~{etaMinutes}m</span>
                                                        </div>
                                                )}
                                        </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                        className={`h-full rounded-full shadow-[0_0_10px_#a65eed] transition-all duration-500 ${
                                                                isComplete ? "bg-green-500" : "bg-primary"
                                                        }`}
                                                        style={{ width: `${progress || (currentMatchNumber / totalMatches) * 100}%` }}
                                                />
                                        </div>
                                        <div className="text-center text-[11px] sm:text-xs text-white/60">
                                                {isComplete ? (
                                                        <span className="text-green-400 font-bold">🎉 Tournament Complete! 🎉</span>
                                                ) : (
                                                        <>{progress}% Complete</>
                                                )}
                                        </div>
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
                                                        className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-white/5 text-white/60 hover:text-white transition-colors"
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
                                                        className="w-full max-w-[180px] sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                                                        aria-label="Volume control"
                                                        title={`Volume: ${Math.round(audioManager.volume * 100)}%`}
                                                />
                                                <button
                                                        type="button"
                                                        onClick={audioManager.handlePreviousTrack}
                                                        className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/60 hover:text-white transition-colors"
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
                                                                        : "bg-white/5 text-white/60 hover:text-white"
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
                                                        className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/60 hover:text-white transition-colors"
                                                        aria-label="Next track"
                                                        title="Next track"
                                                >
                                                        <SkipForward className="size-3.5" />
                                                </button>
                                                {handleQuit && (
                                                        <button
                                                                type="button"
                                                                onClick={handleQuit}
                                                                className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
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
                                                className={`w-full sm:w-auto justify-center flex items-center gap-2 px-4 h-11 sm:h-10 rounded-lg font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-lg ${showCatPictures ? "bg-primary shadow-primary/20" : "bg-white/10"}`}
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
                                                <div className="flex-1 flex flex-col min-h-[250px] sm:min-h-0">
                                                        <Card
                                                                interactive={true}
                                                                padding="none"
                                                                className={`relative overflow-hidden group cursor-pointer flex-1 animate-float transition-all duration-300 ${
                                                                        isVoting ? "pointer-events-none" : ""
                                                                } ${
                                                                        leftSelected
                                                                                ? "ring-2 ring-emerald-400/80 shadow-[0_0_45px_rgba(16,185,129,0.35)] scale-[1.02]"
                                                                                : hasSelectionFeedback
                                                                                        ? "opacity-[0.55] scale-[0.98]"
                                                                                        : ""
                                                                }`}
                                                                variant="default"
                                                                role="button"
                                                                tabIndex={isVoting ? -1 : 0}
                                                                aria-label={`Vote for ${leftName}`}
                                                                aria-disabled={isVoting}
                                                                onKeyDown={(e) => handleKeyDown(e, "left")}
                                                                onClick={() => handleVoteForSide("left")}
                                                        >
                                                                <div className="relative w-full h-full flex items-center justify-center bg-white/10">
                                                                        {leftImg ? (
                                                                                <CatImage
                                                                                        src={leftImg}
                                                                                        alt={leftName}
                                                                                        objectFit="cover"
                                                                                        containerClassName="w-full h-full"
                                                                                        imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                                                />
                                                                        ) : (
                                                                                <span className="text-white/20 text-6xl font-bold select-none">
                                                                                        {leftName[0]?.toUpperCase() || "?"}
                                                                                </span>
                                                                        )}

                                                                        {/* Name Overlay */}
                                                                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 flex flex-col justify-end pointer-events-none">
                                                                                <h3 className="font-whimsical text-2xl sm:text-3xl text-white tracking-wide break-words w-full drop-shadow-md leading-tight">
                                                                                        {leftName}
                                                                                        {leftPronunciation && (
                                                                                                <span className="ml-2 text-amber-400 text-lg sm:text-xl font-bold italic opacity-90">
                                                                                                        [{leftPronunciation}]
                                                                                                </span>
                                                                                        )}
                                                                                </h3>
                                                                                {leftDescription && (
                                                                                        <p className="text-xs sm:text-sm text-white/90 italic line-clamp-2 mt-1 drop-shadow-sm">
                                                                                                {leftDescription}
                                                                                        </p>
                                                                                )}
                                                                        </div>
                                                                </div>
                                                        </Card>
                                                </div>

                                                {/* VS Indicator */}
                                                <div className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2 py-1 w-full sm:w-20">
                                                        <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 border-white/30 bg-primary/20 backdrop-blur-md shadow-lg flex-shrink-0">
                                                                <span className="font-bold text-sm sm:text-2xl italic tracking-tighter">VS</span>
                                                        </div>
                                                        <div className="flex flex-row sm:flex-col gap-1.5 w-auto sm:w-full">
                                                                <button
                                                                        type="button"
                                                                        onClick={() => handleUndo()}
                                                                        className="glass-panel py-1.5 px-3 sm:px-2 rounded-full flex items-center justify-center border border-primary/20 cursor-pointer hover:bg-white/5 transition-colors"
                                                                        title="Undo last vote"
                                                                >
                                                                        <Undo2 className="size-3.5 text-primary" />
                                                                </button>
                                                                {handleQuit && (
                                                                        <button
                                                                                type="button"
                                                                                onClick={handleQuit}
                                                                                className="glass-panel py-1.5 px-3 sm:px-2 rounded-full flex items-center justify-center border border-red-500/20 cursor-pointer hover:bg-red-500/10 transition-colors"
                                                                                title="Quit tournament"
                                                                        >
                                                                                <LogOut className="size-3.5 text-red-400" />
                                                                        </button>
                                                                )}
                                                        </div>
                                                </div>

                                                {/* Right Card */}
                                                <div className="flex-1 flex flex-col min-h-[250px] sm:min-h-0">
                                                        <Card
                                                                interactive={true}
                                                                padding="none"
                                                                className={`relative overflow-hidden group cursor-pointer flex-1 animate-float transition-all duration-300 ${
                                                                        isVoting ? "pointer-events-none" : ""
                                                                } ${
                                                                        rightSelected
                                                                                ? "ring-2 ring-emerald-400/80 shadow-[0_0_45px_rgba(16,185,129,0.35)] scale-[1.02]"
                                                                                : hasSelectionFeedback
                                                                                        ? "opacity-[0.55] scale-[0.98]"
                                                                                        : ""
                                                                }`}
                                                                style={{ animationDelay: "2s" }}
                                                                variant="default"
                                                                role="button"
                                                                tabIndex={isVoting ? -1 : 0}
                                                                aria-label={`Vote for ${rightName}`}
                                                                aria-disabled={isVoting}
                                                                onKeyDown={(e) => handleKeyDown(e, "right")}
                                                                onClick={() => handleVoteForSide("right")}
                                                        >
                                                                <div className="relative w-full h-full flex items-center justify-center bg-white/10">
                                                                        {rightImg ? (
                                                                                <CatImage
                                                                                        src={rightImg}
                                                                                        alt={rightName}
                                                                                        objectFit="cover"
                                                                                        containerClassName="w-full h-full"
                                                                                        imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                                                />
                                                                        ) : (
                                                                                <span className="text-white/20 text-6xl font-bold select-none">
                                                                                        {rightName[0]?.toUpperCase() || "?"}
                                                                                </span>
                                                                        )}

                                                                        {/* Name Overlay */}
                                                                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 flex flex-col justify-end pointer-events-none">
                                                                                <h3 className="font-whimsical text-2xl sm:text-3xl text-white tracking-wide break-words w-full drop-shadow-md leading-tight text-left sm:text-right">
                                                                                        {rightPronunciation && (
                                                                                                <span className="mr-2 text-amber-400 text-lg sm:text-xl font-bold italic opacity-90">
                                                                                                        [{rightPronunciation}]
                                                                                                </span>
                                                                                        )}
                                                                                        {rightName}
                                                                                </h3>
                                                                                {rightDescription && (
                                                                                        <p className="text-xs sm:text-sm text-white/90 italic line-clamp-2 mt-1 drop-shadow-sm text-left sm:text-right">
                                                                                                {rightDescription}
                                                                                        </p>
                                                                                )}
                                                                        </div>
                                                                </div>
                                                        </Card>
                                                </div>
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