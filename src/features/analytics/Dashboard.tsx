/**
 * @module Dashboard
 * @description Dashboard component for analytics and results
 */

import { Suspense, useEffect, useState } from "react";
import {
	type ActivityTrendPoint,
	leaderboardAPI,
	statsAPI,
} from "@/services/analytics/analyticsService";
import { coreAPI, hiddenNamesAPI } from "@/services/supabase/api";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import { Loading } from "@/shared/components/layout/Feedback";
import { BarChart3, Clock, Eye, EyeOff, Layers, Trophy, User } from "@/shared/lib/icons";
import type { NameItem, RatingData } from "@/shared/types";
import { RandomGenerator } from "../tournament/components/RandomGenerator";
import { PersonalResults } from "./PersonalResults";

interface DashboardProps {
	personalRatings?: Record<string, RatingData>;
	currentTournamentNames?: NameItem[];
	onStartNew?: () => void;
	onUpdateRatings?: (
		ratings:
			| Record<string, RatingData>
			| ((prev: Record<string, RatingData>) => Record<string, RatingData>),
	) => void;
	userName?: string;
	isAdmin?: boolean;
	canHideNames?: boolean;
	onNameHidden?: (nameId: string) => void;
}

const trendLabelFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
});

function formatTrendLabel(date: string): string {
	const parsed = new Date(`${date}T00:00:00Z`);
	return Number.isNaN(parsed.getTime()) ? date : trendLabelFormatter.format(parsed);
}

function getBarHeight(count: number, maxCount: number): string {
	if (maxCount <= 0) {
		return "10%";
	}

	return `${Math.max((count / maxCount) * 100, count > 0 ? 18 : 10)}%`;
}

export function Dashboard({
	userName = "",
	isAdmin = false,
	onStartNew,
	onUpdateRatings,
	personalRatings,
	currentTournamentNames,
}: DashboardProps) {
	const [leaderboard, setLeaderboard] = useState<
		Array<{
			name: string;
			avg_rating: number;
			wins: number;
			total_ratings: number;
		}>
	>([]);
	const [siteStats, setSiteStats] = useState<
		| {
				totalNames: number;
				activeNames: number;
				hiddenNames: number;
				totalUsers: number;
				totalRatings: number;
				totalSelections: number;
				avgRating: number;
		  }
		| null
		| undefined
	>(null);
	const [userStats, setUserStats] = useState<{
		totalRatings: number;
		totalSelections: number;
		totalWins: number;
		winRate: number;
	} | null>(null);
	const [activityTrend, setActivityTrend] = useState<ActivityTrendPoint[]>([]);
	const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
	const [_isLoadingStats, setIsLoadingStats] = useState(true);
	const [isLoadingTrend, setIsLoadingTrend] = useState(true);
	const [hiddenNames, setHiddenNames] = useState<Array<{ id: string | number; name: string }>>([]);
	const [showHiddenNames, setShowHiddenNames] = useState(false);

	// Fetch leaderboard
	useEffect(() => {
		const fetchLeaderboard = async () => {
			setIsLoadingLeaderboard(true);
			try {
				const data = await leaderboardAPI.getLeaderboard(10);
				setLeaderboard(data);
			} catch (error) {
				console.error("Failed to fetch leaderboard:", error);
			} finally {
				setIsLoadingLeaderboard(false);
			}
		};
		fetchLeaderboard();
	}, []);

	// Fetch stats
	useEffect(() => {
		const fetchStats = async () => {
			setIsLoadingStats(true);
			setIsLoadingTrend(true);
			try {
				const [site, user, trend] = await Promise.all([
					statsAPI.getSiteStats(),
					userName ? statsAPI.getUserStats(userName) : Promise.resolve(null),
					statsAPI.getActivityTrend(14),
				]);

				if (site) {
					setSiteStats({
						totalNames: site.totalNames || 0,
						activeNames: site.activeNames || 0,
						hiddenNames: site.hiddenNames || 0,
						totalUsers: site.totalUsers || 0,
						totalRatings: site.totalRatings || 0,
						totalSelections: site.totalSelections || 0,
						avgRating: site.avgRating || 0,
					});
				}
				setUserStats(user);
				setActivityTrend(trend);
			} catch (error) {
				console.error("Failed to fetch stats:", error);
			} finally {
				setIsLoadingStats(false);
				setIsLoadingTrend(false);
			}
		};
		fetchStats();
	}, [userName]);

	// Fetch hidden names (admin only)
	useEffect(() => {
		if (isAdmin && showHiddenNames) {
			const fetchHidden = async () => {
				try {
					const data = await hiddenNamesAPI.getHiddenNames();
					setHiddenNames(data);
				} catch (error) {
					console.error("Failed to fetch hidden names:", error);
				}
			};
			fetchHidden();
		}
	}, [isAdmin, showHiddenNames]);

	const handleUnhideName = async (nameId: string | number) => {
		if (!userName) {
			return;
		}
		try {
			const result = await hiddenNamesAPI.unhideName(userName, nameId);
			if (!result.success) {
				throw new Error(result.error || "Failed to unhide name");
			}
			setHiddenNames((prev) => prev.filter((n) => n.id !== nameId));
		} catch (error) {
			console.error("Failed to unhide name:", error);
		}
	};

	const totalTrendSelections = activityTrend.reduce((sum, point) => sum + point.selectionCount, 0);
	const maxTrendSelections = activityTrend.reduce(
		(maximum, point) => Math.max(maximum, point.selectionCount),
		0,
	);
	const peakTrendDay = activityTrend.reduce<ActivityTrendPoint | null>((peak, point) => {
		if (!peak || point.selectionCount > peak.selectionCount) {
			return point;
		}

		return peak;
	}, null);
	const averageActiveUsers =
		activityTrend.length > 0
			? activityTrend.reduce((sum, point) => sum + point.activeUsers, 0) / activityTrend.length
			: 0;
	const peakUniqueNames = activityTrend.reduce(
		(maximum, point) => Math.max(maximum, point.uniqueNames),
		0,
	);
	const hasTrendActivity = activityTrend.some(
		(point) => point.selectionCount > 0 || point.activeUsers > 0 || point.uniqueNames > 0,
	);

	return (
		<div className="dashboard-container space-y-2">
			{/* Personal Results with Ranking Adjustment */}
			{personalRatings && Object.keys(personalRatings).length > 0 && onUpdateRatings && (
				<PersonalResults
					personalRatings={personalRatings}
					currentTournamentNames={currentTournamentNames}
					onStartNew={
						onStartNew ||
						(() => {
							// Default no-op
						})
					}
					onUpdateRatings={onUpdateRatings}
					userName={userName}
				/>
			)}

			{/* Random Name Generator */}
			<Card padding="small">
				<Suspense fallback={<div className="p-4">Loading...</div>}>
					<RandomGenerator fetchNames={() => coreAPI.getTrendingNames(false)} />
				</Suspense>
			</Card>

			{/* User Stats */}
			{userName && userStats && (
				<Card padding="small">
					<div className="flex items-center gap-3 mb-4">
						<BarChart3 className="text-primary" size={24} />
						<h3 className="text-xl font-semibold text-foreground">Your Stats</h3>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Ratings Given</p>
							<p className="text-2xl font-bold text-foreground">{userStats.totalRatings}</p>
						</div>
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Names Selected</p>
							<p className="text-2xl font-bold text-foreground">{userStats.totalSelections}</p>
						</div>
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Total Wins</p>
							<p className="text-2xl font-bold text-foreground">{userStats.totalWins}</p>
						</div>
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Win Rate</p>
							<p className="text-2xl font-bold text-foreground">{userStats.winRate}%</p>
						</div>
					</div>
				</Card>
			)}

			<Card padding="small">
				<div className="flex items-center gap-3 mb-2">
					<BarChart3 className="text-primary" size={24} />
					<div>
						<h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
						<p className="text-sm text-muted-foreground">
							14-day view of tournament selections and engagement
						</p>
					</div>
				</div>

				{isLoadingTrend ? (
					<Loading variant="skeleton" height={240} />
				) : hasTrendActivity ? (
					<div className="space-y-5">
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							<div className="rounded-lg border border-border bg-foreground/5 p-4">
								<p className="mb-1 text-sm text-muted-foreground">Selections (14d)</p>
								<p className="text-2xl font-bold text-foreground">{totalTrendSelections}</p>
							</div>
							<div className="rounded-lg border border-border bg-foreground/5 p-4">
								<p className="mb-1 text-sm text-muted-foreground">Busiest Day</p>
								<p className="text-2xl font-bold text-foreground">
									{peakTrendDay?.selectionCount ?? 0}
								</p>
								<p className="text-xs text-muted-foreground">
									{peakTrendDay ? formatTrendLabel(peakTrendDay.date) : "No activity"}
								</p>
							</div>
							<div className="rounded-lg border border-border bg-foreground/5 p-4">
								<p className="mb-1 text-sm text-muted-foreground">Avg Active Users</p>
								<p className="text-2xl font-bold text-foreground">
									{averageActiveUsers.toFixed(1)}
								</p>
							</div>
							<div className="rounded-lg border border-border bg-foreground/5 p-4">
								<p className="mb-1 text-sm text-muted-foreground">Peak Names Touched</p>
								<p className="text-2xl font-bold text-foreground">{peakUniqueNames}</p>
							</div>
						</div>

						<div className="rounded-xl border border-border bg-gradient-to-b from-foreground/5 to-transparent p-4">
							<div
								className="grid grid-cols-7 gap-2 md:grid-cols-14"
								role="list"
								aria-label="Daily tournament activity"
							>
								{activityTrend.map((point) => (
									<div
										key={point.date}
										role="listitem"
										aria-label={`${formatTrendLabel(point.date)}: ${point.selectionCount} selections, ${point.activeUsers} active users, ${point.uniqueNames} names touched`}
										className="flex min-h-[11rem] flex-col justify-end rounded-lg border border-border/70 bg-background/60 p-2"
									>
										<div className="mb-3 flex min-h-28 items-end">
											<div
												className="flex w-full items-start justify-center rounded-md bg-primary/85 px-1 pt-2 text-center text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
												style={{ height: getBarHeight(point.selectionCount, maxTrendSelections) }}
											>
												{point.selectionCount}
											</div>
										</div>
										<p className="text-center text-xs font-semibold text-foreground">
											{formatTrendLabel(point.date)}
										</p>
										<div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
											<div className="flex items-center justify-between gap-1">
												<span className="flex items-center gap-1">
													<User size={12} />
													Users
												</span>
												<span>{point.activeUsers}</span>
											</div>
											<div className="flex items-center justify-between gap-1">
												<span className="flex items-center gap-1">
													<Layers size={12} />
													Names
												</span>
												<span>{point.uniqueNames}</span>
											</div>
										</div>
									</div>
								))}
							</div>

							<div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
								<span className="flex items-center gap-2">
									<span className="h-3 w-3 rounded-sm bg-primary/85" aria-hidden={true} />
									Daily selections
								</span>
								<span className="flex items-center gap-2">
									<Clock size={14} />
									Updated from recorded tournament selections
								</span>
							</div>
						</div>
					</div>
				) : (
					<div className="rounded-xl border border-dashed border-border bg-foreground/5 p-6 text-center">
						<p className="text-base font-semibold text-foreground">
							No tournament selections recorded in the last 14 days.
						</p>
						<p className="mt-2 text-sm text-muted-foreground">
							Run a tournament to generate recent activity.
						</p>
					</div>
				)}
			</Card>

			{/* Global Leaderboard */}
			<Card padding="small">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<Trophy className="text-chart-4" size={24} />
						<h3 className="text-xl font-semibold text-foreground">Top Names</h3>
					</div>
					{onStartNew && (
						<Button variant="ghost" size="small" onClick={onStartNew}>
							Start New Tournament
						</Button>
					)}
				</div>

				{isLoadingLeaderboard ? (
					<Loading variant="skeleton" height={300} />
				) : leaderboard.length > 0 ? (
					<div className="space-y-2">
						{leaderboard.map((entry, index) => (
							<div
								key={entry.name}
								className="flex items-center gap-4 p-3 rounded-lg bg-foreground/5 border border-border hover:bg-foreground/10 transition-colors"
							>
								<div
									className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
										index === 0
											? "bg-chart-4 text-background"
											: index === 1
												? "bg-secondary text-secondary-foreground"
												: index === 2
													? "bg-chart-1 text-primary-foreground"
													: "bg-foreground/10 text-muted-foreground"
									}`}
								>
									{index + 1}
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-semibold text-foreground truncate">{entry.name}</p>
									<p className="text-xs text-muted-foreground">
										{entry.total_ratings} rating{entry.total_ratings !== 1 ? "s" : ""} •{" "}
										{entry.wins} win{entry.wins !== 1 ? "s" : ""}
									</p>
								</div>
								<div className="text-right">
									<p className="text-lg font-bold text-primary">{Math.round(entry.avg_rating)}</p>
									<p className="text-xs text-muted-foreground">rating</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-center text-muted-foreground py-8">
						No ratings yet. Start a tournament!
					</p>
				)}
			</Card>

			{/* Site Statistics */}
			{siteStats && (
				<Card padding="small">
					<h3 className="text-xl font-semibold text-foreground mb-4">Site Statistics</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Total Names</p>
							<p className="text-2xl font-bold text-foreground">{siteStats.totalNames}</p>
						</div>
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Active Names</p>
							<p className="text-2xl font-bold text-foreground">{siteStats.activeNames}</p>
						</div>
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Total Users</p>
							<p className="text-2xl font-bold text-foreground">{siteStats.totalUsers}</p>
						</div>
						<div className="bg-foreground/5 rounded-lg p-4 border border-border">
							<p className="text-sm text-muted-foreground mb-1">Avg Rating</p>
							<p className="text-2xl font-bold text-foreground">
								{Math.round(siteStats.avgRating)}
							</p>
						</div>
						{isAdmin && (
							<div className="bg-chart-4/20 rounded-lg p-4 border border-chart-4/30">
								<p className="text-sm text-chart-4/80 mb-1">Hidden Names</p>
								<p className="text-2xl font-bold text-chart-4">{siteStats.hiddenNames}</p>
							</div>
						)}
					</div>
				</Card>
			)}

			{/* Admin: Hidden Names Management */}
			{isAdmin && (
				<Card padding="small" className="border-chart-4/30 bg-chart-4/10">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<EyeOff className="text-chart-4" size={24} />
							<h3 className="text-xl font-semibold text-chart-4">Admin: Hidden Names</h3>
						</div>
						<Button
							variant="ghost"
							size="small"
							onClick={() => setShowHiddenNames(!showHiddenNames)}
						>
							{showHiddenNames ? "Hide List" : "Show List"}
						</Button>
					</div>

					{showHiddenNames && (
						<div className="space-y-2">
							{hiddenNames.length > 0 ? (
								hiddenNames.map((name) => (
									<div
										key={name.id}
										className="flex items-center justify-between p-3 rounded-lg bg-foreground/5 border border-chart-4/20"
									>
										<span className="text-foreground font-medium">{name.name}</span>
										<Button
											variant="ghost"
											size="small"
											onClick={() => handleUnhideName(name.id)}
											className="text-chart-2 hover:text-chart-2/80"
										>
											<Eye size={16} className="mr-1" />
											Unhide
										</Button>
									</div>
								))
							) : (
								<p className="text-center text-muted-foreground py-4">No hidden names</p>
							)}
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
