/**
 * @module Dashboard
 * @description Dashboard component for analytics and results
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { leaderboardAPI, statsAPI } from "@/features/analytics/services/analyticsService";
import Button from "@/shared/components/layout/Button";
import { Loading } from "@/shared/components/layout/Feedback";
import {
	Activity,
	BarChart3,
	Clock,
	Eye,
	EyeOff,
	Target,
	TrendingUp,
	Trophy,
	Users,
} from "@/shared/lib/icons";
import { coreAPI, hiddenNamesAPI } from "@/shared/services/supabase/api";
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

interface EngagementMetrics {
	totalTournaments: number;
	completedTournaments: number;
	averageTournamentTime: number;
	totalMatches: number;
	peakActiveUsers: number;
	dailyActiveUsers: number;
	weeklyActiveUsers: number;
	monthlyActiveUsers: number;
	mostActiveHour: string;
	mostActiveDay: string;
	userRetentionRate: number;
	averageSessionDuration: number;
	totalPageViews: number;
	bounceRate: number;
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
	const [siteStats, setSiteStats] = useState<{
		totalNames: number;
		activeNames: number;
		hiddenNames: number;
		totalUsers: number;
		totalRatings: number;
		totalSelections: number;
		avgRating: number;
	} | null>(null);
	const [userStats, setUserStats] = useState<{
		totalRatings: number;
		totalSelections: number;
		totalWins: number;
		winRate: number;
	} | null>(null);
	const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
	const [_isLoadingStats, setIsLoadingStats] = useState(true);
	const [hiddenNames, setHiddenNames] = useState<Array<{ id: string | number; name: string }>>([]);
	const [showHiddenNames, setShowHiddenNames] = useState(false);
	const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
	const [timeframe, setTimeframe] = useState<"day" | "week" | "month">("week");

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

	const fetchEngagementMetrics = useCallback(async () => {
		setIsLoadingStats(true);
		try {
			const metrics = await statsAPI.getEngagementMetrics(timeframe);
			setEngagementMetrics(metrics);
		} catch (error) {
			console.error("Failed to fetch engagement metrics:", error);
		} finally {
			setIsLoadingStats(false);
		}
	}, [timeframe]);

	// Fetch engagement metrics
	useEffect(() => {
		fetchEngagementMetrics();
	}, [fetchEngagementMetrics]);

	// Fetch stats
	useEffect(() => {
		const fetchStats = async () => {
			setIsLoadingStats(true);
			try {
				const [site, user] = await Promise.all([
					statsAPI.getSiteStats(),
					userName ? statsAPI.getUserStats(userName) : Promise.resolve(null),
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
			} catch (error) {
				console.error("Failed to fetch stats:", error);
			} finally {
				setIsLoadingStats(false);
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

	return (
		<div className="dashboard-container space-y-10">
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
			<div className="py-2">
				<Suspense fallback={<div className="p-4">Loading...</div>}>
					<RandomGenerator fetchNames={() => coreAPI.getTrendingNames(false)} />
				</Suspense>
			</div>

			{/* User Stats */}
			{userName && userStats && (
				<div className="py-2">
					<div className="flex items-center gap-3 mb-4">
						<BarChart3 className="text-primary" size={24} />
						<h3 className="text-xl font-semibold text-foreground">Your Stats</h3>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Ratings Given</p>
							<p className="text-2xl font-bold text-foreground">{userStats.totalRatings}</p>
						</div>
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Names Selected</p>
							<p className="text-2xl font-bold text-foreground">{userStats.totalSelections}</p>
						</div>
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Total Wins</p>
							<p className="text-2xl font-bold text-foreground">{userStats.totalWins}</p>
						</div>
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Win Rate</p>
							<p className="text-2xl font-bold text-foreground">{userStats.winRate}%</p>
						</div>
					</div>
				</div>
			)}

			{/* Global Leaderboard */}
			<div className="py-2">
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
								className="flex items-center gap-4 py-3 border-b border-border/10"
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
			</div>

			{/* Site Statistics */}
			{siteStats && (
				<div className="py-2">
					<h3 className="text-xl font-semibold text-foreground mb-4">Site Statistics</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Total Names</p>
							<p className="text-2xl font-bold text-foreground">{siteStats.totalNames}</p>
						</div>
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Active Names</p>
							<p className="text-2xl font-bold text-foreground">{siteStats.activeNames}</p>
						</div>
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Total Users</p>
							<p className="text-2xl font-bold text-foreground">{siteStats.totalUsers}</p>
						</div>
						<div className="py-2">
							<p className="text-sm text-muted-foreground mb-1">Avg Rating</p>
							<p className="text-2xl font-bold text-foreground">
								{Math.round(siteStats.avgRating)}
							</p>
						</div>
						{isAdmin && (
							<div className="py-2">
								<p className="text-sm text-chart-4/80 mb-1">Hidden Names</p>
								<p className="text-2xl font-bold text-chart-4">{siteStats.hiddenNames}</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Engagement Metrics */}
			{engagementMetrics && (
				<div className="py-4">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<TrendingUp className="text-chart-4" size={24} />
							<h3 className="text-xl font-semibold text-chart-4">Engagement Metrics</h3>
						</div>
						<div className="flex gap-2">
							<select
								value={timeframe}
								onChange={(e) => setTimeframe(e.target.value as "day" | "week" | "month")}
								className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
							>
								<option value="day">Last 24 Hours</option>
								<option value="week">Last Week</option>
								<option value="month">Last Month</option>
							</select>
							<Button
								variant="ghost"
								size="small"
								onClick={() => fetchEngagementMetrics()}
								disabled={_isLoadingStats}
							>
								<Activity size={16} className="mr-1" />
								Refresh
							</Button>
						</div>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						<div className="p-4 border border-border rounded-lg bg-card">
							<div className="flex items-center gap-2 mb-2">
								<Users className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Total Tournaments</p>
									<p className="text-2xl font-bold text-foreground">
										{engagementMetrics.totalTournaments}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 mb-2">
								<Trophy className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Completed</p>
									<p className="text-2xl font-bold text-chart-4">
										{engagementMetrics.completedTournaments}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 mb-2">
								<Clock className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Avg Duration</p>
									<p className="text-2xl font-bold text-foreground">
										{engagementMetrics.averageTournamentTime}m
									</p>
								</div>
							</div>
						</div>

						<div className="p-4 border border-border rounded-lg bg-card">
							<div className="flex items-center gap-2 mb-2">
								<Target className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Peak Active Users</p>
									<p className="text-2xl font-bold text-foreground">
										{engagementMetrics.peakActiveUsers}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 mb-2">
								<Activity className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">User Retention</p>
									<p className="text-2xl font-bold text-chart-4">
										{engagementMetrics.userRetentionRate}%
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 mb-2">
								<BarChart3 className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Bounce Rate</p>
									<p className="text-2xl font-bold text-chart-4">{engagementMetrics.bounceRate}%</p>
								</div>
							</div>
						</div>

						<div className="p-4 border border-border rounded-lg bg-card">
							<div className="flex items-center gap-2 mb-2">
								<Users className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Daily Active</p>
									<p className="text-2xl font-bold text-foreground">
										{engagementMetrics.dailyActiveUsers}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 mb-2">
								<Users className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Weekly Active</p>
									<p className="text-2xl font-bold text-foreground">
										{engagementMetrics.weeklyActiveUsers}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 mb-2">
								<Users className="text-chart-4" size={20} />
								<div>
									<p className="text-sm text-muted-foreground">Monthly Active</p>
									<p className="text-2xl font-bold text-foreground">
										{engagementMetrics.monthlyActiveUsers}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Admin: Hidden Names Management */}
			{isAdmin && (
				<div className="py-2">
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
										className="flex items-center justify-between py-3 border-b border-border/10"
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
				</div>
			)}
		</div>
	);
}
