/**
 * @module TournamentBracket
 * @description Mobile-responsive tournament bracket visualization component
 */

import { useCallback, useMemo, useState } from "react";
import Button from "@/shared/components/layout/Button";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Share2,
	Trophy,
	ZoomIn,
	ZoomOut,
} from "@/shared/lib/icons";

export interface BracketMatch {
	id: string;
	round: number;
	leftId: string | null;
	rightId: string | null;
	winnerId: string | null;
	leftScore?: number;
	rightScore?: number;
	startTime: string;
}

export interface BracketRound {
	round: number;
	matches: BracketMatch[];
	winner?: string;
	startTime: string;
	endTime?: string;
}

interface TournamentBracketProps {
	tournamentId?: string;
	matches: BracketMatch[];
	onMatchClick?: (matchId: string) => void;
	onExport?: () => void;
	onShare?: () => void;
}

export function TournamentBracket({
	tournamentId,
	matches,
	onMatchClick,
	onExport,
	onShare,
}: TournamentBracketProps) {
	const [selectedRound, setSelectedRound] = useState(1);
	const [viewMode, setViewMode] = useState<"bracket" | "tree" | "compact">("bracket");
	const [zoomLevel, setZoomLevel] = useState(1);

	// Organize matches into rounds
	const bracketRounds = useMemo(() => {
		const rounds = new Map<number, BracketRound>();

		matches.forEach((match) => {
			if (!rounds.has(match.round)) {
				rounds.set(match.round, {
					round: match.round,
					matches: [],
					startTime: match.startTime,
				});
			}
			rounds.get(match.round)?.matches.push(match);
		});

		// Set winners and end times
		rounds.forEach((_round, roundData) => {
			if (roundData.matches.length > 0) {
				const finalMatch = roundData.matches[roundData.matches.length - 1];
				roundData.winner = finalMatch.winnerId;
				roundData.endTime = finalMatch.startTime;
			}
		});

		return Array.from(rounds.values()).sort((a, b) => a.round - b.round);
	}, [matches]);

	// Get current round matches
	const currentRoundMatches = useMemo(() => {
		const round = bracketRounds.find((r) => r.round === selectedRound);
		return round?.matches || [];
	}, [bracketRounds, selectedRound]);

	// Calculate bracket statistics
	const bracketStats = useMemo(() => {
		const totalRounds = bracketRounds.length;
		const completedRounds = bracketRounds.filter((r) => r.endTime).length;
		const totalMatches = matches.length;
		const completedMatches = matches.filter((m) => m.winnerId).length;

		return {
			totalRounds,
			completedRounds,
			totalMatches,
			completedMatches,
			completionRate: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
			averageMatchesPerRound: totalRounds > 0 ? totalMatches / totalRounds : 0,
		};
	}, [bracketRounds, matches]);

	// Responsive sizing
	const getBracketSize = useCallback(() => {
		const width = window.innerWidth;
		if (width < 640) {
			return "small";
		}
		if (width < 1024) {
			return "medium";
		}
		return "large";
	}, []);

	const getMatchSize = useCallback(() => {
		const size = getBracketSize();
		switch (size) {
			case "small":
				return { width: 300, height: 200, fontSize: 12 };
			case "medium":
				return { width: 400, height: 250, fontSize: 14 };
			case "large":
				return { width: 600, height: 400, fontSize: 16 };
		}
	}, [getBracketSize]);

	const handlePreviousRound = useCallback(() => {
		setSelectedRound((prev) => Math.max(1, prev - 1));
	}, []);

	const handleNextRound = useCallback(() => {
		const maxRound = Math.max(...bracketRounds.map((r) => r.round));
		setSelectedRound((prev) => Math.min(maxRound, prev + 1));
	}, [bracketRounds]);

	const handleZoomIn = useCallback(() => {
		setZoomLevel((prev) => Math.min(3, prev + 1));
	}, []);

	const handleZoomOut = useCallback(() => {
		setZoomLevel((prev) => Math.max(1, prev - 1));
	}, []);

	const handleViewModeChange = useCallback((mode: "bracket" | "tree" | "compact") => {
		setViewMode(mode);
	}, []);

	const handleExport = useCallback(() => {
		if (onExport) {
			const exportData = {
				tournamentId,
				matches,
				rounds: bracketRounds,
				stats: bracketStats,
				exportDate: new Date().toISOString(),
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `tournament-bracket-${tournamentId || "export"}.json`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}, [onExport, tournamentId, bracketRounds, bracketStats, matches]);

	const handleShare = useCallback(() => {
		if (onShare && navigator.share) {
			const shareData = {
				title: "Tournament Bracket",
				text: `Check out this tournament bracket! ${bracketStats.completedMatches}/${bracketStats.totalMatches} matches completed.`,
				url: window.location.href,
			};

			navigator.share(shareData);
		}
	}, [onShare, bracketStats]);

	if (matches.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-96 p-8">
				<div className="text-center text-muted-foreground">
					<Trophy size={48} className="mx-auto mb-4" />
					<h3 className="text-xl font-semibold text-foreground">No Tournament Data</h3>
					<p>Complete a tournament to see the bracket visualization.</p>
				</div>
			</div>
		);
	}

	const bracketSize = getMatchSize();

	return (
		<div className="bg-card border border-border rounded-lg p-4 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<Trophy size={24} className="text-chart-4" />
					<h2 className="text-xl font-bold text-foreground">Tournament Bracket</h2>
				</div>

				<div className="flex items-center gap-2">
					{/* View Mode Toggle */}
					<div className="flex bg-foreground/10 rounded-lg p-1">
						<button
							onClick={() => handleViewModeChange("bracket")}
							className={`px-3 py-2 rounded-l text-sm font-medium transition-colors ${
								viewMode === "bracket"
									? "bg-chart-4 text-white"
									: "text-foreground hover:bg-foreground/20"
							}`}
						>
							Bracket
						</button>
						<button
							onClick={() => handleViewModeChange("tree")}
							className={`px-3 py-2 rounded-r text-sm font-medium transition-colors ${
								viewMode === "tree"
									? "bg-chart-4 text-white"
									: "text-foreground hover:bg-foreground/20"
							}`}
						>
							Tree
						</button>
						<button
							onClick={() => handleViewModeChange("compact")}
							className={`px-3 py-2 rounded-r text-sm font-medium transition-colors ${
								viewMode === "compact"
									? "bg-chart-4 text-white"
									: "text-foreground hover:bg-foreground/20"
							}`}
						>
							Compact
						</button>
					</div>

					{/* Zoom Controls */}
					<div className="flex items-center gap-2 bg-foreground/10 rounded-lg p-1">
						<button
							onClick={handleZoomOut}
							disabled={zoomLevel === 1}
							className="p-2 text-foreground hover:bg-foreground/20 disabled:opacity-50"
						>
							<ZoomOut size={16} />
						</button>
						<span className="text-sm text-muted-foreground px-2">{zoomLevel}x</span>
						<button
							onClick={handleZoomIn}
							disabled={zoomLevel === 3}
							className="p-2 text-foreground hover:bg-foreground/20 disabled:opacity-50"
						>
							<ZoomIn size={16} />
						</button>
					</div>

					{/* Export/Share */}
					<div className="flex gap-2">
						<Button
							onClick={handleExport}
							variant="ghost"
							size="small"
							className="text-chart-4 hover:text-chart-4/80"
						>
							<Download size={16} className="mr-1" />
							Export
						</Button>
						<Button
							onClick={handleShare}
							variant="ghost"
							size="small"
							className="text-chart-4 hover:text-chart-4/80"
						>
							<Share2 size={16} className="mr-1" />
							Share
						</Button>
					</div>
				</div>
			</div>

			{/* Tournament Stats */}
			<div className="bg-foreground/5 rounded-lg p-4 mb-6">
				<h3 className="text-lg font-semibold text-foreground mb-4">Tournament Statistics</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
					<div>
						<span className="text-muted-foreground">Total Rounds:</span>
						<span className="font-medium text-foreground ml-1">{bracketStats.totalRounds}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Completed:</span>
						<span className="font-medium text-foreground ml-1">{bracketStats.completedRounds}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Total Matches:</span>
						<span className="font-medium text-foreground ml-1">{bracketStats.totalMatches}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Completed Matches:</span>
						<span className="font-medium text-foreground ml-1">
							{bracketStats.completedMatches}
						</span>
					</div>
					<div>
						<span className="text-muted-foreground">Completion Rate:</span>
						<span className="font-medium text-foreground ml-1">
							{bracketStats.completionRate.toFixed(1)}%
						</span>
					</div>
					<div>
						<span className="text-muted-foreground">Avg Matches/Round:</span>
						<span className="font-medium text-foreground ml-1">
							{bracketStats.averageMatchesPerRound.toFixed(1)}
						</span>
					</div>
				</div>
			</div>

			{/* Round Navigation */}
			<div className="flex items-center justify-between mb-6">
				<button
					onClick={handlePreviousRound}
					disabled={selectedRound === 1}
					className="flex items-center gap-2 px-4 py-2 bg-foreground/10 text-foreground hover:bg-foreground/20 disabled:opacity-50 rounded-lg"
				>
					<ChevronLeft size={20} />
					<span className="text-sm font-medium">Round {selectedRound - 1}</span>
				</button>

				<div className="text-center">
					<span className="text-lg font-bold text-foreground">Round {selectedRound}</span>
					{currentRoundMatches.length > 0 && (
						<span className="text-sm text-muted-foreground ml-4">
							({currentRoundMatches.length} matches)
						</span>
					)}
				</div>

				<button
					onClick={handleNextRound}
					disabled={selectedRound === bracketStats.totalRounds}
					className="flex items-center gap-2 px-4 py-2 bg-foreground/10 text-foreground hover:bg-foreground/20 disabled:opacity-50 rounded-lg"
				>
					<span className="text-sm font-medium">Round {selectedRound + 1}</span>
					<ChevronRight size={20} />
				</button>
			</div>

			{/* Bracket Visualization */}
			<div className="bg-card border border-border rounded-lg p-6 overflow-x-auto">
				{viewMode === "bracket" ? (
					<div className="space-y-4">
						{bracketRounds.map((round) => (
							<div key={round.round} className="space-y-4">
								<div className="text-center font-semibold text-foreground mb-4">
									Round {round.round}
									{round.winner && (
										<span className="ml-2 text-chart-4">🏆 Winner: {round.winner}</span>
									)}
								</div>
								<div
									className="grid grid-cols-2 gap-4"
									style={{ minHeight: `${bracketSize.height * 2}px` }}
								>
									{round.matches.map((match, matchIndex) => (
										<div
											key={match.id}
											onClick={() => onMatchClick?.(match.id)}
											className="relative bg-card border border-border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg hover:border-chart-4/50"
											style={{
												minHeight: `${bracketSize.height}px`,
												width: "100%",
											}}
										>
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-2">
													<span className="text-xs text-muted-foreground">
														Match {matchIndex + 1}
													</span>
													{match.leftScore !== undefined && (
														<span className="text-sm font-medium text-foreground">
															({match.leftScore})
														</span>
													)}
												</div>
												<div className="text-xs text-muted-foreground">
													{match.rightScore !== undefined && (
														<span className="text-sm font-medium text-foreground">
															({match.rightScore})
														</span>
													)}
												</div>
											</div>

											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													{match.leftId && (
														<span
															className="text-sm font-bold text-foreground truncate max-w-20"
															title={match.leftId}
														>
															{match.leftId}
														</span>
													)}
													{match.winnerId === match.leftId && (
														<span className="ml-2 text-chart-4">🏆</span>
													)}
												</div>
												<div className="flex items-center gap-2">
													{match.rightId && (
														<span
															className="text-sm font-bold text-foreground truncate max-w-20"
															title={match.rightId}
														>
															{match.rightId}
														</span>
													)}
													{match.winnerId === match.rightId && (
														<span className="ml-2 text-chart-4">🏆</span>
													)}
												</div>
											</div>

											{match.winnerId && (
												<div className="absolute top-2 right-2 bg-chart-4 text-white text-xs font-bold px-2 py-1 rounded">
													Winner
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				) : viewMode === "tree" ? (
					<div className="space-y-4">
						{bracketRounds.map((round) => (
							<div key={round.round} className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="font-semibold text-foreground">Round {round.round}</span>
									{round.winner && <span className="text-chart-4">🏆 Winner: {round.winner}</span>}
								</div>
								<div className="bg-foreground/5 rounded-lg p-4">
									{round.matches.map((match, index) => (
										<div
											key={match.id}
											className="flex items-center justify-between py-2 border-b border-border/10"
										>
											<span className="text-sm text-muted-foreground">Match {index + 1}</span>
											<div className="flex items-center gap-2">
												<span
													className="text-sm font-medium truncate max-w-24"
													title={match.leftId}
												>
													{match.leftId}
												</span>
												<span className="text-muted-foreground">vs</span>
												<span
													className="text-sm font-medium truncate max-w-24"
													title={match.rightId}
												>
													{match.rightId}
												</span>
											</div>
											<span className="text-chart-4">
												{match.winnerId === match.leftId
													? "←"
													: match.winnerId === match.rightId
														? "→"
														: ""}
											</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{bracketRounds.map((round) => (
							<div key={round.round} className="bg-foreground/5 rounded-lg p-4">
								<div className="flex items-center justify-between mb-4">
									<span className="font-semibold text-foreground">Round {round.round}</span>
									{round.winner && <span className="text-chart-4">🏆 {round.winner}</span>}
								</div>
								<div className="space-y-2">
									{round.matches.map((match, index) => (
										<div key={match.id} className="flex items-center justify-between text-sm">
											<span className="text-muted-foreground w-20">M{index + 1}</span>
											<span className="flex-1 text-center">
												{match.leftId && <span className="font-medium">{match.leftId}</span>}
												<span className="text-muted-foreground">vs</span>
												{match.rightId && <span className="font-medium">{match.rightId}</span>}
											</span>
											<span className="text-muted-foreground w-20">M{index + 1}</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
