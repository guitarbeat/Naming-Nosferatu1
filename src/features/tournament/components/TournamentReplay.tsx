/**
 * @module TournamentReplay
 * @description Tournament replay and match history viewer component
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/shared/components/layout/Button";
import { Loading } from "@/shared/components/layout/Feedback";
import {
	BarChart3,
	Calendar,
	Download,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Target,
	Trophy,
} from "@/shared/lib/icons";

export interface MatchRecord {
	id: string;
	tournamentId: string;
	round: number;
	matchNumber: number;
	leftId: string;
	rightId: string;
	winnerId: string;
	loserId: string;
	leftRating: number;
	rightRating: number;
	ratingChange: number;
	duration: number; // in seconds
	timestamp: string;
}

export interface TournamentHistory {
	id: string;
	name: string;
	startTime: string;
	endTime?: string;
	status: "completed" | "in_progress" | "abandoned";
	totalMatches: number;
	completedMatches: number;
	winnerId?: string;
	finalRatings?: Record<string, number>;
	duration?: number; // in minutes
}

interface TournamentReplayProps {
	tournamentId?: string;
	onExportHistory?: (history: TournamentHistory[]) => void;
	onReplayMatch?: (matchId: string) => void;
}

export function TournamentReplay({
	tournamentId,
	onExportHistory,
	onReplayMatch,
}: TournamentReplayProps) {
	const [selectedTournament, setSelectedTournament] = useState<string>(tournamentId ?? "");
	const [selectedMatch, setSelectedMatch] = useState<string>("");
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
	const [matches, setMatches] = useState<MatchRecord[]>([]);
	const [tournaments, setTournaments] = useState<TournamentHistory[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [viewMode, setViewMode] = useState<"matches" | "bracket">("matches");

	// Mock data - in real implementation, this would fetch from API
	useEffect(() => {
		const loadMockData = async () => {
			setIsLoading(true);

			// Mock tournament history
			const mockTournaments: TournamentHistory[] = [
				{
					id: "tourn_1",
					name: "Spring Cat Championship",
					startTime: "2026-03-15T10:00:00Z",
					endTime: "2026-03-15T11:30:00Z",
					status: "completed",
					totalMatches: 15,
					completedMatches: 15,
					winnerId: "name_42",
					duration: 90,
					finalRatings: {
						name_42: 2850,
						name_17: 2200,
						name_8: 1950,
					},
				},
				{
					id: "tourn_2",
					name: "Summer Kitty League",
					startTime: "2026-03-10T14:00:00Z",
					status: "in_progress",
					totalMatches: 8,
					completedMatches: 6,
					duration: 45,
				},
			];

			// Mock match history
			const mockMatches: MatchRecord[] = [
				{
					id: "match_1",
					tournamentId: "tourn_1",
					round: 1,
					matchNumber: 1,
					leftId: "name_1",
					rightId: "name_2",
					winnerId: "name_1",
					loserId: "name_2",
					leftRating: 1500,
					rightRating: 1500,
					ratingChange: 32,
					duration: 45,
					timestamp: "2026-03-15T10:05:00Z",
				},
				{
					id: "match_2",
					tournamentId: "tourn_1",
					round: 1,
					matchNumber: 2,
					leftId: "name_3",
					rightId: "name_4",
					winnerId: "name_4",
					loserId: "name_3",
					leftRating: 1600,
					rightRating: 1550,
					ratingChange: -28,
					duration: 38,
					timestamp: "2026-03-15T10:12:00Z",
				},
				{
					id: "match_3",
					tournamentId: "tourn_1",
					round: 2,
					matchNumber: 3,
					leftId: "name_5",
					rightId: "name_6",
					winnerId: "name_5",
					loserId: "name_6",
					leftRating: 1650,
					rightRating: 1480,
					ratingChange: 24,
					duration: 52,
					timestamp: "2026-03-15T10:25:00Z",
				},
			];

			setTournaments(mockTournaments);
			setMatches(mockMatches);
			setIsLoading(false);
		};

		loadMockData();
	}, []);

	useEffect(() => {
		if (tournamentId) {
			setSelectedTournament(tournamentId);
		}
	}, [tournamentId]);

	// Filter matches by selected tournament
	const filteredMatches = useMemo(() => {
		if (!selectedTournament) {
			return matches;
		}
		return matches.filter((match) => match.tournamentId === selectedTournament);
	}, [matches, selectedTournament]);

	// Calculate statistics
	const matchStats = useMemo(() => {
		if (filteredMatches.length === 0) {
			return null;
		}

		const totalDuration = filteredMatches.reduce((sum, match) => sum + match.duration, 0);
		const avgDuration = totalDuration / filteredMatches.length;
		const avgRatingChange =
			filteredMatches.reduce((sum, match) => sum + match.ratingChange, 0) / filteredMatches.length;

		const winsByRound = new Map<number, number>();
		filteredMatches.forEach((match) => {
			winsByRound.set(match.round, (winsByRound.get(match.round) || 0) + 1);
		});

		return {
			totalMatches: filteredMatches.length,
			totalDuration,
			avgDuration,
			avgRatingChange,
			roundsCompleted: winsByRound.size,
			longestMatch: Math.max(...filteredMatches.map((m) => m.duration)),
			shortestMatch: Math.min(...filteredMatches.map((m) => m.duration)),
		};
	}, [filteredMatches]);

	const handlePlayPause = useCallback(() => {
		setIsPlaying(!isPlaying);
	}, [isPlaying]);

	const handleSpeedChange = useCallback((speed: number) => {
		setPlaybackSpeed(speed);
	}, []);

	const handlePreviousMatch = useCallback(() => {
		setCurrentMatchIndex((prev) => Math.max(0, prev - 1));
	}, []);

	const handleNextMatch = useCallback(() => {
		setCurrentMatchIndex((prev) => Math.min(filteredMatches.length - 1, prev + 1));
	}, [filteredMatches.length]);

	const handleExportHistory = useCallback(() => {
		if (onExportHistory) {
			const exportData = {
				tournaments,
				matches,
				exportDate: new Date().toISOString(),
				stats: matchStats,
			};
			onExportHistory([exportData as any]);
		}
	}, [tournaments, matches, matchStats, onExportHistory]);

	const handleReplayMatch = useCallback(
		(matchId: string) => {
			setSelectedMatch(matchId);
			if (onReplayMatch) {
				onReplayMatch(matchId);
			}
		},
		[onReplayMatch],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-96">
				<Loading message="Loading tournament history..." />
			</div>
		);
	}

	return (
		<div className="bg-card border border-border rounded-lg p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Calendar className="text-chart-4" size={24} />
					<h2 className="text-xl font-bold text-foreground">Tournament Replay & History</h2>
				</div>
				<div className="flex gap-2">
					{onExportHistory && (
						<Button
							onClick={handleExportHistory}
							variant="ghost"
							size="sm"
							className="text-chart-4 hover:text-chart-4/80"
						>
							<Download size={16} className="mr-1" />
							Export
						</Button>
					)}
				</div>
			</div>

			{/* Tournament Selection */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						Select Tournament
					</label>
					<select
						value={selectedTournament}
						onChange={(e) => setSelectedTournament(e.target.value)}
						className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
					>
						<option value="">All Tournaments</option>
						{tournaments.map((tournament) => (
							<option key={tournament.id} value={tournament.id}>
								{tournament.name} ({tournament.status})
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-2">View Mode</label>
					<div className="flex gap-2">
						<Button
							type="button"
							onClick={() => setViewMode("matches")}
							variant={viewMode === "matches" ? "secondary" : "ghost"}
							presentation="chip"
							shape="pill"
							startIcon={<Target size={16} />}
							className={`${
								viewMode === "matches"
									? "bg-chart-4 text-white hover:bg-chart-4/85 hover:text-white"
									: "bg-foreground/10 text-foreground hover:bg-foreground/20 hover:text-foreground"
							}`}
						>
							Matches
						</Button>
						<Button
							type="button"
							onClick={() => setViewMode("bracket")}
							variant={viewMode === "bracket" ? "secondary" : "ghost"}
							presentation="chip"
							shape="pill"
							startIcon={<Trophy size={16} />}
							className={`${
								viewMode === "bracket"
									? "bg-chart-4 text-white hover:bg-chart-4/85 hover:text-white"
									: "bg-foreground/10 text-foreground hover:bg-foreground/20 hover:text-foreground"
							}`}
						>
							Bracket
						</Button>
					</div>
				</div>
			</div>

			{/* Match Statistics */}
			{matchStats && (
				<div className="bg-foreground/5 rounded-lg p-4">
					<h3 className="text-lg font-semibold text-foreground mb-4">Match Statistics</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">Total Matches:</span>
							<span className="font-medium text-foreground ml-1">{matchStats.totalMatches}</span>
						</div>
						<div>
							<span className="text-muted-foreground">Total Duration:</span>
							<span className="font-medium text-foreground ml-1">{matchStats.totalDuration}s</span>
						</div>
						<div>
							<span className="text-muted-foreground">Avg Duration:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.avgDuration.toFixed(1)}s
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Rounds Completed:</span>
							<span className="font-medium text-foreground ml-1">{matchStats.roundsCompleted}</span>
						</div>
						<div>
							<span className="text-muted-foreground">Longest Match:</span>
							<span className="font-medium text-foreground ml-1">{matchStats.longestMatch}s</span>
						</div>
						<div>
							<span className="text-muted-foreground">Shortest Match:</span>
							<span className="font-medium text-foreground ml-1">{matchStats.shortestMatch}s</span>
						</div>
						<div>
							<span className="text-muted-foreground">Avg Rating Change:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.avgRatingChange.toFixed(1)}
							</span>
						</div>
					</div>
				</div>
			)}

			{viewMode === "matches" && (
				<div className="space-y-4">
					{/* Playback Controls */}
					{filteredMatches.length > 0 && (
						<div className="flex items-center justify-center gap-4 p-4 bg-foreground/5 rounded-lg">
							<Button
								onClick={handlePreviousMatch}
								disabled={currentMatchIndex === 0}
								type="button"
								variant="ghost"
								size="icon"
								iconOnly={true}
								shape="pill"
								className="bg-foreground/10 text-foreground hover:bg-foreground/20"
							>
								<SkipBack size={20} />
							</Button>

							<Button
								onClick={handlePlayPause}
								type="button"
								variant="secondary"
								size="icon"
								iconOnly={true}
								shape="pill"
								className="size-11 bg-chart-4 text-white hover:bg-chart-4/80 hover:text-white"
							>
								{isPlaying ? <Pause size={20} /> : <Play size={20} />}
							</Button>

							<Button
								onClick={handleNextMatch}
								disabled={currentMatchIndex === filteredMatches.length - 1}
								type="button"
								variant="ghost"
								size="icon"
								iconOnly={true}
								shape="pill"
								className="bg-foreground/10 text-foreground hover:bg-foreground/20"
							>
								<SkipForward size={20} />
							</Button>

							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Speed:</span>
								<select
									value={playbackSpeed}
									onChange={(e) => handleSpeedChange(Number(e.target.value))}
									className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
								>
									<option value="0.5">0.5x</option>
									<option value="1">1x</option>
									<option value="1.5">1.5x</option>
									<option value="2">2x</option>
								</select>
							</div>
						</div>
					)}

					{/* Match List */}
					<div className="space-y-2 max-h-96 overflow-y-auto">
						{filteredMatches.map((match, index) => (
							<div
								key={match.id}
								onClick={() => handleReplayMatch(match.id)}
								className={`p-4 border border-border rounded-lg cursor-pointer transition-colors ${
									selectedMatch === match.id
										? "border-chart-4 bg-chart-4/10"
										: "border-border/20 hover:border-chart-4/50 hover:bg-foreground/5"
								} ${index === currentMatchIndex ? "ring-2 ring-chart-4" : ""}`}
							>
								<div className="flex items-center justify-between">
									<div>
										<div className="text-sm text-muted-foreground">
											Round {match.round} • Match {match.matchNumber}
										</div>
										<div className="font-semibold text-foreground">
											{match.leftId} vs {match.rightId}
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-muted-foreground mb-1">
											{new Date(match.timestamp).toLocaleString()}
										</div>
										<div className="flex items-center gap-2">
											<span
												className={`px-2 py-1 rounded text-xs font-medium ${
													match.winnerId === match.leftId
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{match.winnerId === match.leftId ? "W" : "L"}
											</span>
											<span className="font-semibold text-foreground">{match.winnerId}</span>
										</div>
										<div className="text-xs text-muted-foreground">{match.duration}s</div>
									</div>
								</div>
								<div className="mt-2 pt-2 border-t border-border/10">
									<div className="flex justify-between text-sm">
										<div>
											<span className="text-muted-foreground">Ratings:</span>
											<span className="ml-2">
												{match.leftRating} → {match.leftRating + match.ratingChange}
											</span>
										</div>
										<div>
											<span className="text-muted-foreground">Ratings:</span>
											<span className="ml-2">
												{match.rightRating} → {match.rightRating - match.ratingChange}
											</span>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{viewMode === "bracket" && (
				<div className="flex items-center justify-center p-8">
					<div className="text-center text-muted-foreground">
						<Trophy size={48} className="mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-foreground mb-2">Bracket View</h3>
						<p>Interactive bracket visualization coming soon...</p>
						<p className="text-sm">For now, use the Matches view to see tournament progression.</p>
					</div>
				</div>
			)}

			{/* No Data State */}
			{filteredMatches.length === 0 && !isLoading && (
				<div className="flex items-center justify-center p-8">
					<div className="text-center text-muted-foreground">
						<BarChart3 size={48} className="mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-foreground mb-2">No Match History</h3>
						<p>No matches found for the selected tournament.</p>
						<p className="text-sm">Complete some tournaments to see their match history here.</p>
					</div>
				</div>
			)}
		</div>
	);
}
