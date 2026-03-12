/**
 * @module Dashboard
 * @description Dashboard component for analytics and results
 */

import { type ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import {
	type ActivityTrendPoint,
	leaderboardAPI,
	statsAPI,
} from "@/services/analytics/analyticsService";
import { coreAPI, hiddenNamesAPI } from "@/services/supabase/api";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import { Loading } from "@/shared/components/layout/Feedback";
import {
	BarChart3,
	Clock,
	Eye,
	EyeOff,
	Layers,
	Medal,
	Shuffle,
	Trophy,
	User,
} from "@/shared/lib/icons";
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

const trendWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
	weekday: "short",
});

function formatTrendLabel(date: string): string {
	const parsed = new Date(`${date}T00:00:00Z`);
	return Number.isNaN(parsed.getTime()) ? date : trendLabelFormatter.format(parsed);
}

function formatTrendWeekday(date: string): string {
	const parsed = new Date(`${date}T00:00:00Z`);
	return Number.isNaN(parsed.getTime()) ? "" : trendWeekdayFormatter.format(parsed);
}

function getBarHeight(count: number, maxCount: number): string {
	if (maxCount <= 0) {
		return "12%";
	}

	return `${Math.max((count / maxCount) * 100, count > 0 ? 18 : 12)}%`;
}

function getLeaderboardTone(index: number): {
	rowClassName: string;
	badgeClassName: string;
	scoreClassName: string;
	label: string;
} {
	if (index === 0) {
		return {
			rowClassName: "border-chart-4/35 bg-chart-4/12",
			badgeClassName: "bg-chart-4 text-background shadow-sm shadow-chart-4/30",
			scoreClassName: "text-chart-4",
			label: "Front-runner",
		};
	}

	if (index === 1) {
		return {
			rowClassName: "border-secondary/35 bg-secondary/20",
			badgeClassName: "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/30",
			scoreClassName: "text-foreground",
			label: "Close second",
		};
	}

	if (index === 2) {
		return {
			rowClassName: "border-chart-1/35 bg-chart-1/12",
			badgeClassName: "bg-chart-1 text-primary-foreground shadow-sm shadow-chart-1/30",
			scoreClassName: "text-chart-1",
			label: "Podium spot",
		};
	}

	return {
		rowClassName: "border-border/70 bg-background/70",
		badgeClassName: "bg-foreground/10 text-muted-foreground",
		scoreClassName: "text-primary",
		label: "Climbing",
	};
}

function renderMetricTiles(
	metrics: Array<{
		label: string;
		value: number | string;
		hint: string;
		toneClassName: string;
		icon: ReactNode;
	}>,
) {
	return metrics.map((metric) => (
		<div key={metric.label} className={`rounded-2xl border p-4 shadow-sm ${metric.toneClassName}`}>
			<div className="mb-3 flex items-start justify-between gap-3">
				<div>
					<p className="text-sm text-muted-foreground">{metric.label}</p>
					<p className="mt-1 text-2xl font-bold text-foreground">{metric.value}</p>
				</div>
				<div className="rounded-xl border border-background/80 bg-background/80 p-2 text-primary shadow-sm">
					{metric.icon}
				</div>
			</div>
			<p className="text-xs leading-5 text-muted-foreground">{metric.hint}</p>
		</div>
	));
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
	const [isLoadingHiddenNames, setIsLoadingHiddenNames] = useState(false);
	const [hiddenNamesError, setHiddenNamesError] = useState<string | null>(null);
	const [pendingUnhideIds, setPendingUnhideIds] = useState<Set<string>>(new Set());
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

	const loadHiddenNames = useCallback(async () => {
		setIsLoadingHiddenNames(true);
		setHiddenNamesError(null);

		try {
			const data = await hiddenNamesAPI.getHiddenNames();
			setHiddenNames(data);
		} catch (error) {
			console.error("Failed to fetch hidden names:", error);
			setHiddenNamesError(error instanceof Error ? error.message : "Failed to fetch hidden names");
		} finally {
			setIsLoadingHiddenNames(false);
		}
	}, []);

	// Fetch hidden names (admin only)
	useEffect(() => {
		if (isAdmin && showHiddenNames) {
			void loadHiddenNames();
		}
	}, [isAdmin, showHiddenNames, loadHiddenNames]);

	const handleUnhideName = async (nameId: string | number) => {
		if (!userName) {
			return;
		}

		const id = String(nameId);
		setPendingUnhideIds((prev) => {
			const next = new Set(prev);
			next.add(id);
			return next;
		});
		setHiddenNamesError(null);

		try {
			const result = await hiddenNamesAPI.unhideName(userName, nameId);
			if (!result.success) {
				throw new Error(result.error || "Failed to unhide name");
			}
			setHiddenNames((prev) => prev.filter((n) => n.id !== nameId));
			setSiteStats((prev) =>
				prev
					? {
							...prev,
							hiddenNames: Math.max(prev.hiddenNames - 1, 0),
							activeNames: prev.activeNames + 1,
						}
					: prev,
			);
		} catch (error) {
			console.error("Failed to unhide name:", error);
			setHiddenNamesError(error instanceof Error ? error.message : "Failed to unhide name");
		} finally {
			setPendingUnhideIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
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
	const recentTrendPoints = activityTrend.slice(-5).reverse();
	const trendRangeLabel =
		activityTrend.length > 0
			? `${formatTrendLabel(activityTrend[0]?.date ?? "")} - ${formatTrendLabel(
					activityTrend[activityTrend.length - 1]?.date ?? "",
				)}`
			: "Last 14 days";
	const userMetricCards = userStats
		? [
				{
					label: "Ratings Given",
					value: userStats.totalRatings,
					hint: "Total rating records you have logged.",
					toneClassName: "border-primary/15 bg-primary/10",
					icon: <BarChart3 size={18} />,
				},
				{
					label: "Names Selected",
					value: userStats.totalSelections,
					hint: "Tournament winners picked across your sessions.",
					toneClassName: "border-chart-5/20 bg-chart-5/10",
					icon: <Shuffle size={18} />,
				},
				{
					label: "Total Wins",
					value: userStats.totalWins,
					hint: "Head-to-head matchups your favorites have won.",
					toneClassName: "border-chart-4/25 bg-chart-4/12",
					icon: <Trophy size={18} />,
				},
				{
					label: "Win Rate",
					value: `${userStats.winRate}%`,
					hint: "How often your choices come out ahead.",
					toneClassName: "border-chart-2/20 bg-chart-2/10",
					icon: <Medal size={18} />,
				},
			]
		: [];
	const siteMetricCards = siteStats
		? [
				{
					label: "Total Names",
					value: siteStats.totalNames,
					hint: "All contenders currently tracked by the site.",
					toneClassName: "border-primary/15 bg-primary/10",
					icon: <Layers size={18} />,
				},
				{
					label: "Active Names",
					value: siteStats.activeNames,
					hint: "Names available to appear in live tournaments.",
					toneClassName: "border-chart-2/20 bg-chart-2/10",
					icon: <Eye size={18} />,
				},
				{
					label: "Total Users",
					value: siteStats.totalUsers,
					hint: "Profiles currently stored in the app.",
					toneClassName: "border-secondary/25 bg-secondary/20",
					icon: <User size={18} />,
				},
				{
					label: "Selections Logged",
					value: siteStats.totalSelections,
					hint: "Winners recorded from tournament rounds.",
					toneClassName: "border-chart-5/20 bg-chart-5/10",
					icon: <Shuffle size={18} />,
				},
				{
					label: "Ratings Logged",
					value: siteStats.totalRatings,
					hint: "Individual name ratings captured across sessions.",
					toneClassName: "border-chart-1/25 bg-chart-1/10",
					icon: <BarChart3 size={18} />,
				},
				{
					label: "Avg Rating",
					value: Math.round(siteStats.avgRating),
					hint: "Current average score across the name pool.",
					toneClassName: "border-chart-4/25 bg-chart-4/12",
					icon: <Medal size={18} />,
				},
				...(isAdmin
					? [
							{
								label: "Hidden Names",
								value: siteStats.hiddenNames,
								hint: "Entries currently removed from public tournament flows.",
								toneClassName: "border-chart-4/25 bg-chart-4/12",
								icon: <EyeOff size={18} />,
							},
						]
					: []),
			]
		: [];
	const hiddenNamesTotal = siteStats?.hiddenNames ?? hiddenNames.length;

	return (
		<div className="dashboard-container space-y-4">
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
			<Card
				padding="small"
				className="overflow-hidden border border-chart-5/20 bg-gradient-to-br from-chart-5/10 via-background/80 to-primary/10"
			>
				<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div className="flex items-start gap-3">
						<div className="rounded-2xl border border-chart-5/20 bg-background/75 p-3 shadow-sm">
							<Shuffle className="text-chart-5" size={24} />
						</div>
						<div>
							<h3 className="text-xl font-semibold text-foreground">Quick Pick</h3>
							<p className="text-sm text-muted-foreground">
								Pull a fresh contender whenever you want a fast name idea.
							</p>
						</div>
					</div>
					<div className="inline-flex items-center rounded-full border border-chart-5/20 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
						Random generator
					</div>
				</div>
				<div className="rounded-2xl border border-border/70 bg-background/75 p-2 shadow-sm">
					<Suspense fallback={<div className="p-4">Loading...</div>}>
						<RandomGenerator fetchNames={() => coreAPI.getTrendingNames(false)} />
					</Suspense>
				</div>
			</Card>

			{/* User Stats */}
			{userName && userStats && (
				<Card
					padding="small"
					className="overflow-hidden border border-chart-2/15 bg-gradient-to-br from-chart-2/10 via-background/85 to-primary/5"
				>
					<div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
						<div className="flex items-start gap-3">
							<div className="rounded-2xl border border-chart-2/20 bg-background/75 p-3 shadow-sm">
								<User className="text-chart-2" size={24} />
							</div>
							<div>
								<h3 className="text-xl font-semibold text-foreground">Your Stats</h3>
								<p className="text-sm text-muted-foreground">
									Personal tournament snapshot for {userName}.
								</p>
							</div>
						</div>
						<div className="inline-flex items-center rounded-full border border-chart-2/20 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
							Personal profile
						</div>
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{renderMetricTiles(userMetricCards)}
					</div>
				</Card>
			)}

			<Card
				padding="small"
				className="overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/10 via-background/80 to-chart-5/10"
			>
				<div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div className="flex items-start gap-3">
						<div className="rounded-2xl border border-primary/20 bg-background/70 p-3 shadow-sm">
							<BarChart3 className="text-primary" size={24} />
						</div>
						<div>
							<h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
							<p className="text-sm text-muted-foreground">
								14-day view of tournament selections and engagement
							</p>
						</div>
					</div>
					<div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
						<Clock size={14} />
						<span>{trendRangeLabel}</span>
					</div>
				</div>

				{isLoadingTrend ? (
					<Loading variant="skeleton" height={240} />
				) : hasTrendActivity ? (
					<div className="space-y-5">
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							<div className="rounded-xl border border-primary/15 bg-primary/10 p-4 shadow-sm">
								<p className="mb-1 text-sm text-muted-foreground">Selections (14d)</p>
								<p className="text-2xl font-bold text-foreground">{totalTrendSelections}</p>
								<p className="mt-2 text-xs text-muted-foreground">
									All tournament winners saved this cycle
								</p>
							</div>
							<div className="rounded-xl border border-chart-5/20 bg-chart-5/10 p-4 shadow-sm">
								<p className="mb-1 text-sm text-muted-foreground">Busiest Day</p>
								<p className="text-2xl font-bold text-foreground">
									{peakTrendDay?.selectionCount ?? 0}
								</p>
								<p className="text-xs text-muted-foreground">
									{peakTrendDay ? formatTrendLabel(peakTrendDay.date) : "No activity"}
								</p>
							</div>
							<div className="rounded-xl border border-chart-2/20 bg-chart-2/10 p-4 shadow-sm">
								<p className="mb-1 text-sm text-muted-foreground">Avg Active Users</p>
								<p className="text-2xl font-bold text-foreground">
									{averageActiveUsers.toFixed(1)}
								</p>
								<p className="mt-2 text-xs text-muted-foreground">
									Distinct users joining daily voting
								</p>
							</div>
							<div className="rounded-xl border border-secondary/25 bg-secondary/20 p-4 shadow-sm">
								<p className="mb-1 text-sm text-muted-foreground">Peak Names Touched</p>
								<p className="text-2xl font-bold text-foreground">{peakUniqueNames}</p>
								<p className="mt-2 text-xs text-muted-foreground">
									Unique contenders selected in one day
								</p>
							</div>
						</div>

						<div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
							<div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
								<div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
									<div>
										<p className="text-sm font-semibold text-foreground">Daily selections</p>
										<p className="text-xs text-muted-foreground">
											Scroll horizontally on smaller screens to inspect each day.
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
										<span className="flex items-center gap-2">
											<span
												className="h-3 w-3 rounded-sm bg-gradient-to-t from-primary to-chart-5"
												aria-hidden={true}
											/>
											Daily selections
										</span>
										<span className="flex items-center gap-2">
											<Clock size={14} />
											Updated from recorded tournament selections
										</span>
									</div>
								</div>

								<div className="overflow-x-auto pb-2">
									<div
										className="flex min-w-max items-end gap-3 rounded-2xl border border-border/60 bg-foreground/5 p-4"
										role="list"
										aria-label="Daily tournament activity"
									>
										{activityTrend.map((point) => (
											<div
												key={point.date}
												role="listitem"
												aria-label={`${formatTrendLabel(point.date)}: ${point.selectionCount} selections, ${point.activeUsers} active users, ${point.uniqueNames} names touched`}
												className="flex w-14 shrink-0 flex-col items-center"
											>
												<span className="mb-2 text-[11px] font-semibold text-foreground/80">
													{point.selectionCount}
												</span>
												<div className="flex h-36 w-full items-end rounded-xl border border-primary/15 bg-gradient-to-b from-primary/5 via-transparent to-background px-1 pb-1">
													<div
														className="w-full rounded-lg bg-gradient-to-t from-primary via-primary/90 to-chart-5 shadow-sm transition-transform duration-200 hover:scale-y-[1.03]"
														style={{
															height: getBarHeight(point.selectionCount, maxTrendSelections),
														}}
													/>
												</div>
												<span className="mt-3 text-[11px] font-semibold text-foreground">
													{formatTrendLabel(point.date)}
												</span>
												<span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
													{formatTrendWeekday(point.date)}
												</span>
											</div>
										))}
									</div>
								</div>
							</div>

							<div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
								<div className="mb-4">
									<p className="text-sm font-semibold text-foreground">Latest five days</p>
									<p className="text-xs text-muted-foreground">
										Quick breakdown of the most recent activity windows.
									</p>
								</div>
								<div className="space-y-2.5">
									{recentTrendPoints.map((point) => (
										<div
											key={point.date}
											className="rounded-xl border border-border/60 bg-foreground/5 p-3"
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="font-semibold text-foreground">
														{formatTrendLabel(point.date)}
													</p>
													<p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
														{formatTrendWeekday(point.date)}
													</p>
												</div>
												<div className="text-right">
													<p className="text-xl font-bold text-primary">{point.selectionCount}</p>
													<p className="text-[11px] text-muted-foreground">Selections</p>
												</div>
											</div>
											<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
												<div className="rounded-lg border border-border/60 bg-background/70 px-2 py-2 text-muted-foreground">
													<span className="mb-1 flex items-center gap-1 font-medium text-foreground">
														<User size={12} />
														Users
													</span>
													<span>{point.activeUsers} active</span>
												</div>
												<div className="rounded-lg border border-border/60 bg-background/70 px-2 py-2 text-muted-foreground">
													<span className="mb-1 flex items-center gap-1 font-medium text-foreground">
														<Layers size={12} />
														Names
													</span>
													<span>{point.uniqueNames} touched</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="rounded-2xl border border-dashed border-primary/20 bg-background/65 p-6 text-center shadow-sm">
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
			<Card
				padding="small"
				className="overflow-hidden border border-chart-4/20 bg-gradient-to-br from-chart-4/10 via-background/85 to-primary/5"
			>
				<div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div className="flex items-start gap-3">
						<div className="rounded-2xl border border-chart-4/20 bg-background/75 p-3 shadow-sm">
							<Trophy className="text-chart-4" size={24} />
						</div>
						<div>
							<h3 className="text-xl font-semibold text-foreground">Top Names</h3>
							<p className="text-sm text-muted-foreground">
								Highest-rated contenders across the current voting pool.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<div className="inline-flex items-center rounded-full border border-chart-4/20 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
							Top 10 snapshot
						</div>
						{onStartNew && (
							<Button variant="ghost" size="small" onClick={onStartNew}>
								Start New Tournament
							</Button>
						)}
					</div>
				</div>

				{isLoadingLeaderboard ? (
					<Loading variant="skeleton" height={300} />
				) : leaderboard.length > 0 ? (
					<div className="space-y-3">
						{leaderboard.map((entry, index) => {
							const tone = getLeaderboardTone(index);

							return (
								<div
									key={entry.name}
									className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${tone.rowClassName}`}
								>
									<div
										className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl font-bold ${tone.badgeClassName}`}
									>
										{index + 1}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="truncate font-semibold text-foreground">{entry.name}</p>
											{index < 3 && <Medal className={tone.scoreClassName} size={15} />}
										</div>
										<p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
											{tone.label}
										</p>
										<p className="mt-2 text-xs text-muted-foreground">
											{entry.total_ratings} rating{entry.total_ratings !== 1 ? "s" : ""} •{" "}
											{entry.wins} win{entry.wins !== 1 ? "s" : ""}
										</p>
									</div>
									<div className="text-right">
										<p className={`text-xl font-bold ${tone.scoreClassName}`}>
											{Math.round(entry.avg_rating)}
										</p>
										<p className="text-xs text-muted-foreground">rating</p>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="rounded-2xl border border-dashed border-chart-4/20 bg-background/70 p-8 text-center shadow-sm">
						<p className="font-semibold text-foreground">No ratings yet. Start a tournament!</p>
						<p className="mt-2 text-sm text-muted-foreground">
							Once votes land, the live leaderboard will appear here.
						</p>
					</div>
				)}
			</Card>

			{/* Site Statistics */}
			{siteStats && (
				<Card
					padding="small"
					className="overflow-hidden border border-border/70 bg-gradient-to-br from-foreground/[0.06] via-background/85 to-chart-5/10"
				>
					<div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
						<div className="flex items-start gap-3">
							<div className="rounded-2xl border border-border/70 bg-background/75 p-3 shadow-sm">
								<Layers className="text-primary" size={24} />
							</div>
							<div>
								<h3 className="text-xl font-semibold text-foreground">Site Statistics</h3>
								<p className="text-sm text-muted-foreground">
									Operational readout of the current name pool and voting traffic.
								</p>
							</div>
						</div>
						<div className="inline-flex items-center rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
							Live platform snapshot
						</div>
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{renderMetricTiles(siteMetricCards)}
					</div>
				</Card>
			)}

			{/* Admin: Hidden Names Management */}
			{isAdmin && (
				<Card
					padding="small"
					className="overflow-hidden border border-chart-4/30 bg-gradient-to-br from-chart-4/12 via-background/85 to-background"
				>
					<div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
						<div className="flex items-start gap-3">
							<div className="rounded-2xl border border-chart-4/25 bg-background/75 p-3 shadow-sm">
								<EyeOff className="text-chart-4" size={24} />
							</div>
							<div>
								<h3 className="text-xl font-semibold text-chart-4">Admin: Hidden Names</h3>
								<p className="text-sm text-muted-foreground">
									Review the hidden list and restore entries back into circulation.
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<div className="inline-flex items-center rounded-full border border-chart-4/20 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
								{isLoadingHiddenNames ? "Loading hidden names" : `${hiddenNamesTotal} hidden total`}
							</div>
							{showHiddenNames && (
								<Button
									variant="ghost"
									size="small"
									onClick={() => {
										void loadHiddenNames();
									}}
									loading={isLoadingHiddenNames}
								>
									Refresh
								</Button>
							)}
							<Button
								variant="ghost"
								size="small"
								onClick={() => setShowHiddenNames(!showHiddenNames)}
							>
								{showHiddenNames ? "Hide Hidden Names" : "Show Hidden Names"}
							</Button>
						</div>
					</div>

					{showHiddenNames && (
						<div className="space-y-3 rounded-2xl border border-chart-4/20 bg-background/70 p-3 shadow-sm">
							{isLoadingHiddenNames ? (
								<Loading variant="skeleton" height={140} />
							) : hiddenNamesError ? (
								<div className="rounded-xl border border-dashed border-chart-4/25 bg-background/75 p-6 text-center">
									<p className="font-semibold text-foreground">Hidden names could not load</p>
									<p className="mt-2 text-sm text-muted-foreground">{hiddenNamesError}</p>
									<div className="mt-4">
										<Button
											variant="ghost"
											size="small"
											onClick={() => {
												void loadHiddenNames();
											}}
										>
											Try Again
										</Button>
									</div>
								</div>
							) : hiddenNames.length > 0 ? (
								hiddenNames.map((name) => (
									<div
										key={name.id}
										className="flex items-center justify-between rounded-xl border border-chart-4/20 bg-chart-4/8 p-3 shadow-sm"
									>
										<div>
											<p className="font-medium text-foreground">{name.name}</p>
											<p className="text-xs text-muted-foreground">
												Hidden from public tournaments
											</p>
										</div>
										<Button
											variant="ghost"
											size="small"
											onClick={() => handleUnhideName(name.id)}
											className="text-chart-2 hover:text-chart-2/80"
											loading={pendingUnhideIds.has(String(name.id))}
										>
											<Eye size={16} className="mr-1" />
											Unhide
										</Button>
									</div>
								))
							) : (
								<div className="rounded-xl border border-dashed border-chart-4/20 bg-background/75 p-6 text-center">
									<p className="font-semibold text-foreground">No hidden names</p>
									<p className="mt-2 text-sm text-muted-foreground">
										Everything is currently visible to tournament users.
									</p>
								</div>
							)}
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
