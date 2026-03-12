/**
 * @module AdminDashboard
 * @description Comprehensive admin dashboard for managing names and viewing analytics
 */

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import {
	type AdminAuditEntry,
	adminAuditAPI,
	coreAPI,
	hiddenNamesAPI,
	statsAPI,
} from "@/services/supabase/api";
import { withSupabase } from "@/services/supabase/runtime";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import { Loading } from "@/shared/components/layout/Feedback";
import { Input } from "@/shared/components/layout/FormPrimitives";
import { isRpcSignatureError } from "@/shared/lib/errors";
import { BarChart3, Clock, Eye, EyeOff, Lock, User } from "@/shared/lib/icons";
import type { NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

interface AdminStats {
	totalNames: number;
	activeNames: number;
	hiddenNames: number;
	lockedInNames: number;
	totalUsers: number;
	activeTournaments: number;
	recentVotes: number;
}

interface NameWithStats extends NameItem {
	votes?: number;
	lastVoted?: string;
	popularityScore?: number;
}

interface SiteStatsSnapshot {
	totalUsers: number;
	recentVotes: number;
}

type AdminTab = "overview" | "names";
type AdminBulkAction = "hide" | "unhide" | "lock" | "unlock";

const tabs: { id: AdminTab; label: string }[] = [
	{ id: "overview", label: "Overview" },
	{ id: "names", label: "Names" },
];

function toFiniteNumber(value: unknown): number {
	const numeric = typeof value === "number" ? value : Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
}

function isNameLocked(name: NameWithStats): boolean {
	return Boolean(name.lockedIn || name.locked_in);
}

function mapAdminName(name: NameItem): NameWithStats {
	return {
		...name,
		votes: toFiniteNumber(name.wins) + toFiniteNumber(name.losses),
		lastVoted: undefined,
		popularityScore: toFiniteNumber(name.popularity_score),
	};
}

function toSiteStatsSnapshot(value: unknown): SiteStatsSnapshot {
	const source =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: ({} as Record<string, unknown>);

	return {
		totalUsers: toFiniteNumber(source.totalUsers ?? source.total_users),
		recentVotes: toFiniteNumber(
			source.totalRatings ?? source.total_ratings ?? source.recentVotes ?? source.recent_votes,
		),
	};
}

function buildAdminStats(names: NameWithStats[], siteStats: SiteStatsSnapshot): AdminStats {
	return {
		totalNames: names.length,
		activeNames: names.filter((name) => !name.isHidden && !isNameLocked(name)).length,
		hiddenNames: names.filter((name) => name.isHidden).length,
		lockedInNames: names.filter((name) => isNameLocked(name)).length,
		totalUsers: siteStats.totalUsers,
		activeTournaments: 0,
		recentVotes: siteStats.recentVotes,
	};
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return fallback;
}

function patchPendingIds(ids: Set<string>, id: string, isPending: boolean): Set<string> {
	const next = new Set(ids);
	if (isPending) {
		next.add(id);
	} else {
		next.delete(id);
	}
	return next;
}

function formatAdminActionLabel(operation: string): string {
	switch (operation) {
		case "HIDE":
			return "hid";
		case "UNHIDE":
			return "unhid";
		case "LOCK_IN":
			return "locked";
		case "UNLOCK_IN":
			return "unlocked";
		default:
			return operation.toLowerCase().split("_").join(" ");
	}
}

function getAuditTargetName(action: AdminAuditEntry): string {
	const nextName = action.newValues?.name;
	const previousName = action.oldValues?.name;

	return (
		action.targetName ??
		(typeof nextName === "string" ? nextName : null) ??
		(typeof previousName === "string" ? previousName : null) ??
		"Unknown name"
	);
}

function getAuditStateSummary(action: AdminAuditEntry): string | null {
	const previousHidden = action.oldValues?.is_hidden;
	const nextHidden = action.newValues?.is_hidden;
	const oldHidden = typeof previousHidden === "boolean" ? previousHidden : null;
	const newHidden = typeof nextHidden === "boolean" ? nextHidden : null;
	if (oldHidden !== null && newHidden !== null && oldHidden !== newHidden) {
		return `${oldHidden ? "Hidden" : "Visible"} -> ${newHidden ? "Hidden" : "Visible"}`;
	}

	const previousLocked = action.oldValues?.locked_in;
	const nextLocked = action.newValues?.locked_in;
	const oldLocked = typeof previousLocked === "boolean" ? previousLocked : null;
	const newLocked = typeof nextLocked === "boolean" ? nextLocked : null;
	if (oldLocked !== null && newLocked !== null && oldLocked !== newLocked) {
		return `${oldLocked ? "Locked" : "Unlocked"} -> ${newLocked ? "Locked" : "Unlocked"}`;
	}

	return null;
}

export function AdminDashboard() {
	const { user } = useAppStore();
	const toast = useToast();
	const adminName = user.name?.trim() ?? "";

	const [activeTab, setActiveTab] = useState<AdminTab>("overview");
	const [names, setNames] = useState<NameWithStats[]>([]);
	const [siteStats, setSiteStats] = useState<SiteStatsSnapshot>({
		totalUsers: 0,
		recentVotes: 0,
	});
	const [auditActions, setAuditActions] = useState<AdminAuditEntry[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden" | "locked">("all");
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [auditLoadError, setAuditLoadError] = useState<string | null>(null);
	const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
	const [pendingHiddenIds, setPendingHiddenIds] = useState<Set<string>>(new Set());
	const [pendingLockedIds, setPendingLockedIds] = useState<Set<string>>(new Set());
	const [pendingBulkAction, setPendingBulkAction] = useState<AdminBulkAction | null>(null);

	const stats = useMemo(() => buildAdminStats(names, siteStats), [names, siteStats]);
	const filteredNames = useMemo(() => {
		let filtered = names;

		if (filterStatus === "active") {
			filtered = filtered.filter((name) => !name.isHidden && !isNameLocked(name));
		} else if (filterStatus === "hidden") {
			filtered = filtered.filter((name) => name.isHidden);
		} else if (filterStatus === "locked") {
			filtered = filtered.filter((name) => isNameLocked(name));
		}

		const normalizedSearch = searchTerm.trim().toLowerCase();
		if (!normalizedSearch) {
			return filtered;
		}

		return filtered.filter(
			(name) =>
				name.name.toLowerCase().includes(normalizedSearch) ||
				name.description?.toLowerCase().includes(normalizedSearch),
		);
	}, [filterStatus, names, searchTerm]);
	const topVisibleNames = useMemo(
		() =>
			[...names]
				.filter((name) => !name.isHidden)
				.sort(
					(a, b) =>
						(b.popularityScore ?? b.votes ?? 0) - (a.popularityScore ?? a.votes ?? 0) ||
						(b.votes ?? 0) - (a.votes ?? 0),
				)
				.slice(0, 5),
		[names],
	);
	const attentionNames = useMemo(
		() =>
			[...names]
				.filter((name) => name.isHidden || isNameLocked(name))
				.sort(
					(a, b) =>
						Number(Boolean(b.isHidden)) - Number(Boolean(a.isHidden)) ||
						Number(isNameLocked(b)) - Number(isNameLocked(a)) ||
						(b.popularityScore ?? b.votes ?? 0) - (a.popularityScore ?? a.votes ?? 0),
				)
				.slice(0, 5),
		[names],
	);

	const updateNameLocally = useCallback(
		(nameId: string, updater: (name: NameWithStats) => NameWithStats) => {
			setNames((current) =>
				current.map((name) => (String(name.id) === nameId ? updater(name) : name)),
			);
		},
		[],
	);

	const loadAdminData = useCallback(
		async (reason: "initial" | "refresh" = "initial") => {
			if (reason === "initial") {
				setIsLoading(true);
			} else {
				setIsRefreshing(true);
			}

			try {
				const [namesResult, siteStatsResult, auditResult] = await Promise.all([
					coreAPI.getTrendingNamesResult(true),
					statsAPI.getSiteStatsResult(),
					adminAuditAPI.getRecentActionsResult(8),
				]);
				const nextNames = namesResult.data.map((name) => mapAdminName(name));
				const nextErrors = [namesResult.error, siteStatsResult.error].filter(
					(message): message is string => Boolean(message),
				);

				setNames(nextNames);
				setAuditActions(auditResult.data);
				setAuditLoadError(auditResult.error);
				setSelectedNames((current) => {
					const nextIds = new Set(nextNames.map((name) => String(name.id)));
					return new Set([...current].filter((id) => nextIds.has(id)));
				});
				setSiteStats(toSiteStatsSnapshot(siteStatsResult.data));
				setLoadError(nextErrors.length > 0 ? nextErrors.join(" | ") : null);

				if (nextErrors.length > 0) {
					const detail = nextErrors.join(" | ");
					if (nextNames.length === 0) {
						toast.showError(`Could not load admin data: ${detail}`);
					} else {
						toast.showWarning(`Admin data is partially unavailable: ${detail}`);
					}
				}
			} catch (error) {
				const detail = getErrorMessage(error, "Failed to load admin dashboard data.");
				setLoadError(detail);
				toast.showError(`Could not load admin data: ${detail}`);
			} finally {
				if (reason === "initial") {
					setIsLoading(false);
				} else {
					setIsRefreshing(false);
				}
			}
		},
		[toast],
	);

	useEffect(() => {
		void loadAdminData();
	}, [loadAdminData]);

	const handleToggleHidden = useCallback(
		async (nameId: string | number, isCurrentlyHidden: boolean, announce: boolean = true) => {
			const id = String(nameId);
			if (!adminName) {
				toast.showError("Admin actions require a valid user session. Please log in again.");
				return false;
			}

			setPendingHiddenIds((current) => patchPendingIds(current, id, true));

			try {
				const result = isCurrentlyHidden
					? await hiddenNamesAPI.unhideName(adminName, id)
					: await hiddenNamesAPI.hideName(adminName, id);
				if (!result.success) {
					throw new Error(result.error || "Failed to update hidden status");
				}

				updateNameLocally(id, (name) => ({
					...name,
					isHidden: !isCurrentlyHidden,
				}));

				if (announce) {
					toast.showSuccess(isCurrentlyHidden ? "Name is visible again." : "Name is now hidden.");
				}
				return true;
			} catch (error) {
				const detail = getErrorMessage(error, "Unknown error");
				console.error("Failed to toggle hidden status:", error);
				if (announce) {
					toast.showError(`Could not update hidden status: ${detail}`);
				}
				return false;
			} finally {
				setPendingHiddenIds((current) => patchPendingIds(current, id, false));
			}
		},
		[adminName, toast, updateNameLocally],
	);

	const handleToggleLocked = useCallback(
		async (nameId: string | number, isCurrentlyLocked: boolean, announce: boolean = true) => {
			const id = String(nameId);
			if (!adminName) {
				toast.showError("Admin actions require a valid user session. Please log in again.");
				return false;
			}

			setPendingLockedIds((current) => patchPendingIds(current, id, true));

			try {
				const result = await withSupabase(async (client) => {
					try {
						await client.rpc("set_user_context", { user_name_param: adminName });
					} catch {
						/* ignore */
					}

					const canonicalArgs = {
						p_name_id: id,
						p_locked_in: !isCurrentlyLocked,
					};
					let rpcResult = await client.rpc("toggle_name_locked_in" as any, canonicalArgs);

					if (rpcResult.error && isRpcSignatureError(rpcResult.error.message || "")) {
						rpcResult = await client.rpc("toggle_name_locked_in" as any, {
							...canonicalArgs,
							p_user_name: adminName,
						});
					}

					if (rpcResult.error) {
						throw new Error(rpcResult.error.message || "Failed to toggle locked status");
					}
					if (rpcResult.data !== true) {
						throw new Error("Failed to toggle locked status");
					}
					return true;
				}, null);

				if (!result) {
					throw new Error("Admin write client is unavailable");
				}

				updateNameLocally(id, (name) => ({
					...name,
					lockedIn: !isCurrentlyLocked,
					locked_in: !isCurrentlyLocked,
				}));

				if (announce) {
					toast.showSuccess(isCurrentlyLocked ? "Name unlocked." : "Name locked in.");
				}
				return true;
			} catch (error) {
				const detail = getErrorMessage(error, "Unknown error");
				console.error("Failed to toggle locked status:", error);
				if (announce) {
					toast.showError(`Could not update lock state: ${detail}`);
				}
				return false;
			} finally {
				setPendingLockedIds((current) => patchPendingIds(current, id, false));
			}
		},
		[adminName, toast, updateNameLocally],
	);

	const handleBulkAction = useCallback(
		async (action: AdminBulkAction) => {
			if (selectedNames.size === 0) {
				toast.showInfo("Select at least one name first.");
				return;
			}

			const selectedItems = names.filter((name) => selectedNames.has(String(name.id)));
			const targetItems = selectedItems.filter((name) => {
				if (action === "hide") {
					return !name.isHidden;
				}
				if (action === "unhide") {
					return Boolean(name.isHidden);
				}
				if (action === "lock") {
					return !isNameLocked(name);
				}
				return isNameLocked(name);
			});

			if (targetItems.length === 0) {
				toast.showInfo("The selected names already match that state.");
				return;
			}

			setPendingBulkAction(action);
			let successCount = 0;

			try {
				for (const name of targetItems) {
					const didSucceed =
						action === "hide" || action === "unhide"
							? await handleToggleHidden(name.id, Boolean(name.isHidden), false)
							: await handleToggleLocked(name.id, isNameLocked(name), false);
					if (didSucceed) {
						successCount += 1;
					}
				}

				const failureCount = targetItems.length - successCount;
				if (successCount > 0 && failureCount === 0) {
					setSelectedNames(new Set());
					toast.showSuccess(
						`${action === "hide" ? "Hid" : action === "unhide" ? "Unhid" : action === "lock" ? "Locked" : "Unlocked"} ${successCount} ${successCount === 1 ? "name" : "names"}.`,
					);
					return;
				}

				if (successCount > 0) {
					toast.showWarning(
						`${successCount} ${successCount === 1 ? "name was" : "names were"} updated, ${failureCount} failed.`,
					);
					return;
				}

				toast.showError("No selected names were updated.");
			} finally {
				setPendingBulkAction(null);
			}
		},
		[handleToggleHidden, handleToggleLocked, names, selectedNames, toast],
	);

	const hasPendingWrites =
		pendingBulkAction !== null || pendingHiddenIds.size > 0 || pendingLockedIds.size > 0;
	const hasActiveFilters = searchTerm.trim().length > 0 || filterStatus !== "all";
	const hasHardLoadFailure = Boolean(loadError) && names.length === 0;

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loading variant="spinner" text="Loading admin dashboard..." />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground p-6">
			<div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-4xl font-bold text-transparent">
						Admin Dashboard
					</h1>
					<p className="text-muted-foreground">Manage names and monitor site activity</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						onClick={() => void loadAdminData("refresh")}
						variant="outline"
						size="small"
						loading={isRefreshing}
						disabled={isRefreshing || hasPendingWrites}
					>
						Refresh data
					</Button>
				</div>
			</div>

			{loadError && (
				<Card className="mb-6 border-destructive/30 bg-destructive/10 p-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="text-sm font-semibold text-destructive">Latest refresh failed</h2>
							<p className="text-sm text-muted-foreground">{loadError}</p>
						</div>
						<Button
							onClick={() => void loadAdminData("refresh")}
							variant="outline"
							size="small"
							loading={isRefreshing}
							disabled={isRefreshing || hasPendingWrites}
						>
							Try again
						</Button>
					</div>
				</Card>
			)}

			<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
				<Card className="border-primary/30 bg-primary/10 p-6">
					<div className="mb-2 flex items-center gap-3">
						<BarChart3 className="text-primary" size={24} />
						<h3 className="text-lg font-semibold text-primary">Total Names</h3>
					</div>
					<p className="text-3xl font-bold text-foreground">{stats.totalNames}</p>
				</Card>

				<Card className="border-chart-2/30 bg-chart-2/10 p-6">
					<div className="mb-2 flex items-center gap-3">
						<Eye className="text-chart-2" size={24} />
						<h3 className="text-lg font-semibold text-chart-2">Active</h3>
					</div>
					<p className="text-3xl font-bold text-foreground">{stats.activeNames}</p>
				</Card>

				<Card className="border-chart-4/30 bg-chart-4/10 p-6">
					<div className="mb-2 flex items-center gap-3">
						<Lock className="text-chart-4" size={24} />
						<h3 className="text-lg font-semibold text-chart-4">Locked In</h3>
					</div>
					<p className="text-3xl font-bold text-foreground">{stats.lockedInNames}</p>
				</Card>

				<Card className="border-destructive/30 bg-destructive/10 p-6">
					<div className="mb-2 flex items-center gap-3">
						<EyeOff className="text-destructive" size={24} />
						<h3 className="text-lg font-semibold text-destructive">Hidden</h3>
					</div>
					<p className="text-3xl font-bold text-foreground">{stats.hiddenNames}</p>
				</Card>

				<Card className="border-accent/30 bg-accent/10 p-6">
					<div className="mb-2 flex items-center gap-3">
						<User className="text-accent" size={24} />
						<h3 className="text-lg font-semibold text-accent">Users</h3>
					</div>
					<p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
				</Card>

				<Card className="border-chart-1/30 bg-chart-1/10 p-6">
					<div className="mb-2 flex items-center gap-3">
						<Clock className="text-chart-1" size={24} />
						<h3 className="text-lg font-semibold text-chart-1">Recent Votes</h3>
					</div>
					<p className="text-3xl font-bold text-foreground">{stats.recentVotes}</p>
				</Card>
			</div>

			<div className="mb-6 flex gap-2 border-b border-border/10">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`px-4 py-2 font-medium transition-colors ${
							activeTab === tab.id
								? "border-b-2 border-primary text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
						type="button"
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
						<div className="mb-6 flex flex-col gap-4 lg:flex-row">
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
									onChange={(event) =>
										setFilterStatus(event.target.value as "all" | "active" | "hidden" | "locked")
									}
									className="rounded-lg border border-border/20 bg-foreground/10 px-4 py-2 text-foreground"
									disabled={hasPendingWrites}
								>
									<option value="all">All Names</option>
									<option value="active">Active</option>
									<option value="hidden">Hidden</option>
									<option value="locked">Locked In</option>
								</select>
							</div>
						</div>

						{selectedNames.size > 0 && (
							<div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-4">
								<p className="mb-2 text-sm text-primary">{selectedNames.size} names selected</p>
								<div className="flex flex-wrap gap-2">
									<Button
										onClick={() => void handleBulkAction("hide")}
										size="small"
										loading={pendingBulkAction === "hide"}
										disabled={hasPendingWrites && pendingBulkAction !== "hide"}
									>
										<EyeOff size={14} /> Hide
									</Button>
									<Button
										onClick={() => void handleBulkAction("unhide")}
										size="small"
										loading={pendingBulkAction === "unhide"}
										disabled={hasPendingWrites && pendingBulkAction !== "unhide"}
									>
										<Eye size={14} /> Unhide
									</Button>
									<Button
										onClick={() => void handleBulkAction("lock")}
										size="small"
										loading={pendingBulkAction === "lock"}
										disabled={hasPendingWrites && pendingBulkAction !== "lock"}
									>
										<Lock size={14} /> Lock
									</Button>
									<Button
										onClick={() => void handleBulkAction("unlock")}
										size="small"
										loading={pendingBulkAction === "unlock"}
										disabled={hasPendingWrites && pendingBulkAction !== "unlock"}
									>
										<Lock size={14} /> Unlock
									</Button>
									<Button
										onClick={() => setSelectedNames(new Set())}
										variant="ghost"
										size="small"
										disabled={hasPendingWrites}
									>
										Clear
									</Button>
								</div>
							</div>
						)}

						{filteredNames.length === 0 ? (
							<Card className="p-8 text-center">
								<h2 className="text-lg font-semibold text-foreground">
									{hasHardLoadFailure
										? "Could not load names"
										: hasActiveFilters
											? "No names match this filter"
											: "No names available"}
								</h2>
								<p className="mt-2 text-sm text-muted-foreground">
									{hasHardLoadFailure
										? loadError
										: hasActiveFilters
											? "Try a different search or status filter."
											: "Refresh the dashboard after new names are added."}
								</p>
								{hasHardLoadFailure && (
									<div className="mt-4">
										<Button
											onClick={() => void loadAdminData("refresh")}
											variant="outline"
											size="small"
											loading={isRefreshing}
											disabled={isRefreshing || hasPendingWrites}
										>
											Try again
										</Button>
									</div>
								)}
							</Card>
						) : (
							<div className="space-y-2">
								{filteredNames.map((name) => {
									const id = String(name.id);
									const isHiddenPending = pendingHiddenIds.has(id);
									const isLockedPending = pendingLockedIds.has(id);
									const isRowBusy =
										isHiddenPending || isLockedPending || pendingBulkAction !== null;

									return (
										<Card
											key={name.id}
											className={`p-4 transition-opacity ${isRowBusy ? "opacity-70" : ""}`}
										>
											<div className="flex items-center justify-between gap-4">
												<div className="flex items-center gap-4">
													<input
														type="checkbox"
														checked={selectedNames.has(id)}
														onChange={(event) => {
															setSelectedNames((current) => {
																const next = new Set(current);
																if (event.target.checked) {
																	next.add(id);
																} else {
																	next.delete(id);
																}
																return next;
															});
														}}
														className="h-4 w-4"
														disabled={isRowBusy}
													/>

													<div>
														<h3 className="font-semibold text-foreground">{name.name}</h3>
														{name.description && (
															<p className="text-sm text-muted-foreground">{name.description}</p>
														)}
														<div className="mt-1 flex gap-4 text-xs text-muted-foreground/60">
															<span>Votes: {name.votes}</span>
															<span>Score: {name.popularityScore?.toFixed(1)}</span>
															{name.lastVoted && (
																<span>Last: {new Date(name.lastVoted).toLocaleDateString()}</span>
															)}
														</div>
													</div>
												</div>

												<div className="flex items-center gap-2">
													{isNameLocked(name) && (
														<div className="flex items-center gap-1 rounded border border-chart-4/30 bg-chart-4/20 px-2 py-1 text-xs text-chart-4">
															<Lock size={12} /> Locked
														</div>
													)}
													{name.isHidden && (
														<div className="flex items-center gap-1 rounded border border-destructive/30 bg-destructive/20 px-2 py-1 text-xs text-destructive">
															<EyeOff size={12} /> Hidden
														</div>
													)}

													<div className="flex gap-1">
														<Button
															onClick={() =>
																void handleToggleHidden(name.id, Boolean(name.isHidden))
															}
															variant="ghost"
															size="small"
															loading={isHiddenPending}
															disabled={isRowBusy && !isHiddenPending}
															aria-label={
																name.isHidden ? `Unhide ${name.name}` : `Hide ${name.name}`
															}
														>
															{name.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
														</Button>
														<Button
															onClick={() => void handleToggleLocked(name.id, isNameLocked(name))}
															variant="ghost"
															size="small"
															loading={isLockedPending}
															disabled={isRowBusy && !isLockedPending}
															aria-label={
																isNameLocked(name) ? `Unlock ${name.name}` : `Lock ${name.name}`
															}
														>
															<Lock size={14} />
														</Button>
													</div>
												</div>
											</div>
										</Card>
									);
								})}
							</div>
						)}
					</motion.div>
				)}

				{activeTab === "overview" && (
					<motion.div
						key="overview"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<Card className="p-6">
							<div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<h2 className="text-2xl font-bold text-foreground">Operations Snapshot</h2>
									<p className="text-sm text-muted-foreground">
										{loadError
											? "Some admin sources are unavailable. The dashboard is showing the latest data it could load."
											: "Moderation, visibility, health checks, and recent admin actions are all live from this screen."}
									</p>
								</div>
								<Button onClick={() => setActiveTab("names")} size="small">
									Review Names
								</Button>
							</div>

							<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,1fr,1fr]">
								<div className="rounded-lg border border-border/20 bg-foreground/5 p-5">
									<p className="text-sm text-muted-foreground">Current operator</p>
									<p className="mt-2 text-2xl font-semibold text-foreground">
										{adminName || "Unknown session"}
									</p>
									<p className="mt-2 text-sm text-muted-foreground">
										{adminName
											? "Bulk actions and visibility changes are available."
											: "Admin writes stay disabled until a valid user session is available."}
									</p>

									<div className="mt-5 grid grid-cols-2 gap-3 text-sm">
										<div className="rounded-lg border border-border/20 bg-background/70 p-3">
											<p className="text-muted-foreground">Visible</p>
											<p className="mt-1 text-xl font-semibold text-foreground">
												{stats.activeNames}
											</p>
										</div>
										<div className="rounded-lg border border-border/20 bg-background/70 p-3">
											<p className="text-muted-foreground">Selected</p>
											<p className="mt-1 text-xl font-semibold text-foreground">
												{selectedNames.size}
											</p>
										</div>
										<div className="rounded-lg border border-border/20 bg-background/70 p-3">
											<p className="text-muted-foreground">Hidden</p>
											<p className="mt-1 text-xl font-semibold text-foreground">
												{stats.hiddenNames}
											</p>
										</div>
										<div className="rounded-lg border border-border/20 bg-background/70 p-3">
											<p className="text-muted-foreground">Locked</p>
											<p className="mt-1 text-xl font-semibold text-foreground">
												{stats.lockedInNames}
											</p>
										</div>
									</div>
								</div>

								<div className="rounded-lg border border-border/20 bg-foreground/5 p-5">
									<h3 className="text-lg font-semibold text-foreground">Top Right Now</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										Current leaders by popularity score and vote volume.
									</p>
									<div className="mt-4 space-y-3">
										{topVisibleNames.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No visible names are available yet.
											</p>
										) : (
											topVisibleNames.map((name, index) => (
												<div
													key={name.id}
													className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-background/70 p-3"
												>
													<div>
														<p className="font-medium text-foreground">
															{index + 1}. {name.name}
														</p>
														<p className="text-xs text-muted-foreground">{name.votes ?? 0} votes</p>
													</div>
													<p className="text-sm font-semibold text-primary">
														{(name.popularityScore ?? 0).toFixed(1)}
													</p>
												</div>
											))
										)}
									</div>
								</div>

								<div className="rounded-lg border border-border/20 bg-foreground/5 p-5">
									<h3 className="text-lg font-semibold text-foreground">Needs Attention</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										Hidden or locked names that may need a moderation pass.
									</p>
									<div className="mt-4 space-y-3">
										{attentionNames.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No hidden or locked names need review right now.
											</p>
										) : (
											attentionNames.map((name) => (
												<div
													key={name.id}
													className="rounded-lg border border-border/20 bg-background/70 p-3"
												>
													<p className="font-medium text-foreground">{name.name}</p>
													<p className="mt-1 text-xs text-muted-foreground">
														{[name.isHidden ? "Hidden" : null, isNameLocked(name) ? "Locked" : null]
															.filter(Boolean)
															.join(" • ")}
													</p>
												</div>
											))
										)}
									</div>
								</div>
							</div>

							<div className="mt-4 rounded-lg border border-border/20 bg-foreground/5 p-5">
								<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
									<div>
										<h3 className="text-lg font-semibold text-foreground">Recent Admin Actions</h3>
										<p className="text-sm text-muted-foreground">
											Latest hide, unhide, lock, and unlock operations recorded by the backend.
										</p>
									</div>
									<p className="text-xs text-muted-foreground">
										Showing up to {auditActions.length || 8} recent events
									</p>
								</div>

								{auditLoadError ? (
									<div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
										<p className="text-sm font-medium text-destructive">Audit log unavailable</p>
										<p className="mt-1 text-sm text-muted-foreground">{auditLoadError}</p>
									</div>
								) : auditActions.length === 0 ? (
									<div className="mt-4 rounded-lg border border-border/20 bg-background/70 p-4">
										<p className="text-sm text-muted-foreground">
											No admin actions have been recorded yet.
										</p>
									</div>
								) : (
									<div className="mt-4 space-y-3">
										{auditActions.map((action) => {
											const stateSummary = getAuditStateSummary(action);

											return (
												<div
													key={action.id}
													className="rounded-lg border border-border/20 bg-background/70 p-4"
												>
													<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
														<div>
															<p className="font-medium text-foreground">
																{action.userName || "Unknown admin"}{" "}
																{formatAdminActionLabel(action.operation)}{" "}
																{getAuditTargetName(action)}
															</p>
															<p className="text-xs text-muted-foreground">
																{stateSummary || action.operation.split("_").join(" ")}
															</p>
														</div>
														<p className="text-xs text-muted-foreground">
															{action.createdAt
																? new Date(action.createdAt).toLocaleString()
																: "Unknown time"}
														</p>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</Card>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
