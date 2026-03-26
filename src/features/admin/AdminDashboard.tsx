/**
 * @module AdminDashboard
 * @description Comprehensive admin dashboard for managing names and viewing analytics
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import { toggleNameHidden, toggleNameLocked } from "@/features/names/mutations";
import { namesQueryKeys, namesQueryOptions } from "@/features/names/queries";
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
import { BarChart3, Eye, EyeOff, Loader2, Lock } from "@/shared/lib/icons";
import { imagesAPI, statsAPI } from "@/shared/services/supabase/api";
import type { NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

type DashboardTab = "overview" | "names" | "users" | "analytics";
type NameFilter = "all" | "active" | "hidden" | "locked";
type BulkAction = "hide" | "unhide" | "lock" | "unlock";

type ToggleOptions = {
	skipRefresh?: boolean;
};

interface AdminStats {
	totalNames: number;
	activeNames: number;
	hiddenNames: number;
	lockedInNames: number;
	totalUsers: number;
	recentVotes: number;
}

interface NameWithStats extends NameItem {
	votes?: number;
	lastVoted?: string;
	popularityScore?: number;
}

interface SiteStatsLike {
	totalUsers?: unknown;
	totalRatings?: unknown;
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
	const queryClient = useQueryClient();
	const actorName = user.name.trim();

	const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<NameFilter>("all");
	const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
	const namesQuery = useQuery(namesQueryOptions(true));
	const siteStatsQuery = useQuery({
		queryKey: ["site-stats"],
		queryFn: () => statsAPI.getSiteStats(),
		staleTime: 30_000,
	});
	const names = useMemo(
		() => (namesQuery.data?.names ?? []).map(mapNameToDisplay),
		[namesQuery.data?.names],
	);
	const stats = useMemo(
		() => buildAdminStats(names, siteStatsQuery.data),
		[names, siteStatsQuery.data],
	);
	const isLoading = namesQuery.isPending || siteStatsQuery.isPending;

	const toggleHiddenMutation = useMutation({
		mutationFn: ({
			nameId,
			isCurrentlyHidden,
		}: {
			nameId: string | number;
			isCurrentlyHidden: boolean;
		}) => toggleNameHidden({ nameId, isCurrentlyHidden, userName: actorName }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: namesQueryKeys.all });
		},
	});

	const toggleLockedMutation = useMutation({
		mutationFn: ({
			nameId,
			isCurrentlyLocked,
		}: {
			nameId: string | number;
			isCurrentlyLocked: boolean;
		}) => toggleNameLocked({ nameId, isCurrentlyLocked, userName: actorName }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: namesQueryKeys.all });
		},
	});

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
				if (isHidden) {
					await toggleHiddenMutation.mutateAsync({ nameId: idStr, isCurrentlyHidden: true });
				} else {
					await toggleHiddenMutation.mutateAsync({ nameId: idStr, isCurrentlyHidden: false });
				}

				if (!options.skipRefresh) {
					await queryClient.invalidateQueries({ queryKey: namesQueryKeys.all });
				}
			} catch (error) {
				console.error("Failed to toggle hidden status:", error);
			}
		},
		[queryClient, toggleHiddenMutation],
	);

	const handleToggleLocked = useCallback(
		async (nameId: string | number, isLocked: boolean, options: ToggleOptions = {}) => {
			try {
				const idStr = String(nameId);
				await toggleLockedMutation.mutateAsync({
					nameId: idStr,
					isCurrentlyLocked: isLocked,
				});

				if (!options.skipRefresh) {
					await queryClient.invalidateQueries({ queryKey: namesQueryKeys.all });
				}
			} catch (error) {
				console.error("Failed to toggle locked status:", error);
			}
		},
		[queryClient, toggleLockedMutation],
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
				await queryClient.invalidateQueries({ queryKey: namesQueryKeys.all });
				setSelectedNames(new Set());
			} catch (error) {
				console.error("Failed to perform bulk action:", error);
			}
		},
		[handleToggleHidden, handleToggleLocked, nameById, queryClient, selectedNames],
	);

	const handleImageUpload = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}

			try {
				const result = await imagesAPI.upload(file, actorName);
				if (result.success) {
					console.log("Image uploaded successfully:", result.path);
				} else {
					console.error("Upload failed:", result.error);
				}
			} catch (error) {
				console.error("Upload error:", error);
			}
		},
		[actorName],
	);

	const handleSelectionChange = useCallback((nameId: string, checked: boolean) => {
		setSelectedNames((prevSelectedNames) => {
			const next = new Set(prevSelectedNames);
			if (checked) {
				next.add(nameId);
			} else {
				next.delete(nameId);
			}
			return next;
		});
	}, []);

	const handleTabChange = useCallback((tab: DashboardTab) => {
		setActiveTab(tab);
	}, []);

	const handleFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
		const option = FILTER_OPTIONS.find((item) => item.value === event.target.value);
		if (option) {
			setFilterStatus(option.value);
		}
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loading variant="spinner" text="Loading admin dashboard..." />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground p-3 sm:p-6">
			<div className="mb-4 sm:mb-8">
				<h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
					Admin Dashboard
				</h1>
				<p className="text-sm text-muted-foreground">Manage names and monitor activity</p>
			</div>

			{stats && (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
					<div className="p-3 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
							<BarChart3 className="text-primary" size={18} />
							<h3 className="text-sm sm:text-lg font-semibold text-primary">Total</h3>
						</div>
						<p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalNames}</p>
					</div>

					<div className="p-3 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
							<Eye className="text-chart-2" size={18} />
							<h3 className="text-sm sm:text-lg font-semibold text-chart-2">Active</h3>
						</div>
						<p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.activeNames}</p>
					</div>

					<div className="p-3 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
							<Lock className="text-chart-4" size={18} />
							<h3 className="text-sm sm:text-lg font-semibold text-chart-4">Locked</h3>
						</div>
						<p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.lockedInNames}</p>
					</div>

					<div className="p-3 sm:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
							<EyeOff className="text-destructive" size={18} />
							<h3 className="text-sm sm:text-lg font-semibold text-destructive">Hidden</h3>
						</div>
						<p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.hiddenNames}</p>
					</div>
				</div>
			)}

			{/* Tabs - horizontal scroll on mobile */}
			<div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-border/10 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
				{ADMIN_TABS.map((tab) => (
					<button
						key={tab.id}
						onClick={() => handleTabChange(tab.id)}
						className={`px-3 sm:px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
							activeTab === tab.id
								? "text-foreground border-b-2 border-primary"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			<AnimatePresence mode="wait">
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
									onChange={handleFilterChange}
									className="px-4 py-2 bg-foreground/10 border border-border/20 rounded-lg text-foreground"
								>
									{FILTER_OPTIONS.map((option) => (
										<option value={option.value} key={option.value}>
											{option.label}
										</option>
									))}
								</select>

								<Button
									onClick={() => {
										void Promise.all([namesQuery.refetch(), siteStatsQuery.refetch()]);
									}}
									variant="ghost"
									size="small"
								>
									<Loader2 size={16} />
								</Button>
							</div>
						</div>

						{selectedNames.size > 0 && (
							<div className="mb-4 py-3 sm:py-4 border-y border-border/10">
								<p className="text-sm text-primary mb-2">{selectedNames.size} selected</p>
								<div className="flex flex-wrap gap-2">
									<Button onClick={() => void handleBulkAction("hide")} size="small">
										<EyeOff size={14} /> Hide
									</Button>
									<Button onClick={() => void handleBulkAction("unhide")} size="small">
										<Eye size={14} /> Unhide
									</Button>
									<Button onClick={() => void handleBulkAction("lock")} size="small">
										<Lock size={14} /> Lock
									</Button>
									<Button onClick={() => void handleBulkAction("unlock")} size="small">
										<Lock size={14} /> Unlock
									</Button>
									<Button onClick={() => setSelectedNames(new Set())} variant="ghost" size="small">
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
									<div key={name.id} className="py-3 sm:py-4">
										<div className="flex items-start sm:items-center justify-between gap-2">
											<div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
												<input
													type="checkbox"
													checked={selectedNames.has(nameId)}
													onChange={(event) => handleSelectionChange(nameId, event.target.checked)}
													className="w-4 h-4 mt-1 sm:mt-0 shrink-0"
												/>
												<div className="min-w-0">
													<div className="flex items-center gap-2 flex-wrap">
														<h3 className="font-semibold text-foreground text-sm sm:text-base">
															{name.name}
														</h3>
														{locked && (
															<span className="text-[10px] text-chart-4 font-semibold inline-flex items-center gap-0.5">
																<Lock size={10} /> Locked
															</span>
														)}
														{hidden && (
															<span className="text-[10px] text-destructive font-semibold inline-flex items-center gap-0.5">
																<EyeOff size={10} /> Hidden
															</span>
														)}
													</div>
													{name.description && (
														<p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
															{name.description}
														</p>
													)}
													<div className="flex gap-3 mt-0.5 text-[10px] sm:text-xs text-muted-foreground/60">
														<span>Votes: {name.votes}</span>
														<span>
															Score:{" "}
															{name.popularityScore == null ? "?" : name.popularityScore.toFixed(1)}
														</span>
													</div>
												</div>
											</div>

											<div className="flex items-center gap-1 shrink-0">
												<Button
													onClick={() => void handleToggleHidden(name.id, hidden)}
													variant="ghost"
													size="small"
												>
													{hidden ? <Eye size={14} /> : <EyeOff size={14} />}
												</Button>
												<Button
													onClick={() => void handleToggleLocked(name.id, locked)}
													variant="ghost"
													size="small"
													aria-label={locked ? "Unlock name" : "Lock name"}
												>
													<Lock size={14} />
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</motion.div>
				)}

				{activeTab === "overview" && (
					<motion.div
						key="overview"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<div className="p-6">
							<h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h3 className="text-lg font-semibold mb-2">Image Upload</h3>
									<input
										type="file"
										accept="image/*"
										onChange={handleImageUpload}
										className="w-full p-2 bg-foreground/10 border border-border/20 rounded"
									/>
								</div>
								<div>
									<h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
									<p className="text-muted-foreground">Activity tracking coming soon...</p>
								</div>
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === "users" && (
					<motion.div
						key="users"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<div className="p-6">
							<h2 className="text-2xl font-bold mb-4">User Analytics</h2>
							<p className="text-muted-foreground">User tracking and analytics coming soon...</p>
						</div>
					</motion.div>
				)}

				{activeTab === "analytics" && (
					<motion.div
						key="analytics"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<div className="p-6">
							<h2 className="text-2xl font-bold mb-4">Site Analytics</h2>
							<p className="text-muted-foreground">Advanced analytics coming soon...</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
