/**
 * @module AdminDashboard
 * @description Comprehensive admin dashboard for managing names and viewing analytics
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
	analyticsAPI,
	statsAPI as analyticsStatsAPI,
	type LeaderboardItem,
	leaderboardAPI,
	type PopularityScoreItem,
	type UserStats,
} from "@/services/analytics/analyticsService";
import { coreAPI, hiddenNamesAPI, statsAPI as siteStatsAPI } from "@/services/supabase/api";
import { withSupabase } from "@/services/supabase/runtime";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import { Loading } from "@/shared/components/layout/Feedback";
import { Input } from "@/shared/components/layout/FormPrimitives";
import { isRpcSignatureError } from "@/shared/lib/errors";
import { BarChart3, Eye, EyeOff, Loader2, Lock } from "@/shared/lib/icons";

import type { NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

interface AdminStats {
	totalNames: number;
	activeNames: number;
	hiddenNames: number;
	lockedInNames: number;
	totalUsers: number;
	totalRatings: number;
}

interface NameWithStats extends NameItem {
	votes?: number;
	lastVoted?: string;
	popularityScore?: number;
}

function toTimestamp(value: unknown): number {
	if (typeof value !== "string") {
		return 0;
	}
	const timestamp = Date.parse(value);
	return Number.isFinite(timestamp) ? timestamp : 0;
}

export function AdminDashboard() {
	const { user } = useAppStore();
	const [activeTab, setActiveTab] = useState<"overview" | "names" | "users" | "analytics">(
		"overview",
	);
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [names, setNames] = useState<NameWithStats[]>([]);
	const [filteredNames, setFilteredNames] = useState<NameWithStats[]>([]);
	const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
	const [popularityScores, setPopularityScores] = useState<PopularityScoreItem[]>([]);
	const [currentUserStats, setCurrentUserStats] = useState<UserStats | null>(null);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden" | "locked">("all");
	const [isLoading, setIsLoading] = useState(true);
	const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

	// Load admin stats and names for the active admin identity.
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadAdminData is intentionally invoked from user.name changes
	useEffect(() => {
		loadAdminData();
	}, [user.name]);

	// Filter names based on search and status
	useEffect(() => {
		let filtered = names;

		// Status filter
		if (filterStatus === "active") {
			filtered = filtered.filter((n) => !n.isHidden && !(n.lockedIn || n.locked_in));
		} else if (filterStatus === "hidden") {
			filtered = filtered.filter((n) => n.isHidden);
		} else if (filterStatus === "locked") {
			filtered = filtered.filter((n) => n.lockedIn || n.locked_in);
		}

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(n) =>
					n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					n.description?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		setFilteredNames(filtered);
	}, [names, searchTerm, filterStatus]);

	const loadAdminData = async () => {
		setIsLoading(true);
		try {
			const [allNames, siteStats, leaderboardRows, popularityRows, userStats] = await Promise.all([
				coreAPI.getTrendingNames(true),
				siteStatsAPI.getSiteStats(),
				leaderboardAPI.getLeaderboard(6),
				analyticsAPI.getPopularityScores(6),
				user.name ? analyticsStatsAPI.getUserStats(user.name) : Promise.resolve(null),
			]);

			const adminStats: AdminStats = {
				totalNames: allNames.length,
				activeNames: allNames.filter((n) => !n.isHidden && !(n.lockedIn || n.locked_in)).length,
				hiddenNames: allNames.filter((n) => n.isHidden).length,
				lockedInNames: allNames.filter((n) => n.lockedIn || n.locked_in).length,
				totalUsers: siteStats?.totalUsers || 0,
				totalRatings: siteStats?.totalRatings || 0,
			};

			const namesWithStats: NameWithStats[] = allNames.map((name) => ({
				...name,
				votes: Number((name.wins || 0) + (name.losses || 0)),
				lastVoted: undefined,
				popularityScore: Number(name.popularity_score || 0),
			}));

			setStats(adminStats);
			setNames(namesWithStats);
			setLeaderboard(leaderboardRows);
			setPopularityScores(popularityRows);
			setCurrentUserStats(userStats);
			setLastUpdatedAt(new Date().toISOString());
		} catch (error) {
			console.error("Failed to load admin data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const setNameHiddenState = async (nameId: string | number, shouldHide: boolean) => {
		const idStr = String(nameId);
		const result = shouldHide
			? await hiddenNamesAPI.hideName(user.name, idStr)
			: await hiddenNamesAPI.unhideName(user.name, idStr);

		if (!result.success) {
			throw new Error(result.error || `Failed to ${shouldHide ? "hide" : "unhide"} name`);
		}
	};

	const setNameLockedState = async (nameId: string | number, shouldLock: boolean) => {
		const idStr = String(nameId);
		await withSupabase(async (client) => {
			await client.rpc("set_user_context", { user_name_param: user.name });
			const canonicalArgs = {
				p_name_id: idStr,
				p_locked_in: shouldLock,
			};
			let result = await client.rpc("toggle_name_locked_in" as any, canonicalArgs);

			if (result.error && isRpcSignatureError(result.error.message || "")) {
				result = await client.rpc("toggle_name_locked_in" as any, {
					...canonicalArgs,
					p_user_name: user.name,
				});
			}

			if (result.error) {
				throw new Error(result.error.message || "Failed to toggle locked status");
			}
			return result.data;
		}, null);
	};

	const handleToggleHidden = async (nameId: string | number, isHidden: boolean) => {
		try {
			await setNameHiddenState(nameId, !isHidden);
			await loadAdminData();
		} catch (error) {
			console.error("Failed to toggle hidden status:", error);
		}
	};

	const handleToggleLocked = async (nameId: string | number, isLocked: boolean) => {
		try {
			await setNameLockedState(nameId, !isLocked);
			await loadAdminData();
		} catch (error) {
			console.error("Failed to toggle locked status:", error);
		}
	};

	const handleBulkAction = async (action: "hide" | "unhide" | "lock" | "unlock") => {
		if (selectedNames.size === 0) {
			return;
		}

		try {
			const operations: Promise<unknown>[] = [];

			for (const nameId of selectedNames) {
				const name = names.find((entry) => String(entry.id) === String(nameId));
				if (!name) {
					continue;
				}

				if (action === "hide" && !name.isHidden) {
					operations.push(setNameHiddenState(nameId, true));
				}

				if (action === "unhide" && name.isHidden) {
					operations.push(setNameHiddenState(nameId, false));
				}

				if (action === "lock" && !(name.lockedIn || name.locked_in)) {
					operations.push(setNameLockedState(nameId, true));
				}

				if (action === "unlock" && (name.lockedIn || name.locked_in)) {
					operations.push(setNameLockedState(nameId, false));
				}
			}

			await Promise.all(operations);
			setSelectedNames(new Set());
			await loadAdminData();
		} catch (error) {
			console.error("Failed to perform bulk action:", error);
		}
	};

	const recentlyAddedNames = [...names]
		.sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
		.slice(0, 5);

	const namesNeedingAttention = names
		.filter((name) => name.isHidden || name.lockedIn || name.locked_in)
		.sort((left, right) => Number(right.votes || 0) - Number(left.votes || 0))
		.slice(0, 5);

	const mostSelectedNames = [...popularityScores]
		.sort((left, right) => right.times_selected - left.times_selected)
		.slice(0, 5);

	const ratingsPerUser = stats?.totalUsers ? stats.totalRatings / stats.totalUsers : 0;
	const ratingsPerName = stats?.totalNames ? stats.totalRatings / stats.totalNames : 0;
	const hiddenShare = stats?.totalNames ? (stats.hiddenNames / stats.totalNames) * 100 : 0;
	const lockedShare = stats?.totalNames ? (stats.lockedInNames / stats.totalNames) * 100 : 0;
	const userRatingsShare =
		currentUserStats && stats?.totalRatings
			? (currentUserStats.totalRatings / stats.totalRatings) * 100
			: 0;

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loading variant="spinner" text="Loading admin dashboard..." />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground p-6">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
					Admin Dashboard
				</h1>
				<p className="text-muted-foreground">Manage names and monitor site activity</p>
				{lastUpdatedAt && (
					<p className="mt-2 text-xs text-muted-foreground/70">
						Last refreshed {new Date(lastUpdatedAt).toLocaleString()}
					</p>
				)}
			</div>

			{/* Stats Overview */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<Card className="p-6 border-primary/30 bg-primary/10">
						<div className="flex items-center gap-3 mb-2">
							<BarChart3 className="text-primary" size={24} />
							<h3 className="text-lg font-semibold text-primary">Total Names</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.totalNames}</p>
					</Card>

					<Card className="p-6 border-chart-2/30 bg-chart-2/10">
						<div className="flex items-center gap-3 mb-2">
							<Eye className="text-chart-2" size={24} />
							<h3 className="text-lg font-semibold text-chart-2">Active</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.activeNames}</p>
					</Card>

					<Card className="p-6 border-chart-4/30 bg-chart-4/10">
						<div className="flex items-center gap-3 mb-2">
							<Lock className="text-chart-4" size={24} />
							<h3 className="text-lg font-semibold text-chart-4">Locked In</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.lockedInNames}</p>
					</Card>

					<Card className="p-6 border-destructive/30 bg-destructive/10">
						<div className="flex items-center gap-3 mb-2">
							<EyeOff className="text-destructive" size={24} />
							<h3 className="text-lg font-semibold text-destructive">Hidden</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.hiddenNames}</p>
					</Card>
				</div>
			)}

			{/* Tab Navigation */}
			<div className="flex gap-2 mb-6 border-b border-border/10">
				{["overview", "names", "users", "analytics"].map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab as any)}
						className={`px-4 py-2 font-medium transition-colors ${
							activeTab === tab
								? "text-foreground border-b-2 border-primary"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab.charAt(0).toUpperCase() + tab.slice(1)}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<AnimatePresence mode="wait">
				{activeTab === "names" && (
					<motion.div
						key="names"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						{/* Search and Filters */}
						<div className="flex flex-col lg:flex-row gap-4 mb-6">
							<div className="flex-1">
								<Input
									type="text"
									placeholder="Search names..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full"
								/>
							</div>

							<div className="flex gap-2">
								<select
									value={filterStatus}
									onChange={(e) => setFilterStatus(e.target.value as any)}
									className="px-4 py-2 bg-foreground/10 border border-border/20 rounded-lg text-foreground"
								>
									<option value="all">All Names</option>
									<option value="active">Active</option>
									<option value="hidden">Hidden</option>
									<option value="locked">Locked In</option>
								</select>

								<Button onClick={loadAdminData} variant="ghost" size="small">
									<Loader2 size={16} />
								</Button>
							</div>
						</div>

						{/* Bulk Actions */}
						{selectedNames.size > 0 && (
							<div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
								<p className="text-sm text-primary mb-2">{selectedNames.size} names selected</p>
								<div className="flex gap-2">
									<Button onClick={() => handleBulkAction("hide")} size="small">
										<EyeOff size={14} /> Hide
									</Button>
									<Button onClick={() => handleBulkAction("unhide")} size="small">
										<Eye size={14} /> Unhide
									</Button>
									<Button onClick={() => handleBulkAction("lock")} size="small">
										<Lock size={14} /> Lock
									</Button>
									<Button onClick={() => handleBulkAction("unlock")} size="small">
										<Lock size={14} /> Unlock
									</Button>
									<Button onClick={() => setSelectedNames(new Set())} variant="ghost" size="small">
										Clear
									</Button>
								</div>
							</div>
						)}

						{/* Names List */}
						<div className="space-y-2">
							{filteredNames.map((name) => (
								<Card key={name.id} className="p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<input
												type="checkbox"
												checked={selectedNames.has(String(name.id))}
												onChange={(e) => {
													const newSelected = new Set(selectedNames);
													const idStr = String(name.id);
													if (e.target.checked) {
														newSelected.add(idStr);
													} else {
														newSelected.delete(idStr);
													}
													setSelectedNames(newSelected);
												}}
												className="w-4 h-4"
											/>

											<div>
												<h3 className="font-semibold text-foreground">{name.name}</h3>
												{name.description && (
													<p className="text-sm text-muted-foreground">{name.description}</p>
												)}
												<div className="flex gap-4 mt-1 text-xs text-muted-foreground/60">
													<span>Votes: {name.votes}</span>
													<span>Score: {name.popularityScore?.toFixed(1)}</span>
													{name.lastVoted && (
														<span>Last: {new Date(name.lastVoted).toLocaleDateString()}</span>
													)}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-2">
											{/* Status indicators */}
											{(name.lockedIn || name.locked_in) && (
												<div className="px-2 py-1 bg-chart-4/20 border border-chart-4/30 rounded text-xs text-chart-4">
													<Lock size={12} /> Locked
												</div>
											)}
											{name.isHidden && (
												<div className="px-2 py-1 bg-destructive/20 border border-destructive/30 rounded text-xs text-destructive">
													<EyeOff size={12} /> Hidden
												</div>
											)}

											{/* Action buttons */}
											<div className="flex gap-1">
												<Button
													onClick={() => handleToggleHidden(name.id, name.isHidden || false)}
													variant="ghost"
													size="small"
												>
													{name.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
												</Button>
												<Button
													onClick={() =>
														handleToggleLocked(name.id, name.lockedIn || name.locked_in || false)
													}
													variant="ghost"
													size="small"
												>
													{name.lockedIn || name.locked_in ? (
														<Lock size={14} />
													) : (
														<Lock size={14} />
													)}
												</Button>
											</div>
										</div>
									</div>
								</Card>
							))}
						</div>
					</motion.div>
				)}

				{activeTab === "overview" && (
					<motion.div
						key="overview"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="grid grid-cols-1 xl:grid-cols-2 gap-6"
					>
						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
							<div className="flex flex-wrap gap-3">
								<Button onClick={loadAdminData} size="small">
									<Loader2 size={14} /> Refresh Snapshot
								</Button>
								<Button
									onClick={() => {
										setFilterStatus("hidden");
										setActiveTab("names");
									}}
									variant="ghost"
									size="small"
								>
									<EyeOff size={14} /> Review Hidden Names
								</Button>
								<Button
									onClick={() => {
										setFilterStatus("locked");
										setActiveTab("names");
									}}
									variant="ghost"
									size="small"
								>
									<Lock size={14} /> Review Locked Names
								</Button>
								<Button onClick={() => setActiveTab("analytics")} variant="ghost" size="small">
									<BarChart3 size={14} /> Open Analytics
								</Button>
							</div>

							<div className="mt-6 grid grid-cols-2 gap-4">
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Ratings Per User</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{ratingsPerUser.toFixed(1)}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Ratings Per Name</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{ratingsPerName.toFixed(1)}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Hidden Share</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{hiddenShare.toFixed(1)}%
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Locked Share</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{lockedShare.toFixed(1)}%
									</p>
								</div>
							</div>
						</Card>

						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Attention Queue</h2>
							{namesNeedingAttention.length > 0 ? (
								<div className="space-y-3">
									{namesNeedingAttention.map((name) => (
										<div
											key={name.id}
											className="flex items-center justify-between rounded-lg border border-border/10 bg-foreground/5 p-4"
										>
											<div>
												<p className="font-semibold text-foreground">{name.name}</p>
												<p className="text-sm text-muted-foreground">{name.votes || 0} votes</p>
											</div>
											<div className="flex gap-2 text-xs">
												{name.isHidden && (
													<span className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-destructive">
														Hidden
													</span>
												)}
												{(name.lockedIn || name.locked_in) && (
													<span className="rounded border border-chart-4/30 bg-chart-4/10 px-2 py-1 text-chart-4">
														Locked
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground">No names currently need admin attention.</p>
							)}
						</Card>

						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Recently Added</h2>
							{recentlyAddedNames.length > 0 ? (
								<div className="space-y-3">
									{recentlyAddedNames.map((name) => (
										<div
											key={name.id}
											className="rounded-lg border border-border/10 bg-foreground/5 p-4"
										>
											<p className="font-semibold text-foreground">{name.name}</p>
											<p className="text-sm text-muted-foreground">
												{typeof name.description === "string" && name.description
													? name.description
													: "No description provided"}
											</p>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground">No recently created names were found.</p>
							)}
						</Card>

						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Momentum Snapshot</h2>
							{mostSelectedNames.length > 0 ? (
								<div className="space-y-3">
									{mostSelectedNames.map((entry, index) => (
										<div
											key={String(entry.name_id)}
											className="flex items-center justify-between rounded-lg border border-border/10 bg-foreground/5 p-4"
										>
											<div>
												<p className="font-semibold text-foreground">
													{index + 1}. {entry.name}
												</p>
												<p className="text-sm text-muted-foreground">
													{entry.times_selected} selections
												</p>
											</div>
											<p className="text-lg font-bold text-primary">
												{Math.round(entry.avg_rating)}
											</p>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground">
									Selection analytics will appear after ratings are recorded.
								</p>
							)}
						</Card>
					</motion.div>
				)}

				{activeTab === "users" && (
					<motion.div
						key="users"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="grid grid-cols-1 xl:grid-cols-2 gap-6"
					>
						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Signed-in Admin Activity</h2>
							{currentUserStats ? (
								<div className="grid grid-cols-2 gap-4">
									<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
										<p className="text-sm text-muted-foreground">Ratings Submitted</p>
										<p className="mt-1 text-2xl font-bold text-foreground">
											{currentUserStats.totalRatings}
										</p>
									</div>
									<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
										<p className="text-sm text-muted-foreground">Selections Made</p>
										<p className="mt-1 text-2xl font-bold text-foreground">
											{currentUserStats.totalSelections}
										</p>
									</div>
									<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
										<p className="text-sm text-muted-foreground">Wins Logged</p>
										<p className="mt-1 text-2xl font-bold text-foreground">
											{currentUserStats.totalWins}
										</p>
									</div>
									<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
										<p className="text-sm text-muted-foreground">Win Rate</p>
										<p className="mt-1 text-2xl font-bold text-foreground">
											{currentUserStats.winRate.toFixed(1)}%
										</p>
									</div>
								</div>
							) : (
								<p className="text-muted-foreground">
									Current-user analytics will appear after this account records activity.
								</p>
							)}
						</Card>

						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">User Base Snapshot</h2>
							<div className="grid grid-cols-2 gap-4">
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Total Users</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{stats?.totalUsers || 0}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Total Ratings</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{stats?.totalRatings || 0}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Ratings Per User</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{ratingsPerUser.toFixed(1)}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Your Ratings Share</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{userRatingsShare.toFixed(1)}%
									</p>
								</div>
							</div>
							<p className="mt-4 text-sm text-muted-foreground">
								The current API exposes aggregate user metrics and the signed-in admin’s activity.
								Individual-user drilldowns still need a dedicated endpoint.
							</p>
						</Card>
					</motion.div>
				)}

				{activeTab === "analytics" && (
					<motion.div
						key="analytics"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="grid grid-cols-1 xl:grid-cols-2 gap-6"
					>
						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Top Rated Names</h2>
							{leaderboard.length > 0 ? (
								<div className="space-y-3">
									{leaderboard.map((entry, index) => (
										<div
											key={String(entry.name_id)}
											className="flex items-center justify-between rounded-lg border border-border/10 bg-foreground/5 p-4"
										>
											<div>
												<p className="font-semibold text-foreground">
													{index + 1}. {entry.name}
												</p>
												<p className="text-sm text-muted-foreground">
													{entry.total_ratings} ratings • {entry.wins} wins
												</p>
											</div>
											<p className="text-lg font-bold text-primary">
												{Math.round(entry.avg_rating)}
											</p>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground">No leaderboard data is available yet.</p>
							)}
						</Card>

						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Most Selected Names</h2>
							{mostSelectedNames.length > 0 ? (
								<div className="space-y-3">
									{mostSelectedNames.map((entry, index) => (
										<div
											key={String(entry.name_id)}
											className="flex items-center justify-between rounded-lg border border-border/10 bg-foreground/5 p-4"
										>
											<div>
												<p className="font-semibold text-foreground">
													{index + 1}. {entry.name}
												</p>
												<p className="text-sm text-muted-foreground">
													{entry.total_wins} wins • avg {Math.round(entry.avg_rating)}
												</p>
											</div>
											<p className="text-lg font-bold text-chart-2">{entry.times_selected}</p>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground">
									Selection analytics will appear once tournaments have activity.
								</p>
							)}
						</Card>

						<Card className="p-6 xl:col-span-2">
							<h2 className="text-2xl font-bold mb-4">Status Distribution</h2>
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Active Names</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{stats?.activeNames || 0}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Hidden Names</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{stats?.hiddenNames || 0}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Locked Names</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{stats?.lockedInNames || 0}
									</p>
								</div>
								<div className="rounded-lg border border-border/10 bg-foreground/5 p-4">
									<p className="text-sm text-muted-foreground">Total Ratings</p>
									<p className="mt-1 text-2xl font-bold text-foreground">
										{stats?.totalRatings || 0}
									</p>
								</div>
							</div>
						</Card>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
