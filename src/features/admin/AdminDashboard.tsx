/**
 * @module AdminDashboard
 * @description Admin dashboard for managing names and reviewing real site activity.
 */

import { AnimatePresence, motion } from "framer-motion";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
	type AdminActivityItem,
	type AdminUserSummary,
	adminAnalyticsAPI,
	statsAPI as analyticsStatsAPI,
	type EngagementMetrics,
	leaderboardAPI,
	type TopSelectionSummary,
} from "@/features/analytics/services/analyticsService";
import Button from "@/shared/components/layout/Button";
import { Loading } from "@/shared/components/layout/Feedback";
import { Input } from "@/shared/components/layout/FormPrimitives";
import {
	getActiveNames,
	getHiddenNames,
	getLockedNames,
	isNameHidden,
	isNameLocked,
	matchesNameSearchTerm,
} from "@/shared/lib/basic";
import { Activity, BarChart3, Eye, EyeOff, Loader2, Lock, Trophy, Users } from "@/shared/lib/icons";
import {
	adminNamesAPI,
	coreAPI,
	hiddenNamesAPI,
	imagesAPI,
	statsAPI,
} from "@/shared/services/supabase";
import type { NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

type DashboardTab = "overview" | "names" | "users" | "analytics";
type NameFilter = "all" | "active" | "hidden" | "locked";
type BulkAction = "hide" | "unhide" | "lock" | "unlock";

type ToggleOptions = {
	skipRefresh?: boolean;
};

interface AdminStats {
	activeNames: number;
	hiddenNames: number;
	lockedInNames: number;
	recentVotes: number;
	totalNames: number;
	totalUsers: number;
}

interface NameWithStats extends NameItem {
	lastVoted?: string;
	popularityScore?: number;
	votes?: number;
}

interface SiteStatsLike {
	totalRatings?: unknown;
	totalUsers?: unknown;
}

const ADMIN_TABS: readonly { id: DashboardTab; label: string }[] = [
	{ id: "overview", label: "Overview" },
	{ id: "names", label: "Names" },
	{ id: "users", label: "Users" },
	{ id: "analytics", label: "Analytics" },
];

const FILTER_OPTIONS: readonly { value: NameFilter; label: string }[] = [
	{ value: "all", label: "All Names" },
	{ value: "active", label: "Active" },
	{ value: "hidden", label: "Hidden" },
	{ value: "locked", label: "Locked In" },
];

function toNumber(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimestamp(value: string | null | undefined): string {
	if (!value) {
		return "No recent activity";
	}

	return new Date(value).toLocaleString();
}

function mapNameToDisplay(name: NameItem): NameWithStats {
	return {
		...name,
		votes: Number((name.wins || 0) + (name.losses || 0)),
		lastVoted: undefined,
		popularityScore: Number(name.popularity_score ?? 0),
	};
}

function buildAdminStats(names: NameWithStats[], siteStats: SiteStatsLike | null): AdminStats {
	return {
		totalNames: names.length,
		activeNames: getActiveNames(names).length,
		hiddenNames: getHiddenNames(names).length,
		lockedInNames: getLockedNames(names).length,
		totalUsers: toNumber(siteStats?.totalUsers),
		recentVotes: toNumber(siteStats?.totalRatings),
	};
}

function filterNamesByStatusAndSearch(
	names: NameWithStats[],
	filterStatus: NameFilter,
	searchTerm: string,
): NameWithStats[] {
	let filtered = names;

	if (filterStatus === "active") {
		filtered = getActiveNames(filtered);
	} else if (filterStatus === "hidden") {
		filtered = getHiddenNames(filtered);
	} else if (filterStatus === "locked") {
		filtered = getLockedNames(filtered);
	}

	const normalizedSearch = searchTerm.trim().toLowerCase();
	if (!normalizedSearch) {
		return filtered;
	}

	return filtered.filter((name) => matchesNameSearchTerm(name, normalizedSearch));
}

export function AdminDashboard() {
	const { user } = useAppStore();
	const actorName = user.name.trim();

	const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [names, setNames] = useState<NameWithStats[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<NameFilter>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
	const [recentActivity, setRecentActivity] = useState<AdminActivityItem[]>([]);
	const [userSummaries, setUserSummaries] = useState<AdminUserSummary[]>([]);
	const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
	const [topSelections, setTopSelections] = useState<TopSelectionSummary[]>([]);
	const [leaderboard, setLeaderboard] = useState<Array<{ name: string; avg_rating: number }>>([]);

	const loadAdminData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [allNames, siteStats, activity, users, snapshot, selections, topNames] =
				await Promise.all([
					coreAPI.getTrendingNames(true),
					statsAPI.getSiteStats(),
					adminAnalyticsAPI.getRecentActivity(12),
					adminAnalyticsAPI.getUserSummaries(20),
					analyticsStatsAPI.getEngagementMetrics("week"),
					adminAnalyticsAPI.getTopSelections(8),
					leaderboardAPI.getLeaderboard(5),
				]);

			const namesWithStats = allNames.map(mapNameToDisplay);
			setStats(buildAdminStats(namesWithStats, siteStats));
			setNames(namesWithStats);
			setRecentActivity(activity);
			setUserSummaries(users);
			setEngagement(snapshot);
			setTopSelections(selections);
			setLeaderboard(
				topNames.map((entry) => ({
					name: entry.name,
					avg_rating: entry.avg_rating,
				})),
			);
		} catch (error) {
			console.error("Failed to load admin data:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadAdminData();
	}, [loadAdminData]);

	const filteredNames = useMemo(
		() => filterNamesByStatusAndSearch(names, filterStatus, searchTerm),
		[names, filterStatus, searchTerm],
	);

	const nameById = useMemo(() => {
		const map = new Map<string, NameWithStats>();
		for (const name of names) {
			map.set(String(name.id), name);
		}
		return map;
	}, [names]);

	const handleToggleHidden = useCallback(
		async (nameId: string | number, isHidden: boolean, options: ToggleOptions = {}) => {
			try {
				const idStr = String(nameId);
				const result = isHidden
					? await hiddenNamesAPI.unhideName(actorName, idStr)
					: await hiddenNamesAPI.hideName(actorName, idStr);

				if (!result.success) {
					throw new Error(result.error || "Failed to update name visibility");
				}

				if (!options.skipRefresh) {
					await loadAdminData();
				}
			} catch (error) {
				console.error("Failed to toggle hidden status:", error);
			}
		},
		[actorName, loadAdminData],
	);

	const handleToggleLocked = useCallback(
		async (nameId: string | number, isLocked: boolean, options: ToggleOptions = {}) => {
			try {
				const idStr = String(nameId);
				const result = await adminNamesAPI.toggleLockedIn(idStr, !isLocked);
				if (!result.success) {
					throw new Error(result.error || "Failed to toggle locked status");
				}

				if (!options.skipRefresh) {
					await loadAdminData();
				}
			} catch (error) {
				console.error("Failed to toggle locked status:", error);
			}
		},
		[loadAdminData],
	);

	const handleBulkAction = useCallback(
		async (action: BulkAction) => {
			if (selectedNames.size === 0) {
				return;
			}

			const actionHandlers: Record<BulkAction, (name: NameWithStats) => Promise<void>> = {
				hide: (name) => handleToggleHidden(name.id, false, { skipRefresh: true }),
				unhide: (name) => handleToggleHidden(name.id, true, { skipRefresh: true }),
				lock: (name) => handleToggleLocked(name.id, false, { skipRefresh: true }),
				unlock: (name) => handleToggleLocked(name.id, true, { skipRefresh: true }),
			};

			try {
				for (const nameId of selectedNames) {
					const name = nameById.get(nameId);
					if (!name) {
						continue;
					}
					await actionHandlers[action](name);
				}
				await loadAdminData();
				setSelectedNames(new Set());
			} catch (error) {
				console.error("Failed to perform bulk action:", error);
			}
		},
		[handleToggleHidden, handleToggleLocked, loadAdminData, nameById, selectedNames],
	);

	const handleImageUpload = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}

			try {
				const result = await imagesAPI.upload(file, actorName);
				if (!result.success) {
					throw new Error(result.error || "Upload failed");
				}
				await loadAdminData();
			} catch (error) {
				console.error("Upload error:", error);
			}
		},
		[actorName, loadAdminData],
	);

	const handleSelectionChange = useCallback((nameId: string, checked: boolean) => {
		setSelectedNames((previous) => {
			const next = new Set(previous);
			if (checked) {
				next.add(nameId);
			} else {
				next.delete(nameId);
			}
			return next;
		});
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loading variant="spinner" text="Loading admin dashboard..." />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground p-6">
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
					Admin Dashboard
				</h1>
				<p className="text-muted-foreground">Manage names and monitor live tournament activity</p>
			</div>

			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 mb-8">
					<div className="p-6">
						<p className="text-sm text-muted-foreground mb-1">Total Names</p>
						<p className="text-3xl font-bold text-foreground">{stats.totalNames}</p>
					</div>
					<div className="p-6">
						<p className="text-sm text-muted-foreground mb-1">Active Names</p>
						<p className="text-3xl font-bold text-chart-2">{stats.activeNames}</p>
					</div>
					<div className="p-6">
						<p className="text-sm text-muted-foreground mb-1">Locked In</p>
						<p className="text-3xl font-bold text-chart-4">{stats.lockedInNames}</p>
					</div>
					<div className="p-6">
						<p className="text-sm text-muted-foreground mb-1">Hidden Names</p>
						<p className="text-3xl font-bold text-destructive">{stats.hiddenNames}</p>
					</div>
					<div className="p-6">
						<p className="text-sm text-muted-foreground mb-1">Known Users</p>
						<p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
					</div>
					<div className="p-6">
						<p className="text-sm text-muted-foreground mb-1">Rating Rows</p>
						<p className="text-3xl font-bold text-foreground">{stats.recentVotes}</p>
					</div>
				</div>
			)}

			<div className="flex gap-2 mb-6 border-b border-border/10">
				{ADMIN_TABS.map((tab) => (
					<Button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						type="button"
						variant={activeTab === tab.id ? "secondary" : "ghost"}
						presentation="chip"
						shape="pill"
						className={`px-4 py-2 font-medium ${
							activeTab === tab.id
								? "bg-primary/12 text-foreground"
								: "bg-transparent text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
						}`}
					>
						{tab.label}
					</Button>
				))}
			</div>

			<AnimatePresence mode="wait">
				{activeTab === "overview" && (
					<motion.div
						key="overview"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="grid grid-cols-1 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6"
					>
						<div className="p-6 border border-border/10 rounded-2xl bg-card">
							<h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
							<h3 className="text-lg font-semibold mb-2">Image Upload</h3>
							<input
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								className="w-full p-2 bg-foreground/10 border border-border/20 rounded"
							/>
						</div>

						<div className="p-6 border border-border/10 rounded-2xl bg-card">
							<div className="flex items-center gap-3 mb-4">
								<Activity className="text-primary" size={22} />
								<h2 className="text-2xl font-bold">Recent Activity</h2>
							</div>
							<div className="space-y-3">
								{recentActivity.length > 0 ? (
									recentActivity.map((entry) => (
										<div
											key={entry.id}
											className="flex items-start justify-between gap-4 border-b border-border/10 pb-3"
										>
											<div>
												<p className="font-medium text-foreground">
													{entry.userName} {entry.type === "selection" ? "selected" : "updated"}{" "}
													{entry.name}
												</p>
												<p className="text-sm text-muted-foreground">{entry.details}</p>
											</div>
											<p className="text-xs text-muted-foreground whitespace-nowrap">
												{formatTimestamp(entry.timestamp)}
											</p>
										</div>
									))
								) : (
									<p className="text-muted-foreground">
										No recorded tournament or rating activity yet.
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === "names" && (
					<motion.div
						key="names"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<div className="flex flex-col lg:flex-row gap-4 mb-6">
							<div className="flex-1">
								<Input
									type="text"
									placeholder="Search names..."
									value={searchTerm}
									onChange={(event) => setSearchTerm(event.target.value)}
									className="w-full"
								/>
							</div>
							<div className="flex gap-2">
								<select
									value={filterStatus}
									onChange={(event) => {
										const option = FILTER_OPTIONS.find((item) => item.value === event.target.value);
										if (option) {
											setFilterStatus(option.value);
										}
									}}
									className="px-4 py-2 bg-foreground/10 border border-border/20 rounded-lg text-foreground"
								>
									{FILTER_OPTIONS.map((option) => (
										<option value={option.value} key={option.value}>
											{option.label}
										</option>
									))}
								</select>

								<Button
									onClick={() => void loadAdminData()}
									variant="ghost"
									size="sm"
									iconOnly={true}
								>
									<Loader2 size={16} />
								</Button>
							</div>
						</div>

						{selectedNames.size > 0 && (
							<div className="mb-4 py-4 border-y border-border/10">
								<p className="text-sm text-primary mb-2">{selectedNames.size} names selected</p>
								<div className="flex gap-2">
									<Button onClick={() => void handleBulkAction("hide")} size="sm">
										<EyeOff size={14} /> Hide
									</Button>
									<Button onClick={() => void handleBulkAction("unhide")} size="sm">
										<Eye size={14} /> Unhide
									</Button>
									<Button onClick={() => void handleBulkAction("lock")} size="sm">
										<Lock size={14} /> Lock
									</Button>
									<Button onClick={() => void handleBulkAction("unlock")} size="sm">
										<Lock size={14} /> Unlock
									</Button>
									<Button onClick={() => setSelectedNames(new Set())} variant="ghost" size="sm">
										Clear
									</Button>
								</div>
							</div>
						)}

						<div className="divide-y divide-border/10">
							{filteredNames.map((name) => {
								const nameId = String(name.id);
								const hidden = isNameHidden(name);
								const locked = isNameLocked(name);

								return (
									<div key={name.id} className="py-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-4">
												<input
													type="checkbox"
													checked={selectedNames.has(nameId)}
													onChange={(event) => handleSelectionChange(nameId, event.target.checked)}
													className="w-4 h-4"
												/>
												<div>
													<h3 className="font-semibold text-foreground">{name.name}</h3>
													{name.description && (
														<p className="text-sm text-muted-foreground">{name.description}</p>
													)}
													<div className="flex gap-4 mt-1 text-xs text-muted-foreground/60">
														<span>Votes: {name.votes}</span>
														<span>
															Score:{" "}
															{name.popularityScore == null ? "?" : name.popularityScore.toFixed(1)}
														</span>
													</div>
												</div>
											</div>

											<div className="flex items-center gap-2">
												{locked && (
													<div className="text-xs text-chart-4 font-semibold">
														<Lock size={12} /> Locked
													</div>
												)}
												{hidden && (
													<div className="text-xs text-destructive font-semibold">
														<EyeOff size={12} /> Hidden
													</div>
												)}

												<div className="flex gap-1">
													<Button
														onClick={() => void handleToggleHidden(name.id, hidden)}
														variant="ghost"
														size="sm"
														iconOnly={true}
													>
														{hidden ? <Eye size={14} /> : <EyeOff size={14} />}
													</Button>
													<Button
														onClick={() => void handleToggleLocked(name.id, locked)}
														variant="ghost"
														size="sm"
														iconOnly={true}
														aria-label={locked ? "Unlock name" : "Lock name"}
													>
														<Lock size={14} />
													</Button>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</motion.div>
				)}

				{activeTab === "users" && (
					<motion.div
						key="users"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="space-y-6"
					>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<div className="flex items-center gap-3 mb-2">
									<Users className="text-primary" size={22} />
									<h2 className="text-lg font-semibold">Tracked Users</h2>
								</div>
								<p className="text-3xl font-bold">{userSummaries.length}</p>
							</div>
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<div className="flex items-center gap-3 mb-2">
									<Activity className="text-chart-4" size={22} />
									<h2 className="text-lg font-semibold">Selections Logged</h2>
								</div>
								<p className="text-3xl font-bold">
									{userSummaries.reduce((sum, summary) => sum + summary.selectionsCount, 0)}
								</p>
							</div>
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<div className="flex items-center gap-3 mb-2">
									<BarChart3 className="text-chart-2" size={22} />
									<h2 className="text-lg font-semibold">Ratings Logged</h2>
								</div>
								<p className="text-3xl font-bold">
									{userSummaries.reduce((sum, summary) => sum + summary.ratingsCount, 0)}
								</p>
							</div>
						</div>

						<div className="p-6 border border-border/10 rounded-2xl bg-card">
							<h2 className="text-2xl font-bold mb-4">Most Active Users</h2>
							<div className="space-y-3">
								{userSummaries.length > 0 ? (
									userSummaries.map((summary) => (
										<div
											key={summary.userKey}
											className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,120px))] gap-4 border-b border-border/10 pb-3"
										>
											<div>
												<p className="font-medium text-foreground">{summary.userName}</p>
												<p className="text-xs text-muted-foreground">
													Last active: {formatTimestamp(summary.lastActiveAt)}
												</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">Selections</p>
												<p className="font-semibold">{summary.selectionsCount}</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">Ratings</p>
												<p className="font-semibold">{summary.ratingsCount}</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">Wins</p>
												<p className="font-semibold">{summary.totalWins}</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">Losses</p>
												<p className="font-semibold">{summary.totalLosses}</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">Avg Rating</p>
												<p className="font-semibold">{summary.averageRating}</p>
											</div>
										</div>
									))
								) : (
									<p className="text-muted-foreground">
										User analytics will appear after people start rating and selecting names.
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === "analytics" && (
					<motion.div
						key="analytics"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="space-y-6"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<p className="text-sm text-muted-foreground mb-1">Weekly Active Users</p>
								<p className="text-3xl font-bold">{engagement?.activeUsers ?? 0}</p>
							</div>
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<p className="text-sm text-muted-foreground mb-1">Weekly Selections</p>
								<p className="text-3xl font-bold">{engagement?.selectionsInWindow ?? 0}</p>
							</div>
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<p className="text-sm text-muted-foreground mb-1">Weekly Rating Updates</p>
								<p className="text-3xl font-bold">{engagement?.ratingsUpdatedInWindow ?? 0}</p>
							</div>
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<p className="text-sm text-muted-foreground mb-1">Avg Selections / Selector</p>
								<p className="text-3xl font-bold">
									{engagement?.averageSelectionsPerSelector ?? 0}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<div className="flex items-center gap-3 mb-4">
									<Trophy className="text-chart-4" size={22} />
									<h2 className="text-2xl font-bold">Top Selected Names</h2>
								</div>
								<div className="space-y-3">
									{topSelections.length > 0 ? (
										topSelections.map((selection, index) => (
											<div
												key={selection.nameId}
												className="flex items-center justify-between border-b border-border/10 pb-3"
											>
												<p className="font-medium">
													{index + 1}. {selection.name}
												</p>
												<p className="text-chart-4 font-semibold">{selection.count}</p>
											</div>
										))
									) : (
										<p className="text-muted-foreground">
											No tournament selections have been recorded yet.
										</p>
									)}
								</div>
							</div>

							<div className="p-6 border border-border/10 rounded-2xl bg-card">
								<div className="flex items-center gap-3 mb-4">
									<BarChart3 className="text-primary" size={22} />
									<h2 className="text-2xl font-bold">Leaderboard Snapshot</h2>
								</div>
								<div className="space-y-3">
									{leaderboard.length > 0 ? (
										leaderboard.map((entry, index) => (
											<div
												key={entry.name}
												className="flex items-center justify-between border-b border-border/10 pb-3"
											>
												<p className="font-medium">
													{index + 1}. {entry.name}
												</p>
												<p className="text-primary font-semibold">{Math.round(entry.avg_rating)}</p>
											</div>
										))
									) : (
										<p className="text-muted-foreground">No leaderboard data yet.</p>
									)}
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
