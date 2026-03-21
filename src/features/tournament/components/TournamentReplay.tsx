/**
 * @module TournamentReplay
 * @description Tournament replay and match history viewer backed by persisted local history.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type BracketMatch,
	TournamentBracket,
} from "@/features/tournament/components/TournamentBracket";
import { sanitizePersistentState } from "@/features/tournament/hooks/tournamentPersistence";
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
import { isStorageAvailable, parseJsonValue } from "@/shared/lib/storage";
import type { Match, PersistentTournamentState } from "@/shared/types";

export interface MatchRecord {
	id: string;
	tournamentId: string;
	round: number;
	matchNumber: number;
	leftId: string;
	leftName: string;
	rightId: string;
	rightName: string;
	winnerId: string;
	winnerName: string;
	loserId: string;
	loserName: string;
	leftRating: number;
	rightRating: number;
	ratingChange: number;
	duration: number;
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
	duration?: number;
}

interface TournamentReplayProps {
	tournamentId?: string;
	onExportHistory?: (history: TournamentHistory[]) => void;
	onReplayMatch?: (matchId: string) => void;
}

function readPersistedTournaments(): Array<{
	id: string;
	state: PersistentTournamentState;
}> {
	if (!isStorageAvailable()) {
		return [];
	}

	const tournaments: Array<{ id: string; state: PersistentTournamentState }> =
		[];
	for (let index = 0; index < window.localStorage.length; index += 1) {
		const key = window.localStorage.key(index);
		if (!key || !key.startsWith("tournament-")) {
			continue;
		}

		const rawValue = window.localStorage.getItem(key);
		const parsed = parseJsonValue<Record<string, unknown> | null>(
			rawValue,
			null,
		);
		if (!parsed) {
			continue;
		}

		const userName =
			typeof parsed.userName === "string" && parsed.userName.trim().length > 0
				? parsed.userName
				: "anonymous";
		const sanitized = sanitizePersistentState(parsed, userName);
		if (sanitized.matchHistory.length === 0 && sanitized.totalMatches === 0) {
			continue;
		}

		tournaments.push({ id: key, state: sanitized });
	}

	return tournaments.sort(
		(left, right) => right.state.lastUpdated - left.state.lastUpdated,
	);
}

function getMatchSide(
	match: Match,
	side: "left" | "right",
): { id: string; label: string } {
	if (match.mode === "2v2") {
		const team = side === "left" ? match.left : match.right;
		return {
			id: team.id,
			label: team.memberNames.join(" + "),
		};
	}

	const participant = side === "left" ? match.left : match.right;
	if (typeof participant === "string") {
		return { id: participant, label: participant };
	}

	return {
		id: String(participant.id),
		label: participant.name,
	};
}

function buildReplayMatch(
	tournamentId: string,
	record: PersistentTournamentState["matchHistory"][number],
	index: number,
	ratings: Record<string, number>,
): MatchRecord {
	const left = getMatchSide(record.match, "left");
	const right = getMatchSide(record.match, "right");
	const winnerId = record.winner ?? left.id;
	const loserId = record.loser ?? right.id;
	const winnerName = winnerId === left.id ? left.label : right.label;
	const loserName = loserId === left.id ? left.label : right.label;
	const leftRating = ratings[left.id] ?? 1500;
	const rightRating = ratings[right.id] ?? 1500;
	const ratingChange = Math.abs(leftRating - rightRating);
	const timestamp = new Date(record.timestamp).toISOString();

	return {
		id: `${tournamentId}:${record.roundNumber}:${record.matchNumber}:${index}`,
		tournamentId,
		round: record.roundNumber,
		matchNumber: record.matchNumber,
		leftId: left.id,
		leftName: left.label,
		rightId: right.id,
		rightName: right.label,
		winnerId,
		winnerName,
		loserId,
		loserName,
		leftRating,
		rightRating,
		ratingChange,
		duration: 0,
		timestamp,
	};
}

function buildTournamentHistory(
	id: string,
	state: PersistentTournamentState,
): {
	tournament: TournamentHistory;
	matches: MatchRecord[];
} {
	const orderedHistory = [...state.matchHistory].sort(
		(left, right) => left.timestamp - right.timestamp,
	);
	const startTime = orderedHistory[0]
		? new Date(orderedHistory[0].timestamp).toISOString()
		: new Date(state.lastUpdated).toISOString();
	const endTime = orderedHistory.at(-1)
		? new Date(
				orderedHistory.at(-1)?.timestamp ?? state.lastUpdated,
			).toISOString()
		: undefined;
	const completedMatches = orderedHistory.length;
	const totalMatches = state.totalMatches || completedMatches;
	const winnerId = orderedHistory.at(-1)?.winner ?? undefined;
	const duration =
		endTime && startTime
			? Math.max(
					1,
					Math.round(
						(new Date(endTime).getTime() - new Date(startTime).getTime()) /
							60000,
					),
				)
			: undefined;
	const matches = orderedHistory.map((record, index) =>
		buildReplayMatch(id, record, index, state.ratings),
	);

	return {
		tournament: {
			id,
			name: `${state.userName || "Guest"} tournament`,
			startTime,
			endTime,
			status:
				completedMatches >= totalMatches && totalMatches > 0
					? "completed"
					: "in_progress",
			totalMatches,
			completedMatches,
			winnerId,
			finalRatings: state.ratings,
			duration,
		},
		matches,
	};
}

export function TournamentReplay({
	tournamentId,
	onExportHistory,
	onReplayMatch,
}: TournamentReplayProps) {
	const [selectedTournament, setSelectedTournament] = useState<string>(
		tournamentId ?? "",
	);
	const [selectedMatch, setSelectedMatch] = useState<string>("");
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
	const [matches, setMatches] = useState<MatchRecord[]>([]);
	const [tournaments, setTournaments] = useState<TournamentHistory[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [viewMode, setViewMode] = useState<"matches" | "bracket">("matches");

	useEffect(() => {
		setIsLoading(true);
		const persisted = readPersistedTournaments();
		const rebuilt = persisted.map(({ id, state }) =>
			buildTournamentHistory(id, state),
		);
		setTournaments(rebuilt.map((item) => item.tournament));
		setMatches(rebuilt.flatMap((item) => item.matches));
		if (!selectedTournament && rebuilt[0]?.tournament.id) {
			setSelectedTournament(rebuilt[0].tournament.id);
		}
		setIsLoading(false);
	}, [selectedTournament]);

	useEffect(() => {
		if (tournamentId) {
			setSelectedTournament(tournamentId);
		}
	}, [tournamentId]);

	const filteredMatches = useMemo(() => {
		if (!selectedTournament) {
			return matches;
		}
		return matches.filter((match) => match.tournamentId === selectedTournament);
	}, [matches, selectedTournament]);

	useEffect(() => {
		setCurrentMatchIndex(0);
		setSelectedMatch(filteredMatches[0]?.id ?? "");
	}, [filteredMatches]);

	useEffect(() => {
		if (!isPlaying || filteredMatches.length === 0) {
			return;
		}

		const intervalMs = Math.max(500, 1800 / playbackSpeed);
		const intervalId = window.setInterval(() => {
			setCurrentMatchIndex((current) => {
				if (current >= filteredMatches.length - 1) {
					window.clearInterval(intervalId);
					setIsPlaying(false);
					return current;
				}
				const nextIndex = current + 1;
				setSelectedMatch(filteredMatches[nextIndex]?.id ?? "");
				return nextIndex;
			});
		}, intervalMs);

		return () => window.clearInterval(intervalId);
	}, [filteredMatches, isPlaying, playbackSpeed]);

	const matchStats = useMemo(() => {
		if (filteredMatches.length === 0) {
			return null;
		}

		const totalDuration = filteredMatches.reduce(
			(sum, match) => sum + match.duration,
			0,
		);
		const avgDuration = totalDuration / filteredMatches.length;
		const avgRatingChange =
			filteredMatches.reduce((sum, match) => sum + match.ratingChange, 0) /
			filteredMatches.length;
		const roundsCompleted = new Set(filteredMatches.map((match) => match.round))
			.size;

		return {
			totalMatches: filteredMatches.length,
			totalDuration,
			avgDuration,
			avgRatingChange,
			roundsCompleted,
			longestMatch: Math.max(...filteredMatches.map((match) => match.duration)),
			shortestMatch: Math.min(
				...filteredMatches.map((match) => match.duration),
			),
		};
	}, [filteredMatches]);

	const bracketMatches = useMemo<BracketMatch[]>(
		() =>
			filteredMatches.map((match) => ({
				id: match.id,
				round: match.round,
				leftId: match.leftId,
				rightId: match.rightId,
				winnerId: match.winnerId,
				startTime: match.timestamp,
			})),
		[filteredMatches],
	);

	const handlePlayPause = useCallback(() => {
		setIsPlaying((current) => !current);
	}, []);

	const handlePreviousMatch = useCallback(() => {
		setCurrentMatchIndex((current) => Math.max(0, current - 1));
	}, []);

	const handleNextMatch = useCallback(() => {
		setCurrentMatchIndex((current) =>
			Math.min(filteredMatches.length - 1, current + 1),
		);
	}, [filteredMatches.length]);

	const handleExportHistory = useCallback(() => {
		if (onExportHistory) {
			onExportHistory(tournaments);
		}
	}, [onExportHistory, tournaments]);

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
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Calendar className="text-chart-4" size={24} />
					<h2 className="text-xl font-bold text-foreground">
						Tournament Replay & History
					</h2>
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

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label
						htmlFor="tournament-replay-filter"
						className="block text-sm font-medium text-foreground mb-2"
					>
						Select Tournament
					</label>
					<select
						id="tournament-replay-filter"
						value={selectedTournament}
						onChange={(event) => setSelectedTournament(event.target.value)}
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
					<p className="block text-sm font-medium text-foreground mb-2">
						View Mode
					</p>
					<div className="flex gap-2">
						<Button
							type="button"
							onClick={() => setViewMode("matches")}
							variant={viewMode === "matches" ? "secondary" : "ghost"}
							presentation="chip"
							shape="pill"
							startIcon={<Target size={16} />}
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
						>
							Bracket
						</Button>
					</div>
				</div>
			</div>

			{matchStats && (
				<div className="bg-foreground/5 rounded-lg p-4">
					<h3 className="text-lg font-semibold text-foreground mb-4">
						Match Statistics
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">Total Matches:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.totalMatches}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Total Duration:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.totalDuration}s
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Avg Duration:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.avgDuration.toFixed(1)}s
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Rounds Completed:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.roundsCompleted}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Longest Match:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.longestMatch}s
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Shortest Match:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.shortestMatch}s
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Avg Rating Delta:</span>
							<span className="font-medium text-foreground ml-1">
								{matchStats.avgRatingChange.toFixed(1)}
							</span>
						</div>
					</div>
				</div>
			)}

			{viewMode === "matches" && (
				<div className="space-y-4">
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
								disabled={currentMatchIndex >= filteredMatches.length - 1}
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
									onChange={(event) =>
										setPlaybackSpeed(Number(event.target.value))
									}
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

					<div className="space-y-2 max-h-96 overflow-y-auto">
						{filteredMatches.map((match, index) => (
							<button
								type="button"
								key={match.id}
								onClick={() => handleReplayMatch(match.id)}
								className={`p-4 border border-border rounded-lg cursor-pointer transition-colors ${
									selectedMatch === match.id
										? "border-chart-4 bg-chart-4/10"
										: "border-border/20 hover:border-chart-4/50 hover:bg-foreground/5"
								} ${index === currentMatchIndex ? "ring-2 ring-chart-4" : ""} w-full text-left`}
							>
								<span className="flex items-center justify-between">
									<span>
										<span className="block text-sm text-muted-foreground">
											Round {match.round} • Match {match.matchNumber}
										</span>
										<span className="block font-semibold text-foreground">
											{match.leftName} vs {match.rightName}
										</span>
									</span>
									<span className="text-right">
										<span className="block text-sm text-muted-foreground mb-1">
											{new Date(match.timestamp).toLocaleString()}
										</span>
										<span className="block font-semibold text-foreground">
											{match.winnerName}
										</span>
										<span className="block text-xs text-muted-foreground">
											{match.duration}s
										</span>
									</span>
								</span>
								<span className="mt-2 pt-2 border-t border-border/10 block">
									<span className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
										<span>
											<span className="text-muted-foreground">
												{match.leftName}:
											</span>
											<span className="ml-2">
												{match.leftRating} (
												{match.winnerId === match.leftId ? "W" : "L"})
											</span>
										</span>
										<span>
											<span className="text-muted-foreground">
												{match.rightName}:
											</span>
											<span className="ml-2">
												{match.rightRating} (
												{match.winnerId === match.rightId ? "W" : "L"})
											</span>
										</span>
									</span>
								</span>
							</button>
						))}
					</div>
				</div>
			)}

			{viewMode === "bracket" && (
				<TournamentBracket
					tournamentId={selectedTournament}
					matches={bracketMatches}
				/>
			)}

			{filteredMatches.length === 0 && !isLoading && (
				<div className="flex items-center justify-center p-8">
					<div className="text-center text-muted-foreground">
						<BarChart3 size={48} className="mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-foreground mb-2">
							No Match History
						</h3>
						<p>No completed tournament history was found on this device.</p>
						<p className="text-sm">
							Start and finish a tournament to replay it here.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
