/**
 * @module AdminDashboard
 * @description Comprehensive admin dashboard for managing names and viewing analytics
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { coreAPI, hiddenNamesAPI, imagesAPI, statsAPI } from "@/services/supabase/api";
import { withSupabase } from "@/services/supabase/runtime";
import Button from "@/shared/components/layout/Button";
import { Loading } from "@/shared/components/layout/Feedback";
import { Input } from "@/shared/components/layout/FormPrimitives";
import { BarChart3, Eye, EyeOff, Loader2, Lock } from "@/shared/lib/icons";
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

function isRpcSignatureError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("function") &&
		(normalized.includes("does not exist") ||
			normalized.includes("no function matches") ||
			normalized.includes("could not find"))
	);
}

export function AdminDashboard() {
	const { user } = useAppStore();
	const [activeTab, setActiveTab] = useState<"overview" | "names" | "users" | "analytics">(
		"overview",
	);
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [names, setNames] = useState<NameWithStats[]>([]);
	const [filteredNames, setFilteredNames] = useState<NameWithStats[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden" | "locked">("all");
	const [isLoading, setIsLoading] = useState(true);
	const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

	// Load admin stats and names
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadAdminData is stable
	useEffect(() => {
		loadAdminData();
	}, []);

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
			// Load all names with admin visibility
			const [allNames, siteStats] = await Promise.all([
				coreAPI.getTrendingNames(true),
				statsAPI.getSiteStats(),
			]);

			// Load stats (we'll simulate some for now)
			const adminStats: AdminStats = {
				totalNames: allNames.length,
				activeNames: allNames.filter((n) => !n.isHidden && !(n.lockedIn || n.locked_in)).length,
				hiddenNames: allNames.filter((n) => n.isHidden).length,
				lockedInNames: allNames.filter((n) => n.lockedIn || n.locked_in).length,
				totalUsers: siteStats?.totalUsers || 0,
				activeTournaments: 0, // TODO: Implement tournament count
				recentVotes: siteStats?.totalRatings || 0,
			};

			// Derive stats from real name data instead of mock/random placeholders
			const namesWithStats: NameWithStats[] = allNames.map((name) => ({
				...name,
				votes: Number((name.wins || 0) + (name.losses || 0)),
				lastVoted: undefined,
				popularityScore: Number(name.popularity_score || 0),
			}));

			setStats(adminStats);
			setNames(namesWithStats);
		} catch (error) {
			console.error("Failed to load admin data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleToggleHidden = async (nameId: string | number, isHidden: boolean) => {
		try {
			const idStr = String(nameId);
			if (isHidden) {
				const result = await hiddenNamesAPI.unhideName(user.name, idStr);
				if (!result.success) {
					throw new Error(result.error || "Failed to unhide name");
				}
			} else {
				const result = await hiddenNamesAPI.hideName(user.name, idStr);
				if (!result.success) {
					throw new Error(result.error || "Failed to hide name");
				}
			}
			await loadAdminData();
		} catch (error) {
			console.error("Failed to toggle hidden status:", error);
		}
	};

	const handleToggleLocked = async (nameId: string | number, isLocked: boolean) => {
		try {
			const idStr = String(nameId);
			// Call the admin function to toggle locked_in status
			await withSupabase(async (client) => {
				await client.rpc("set_user_context", { user_name_param: user.name });
				const canonicalArgs = {
					p_name_id: idStr,
					p_locked_in: !isLocked,
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
			for (const nameId of selectedNames) {
				if (action === "hide" || action === "unhide") {
					const name = names.find((n) => n.id === nameId);
					if (name) {
						await handleToggleHidden(nameId, name.isHidden || false);
					}
				} else if (action === "lock" || action === "unlock") {
					const name = names.find((n) => n.id === nameId);
					if (name) {
						await handleToggleLocked(nameId, name.lockedIn || name.locked_in || false);
					}
				}
			}
			setSelectedNames(new Set());
		} catch (error) {
			console.error("Failed to perform bulk action:", error);
		}
	};

	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		try {
			const result = await imagesAPI.upload(file, user.name);
			if (result.success) {
				console.log("Image uploaded successfully:", result.path);
			} else {
				console.error("Upload failed:", result.error);
			}
		} catch (error) {
			console.error("Upload error:", error);
		}
	};

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
			</div>

			{/* Stats Overview */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="p-6">
						<div className="flex items-center gap-3 mb-2">
							<BarChart3 className="text-primary" size={24} />
							<h3 className="text-lg font-semibold text-primary">Total Names</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.totalNames}</p>
					</div>

					<div className="p-6">
						<div className="flex items-center gap-3 mb-2">
							<Eye className="text-chart-2" size={24} />
							<h3 className="text-lg font-semibold text-chart-2">Active</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.activeNames}</p>
					</div>

					<div className="p-6">
						<div className="flex items-center gap-3 mb-2">
							<Lock className="text-chart-4" size={24} />
							<h3 className="text-lg font-semibold text-chart-4">Locked In</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.lockedInNames}</p>
					</div>

					<div className="p-6">
						<div className="flex items-center gap-3 mb-2">
							<EyeOff className="text-destructive" size={24} />
							<h3 className="text-lg font-semibold text-destructive">Hidden</h3>
						</div>
						<p className="text-3xl font-bold text-foreground">{stats.hiddenNames}</p>
					</div>
				</div>
			)}

			{/* Tab Navigation */}
			<div className="flex gap-2 mb-6 border-b border-border/10">
				{["overview", "names", "users", "analytics"].map((tab) => (
					<button
						key={tab}
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
							<div className="mb-4 py-4 border-y border-border/10">
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
						<div className="divide-y divide-border/10">
							{filteredNames.map((name) => (
								<div key={name.id} className="py-4">
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
												<div className="text-xs text-chart-4 font-semibold">
													<Lock size={12} /> Locked
												</div>
											)}
											{name.isHidden && (
												<div className="text-xs text-destructive font-semibold">
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
								</div>
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
