/**
 * @module AdminDashboard
 * @description Comprehensive admin dashboard for managing names and viewing analytics
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { coreAPI, hiddenNamesAPI, imagesAPI } from "@/services/supabase/api";
import { withSupabase } from "@/services/supabase/runtime";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
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
			const allNames = await coreAPI.getTrendingNames(true);

			// Load stats (we'll simulate some for now)
			const adminStats: AdminStats = {
				totalNames: allNames.length,
				activeNames: allNames.filter((n) => !n.isHidden && !(n.lockedIn || n.locked_in)).length,
				hiddenNames: allNames.filter((n) => n.isHidden).length,
				lockedInNames: allNames.filter((n) => n.lockedIn || n.locked_in).length,
				totalUsers: 0, // TODO: Implement user count
				activeTournaments: 0, // TODO: Implement tournament count
				recentVotes: 0, // TODO: Implement vote tracking
			};

			// Add some mock stats for demonstration
			const namesWithStats: NameWithStats[] = allNames.map((name) => ({
				...name,
				votes: Math.floor(Math.random() * 100),
				lastVoted: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
				popularityScore: Math.random() * 100,
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
		<div className="min-h-screen bg-black text-white p-6">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
					Admin Dashboard
				</h1>
				<p className="text-white/60">Manage names and monitor site activity</p>
			</div>

			{/* Stats Overview */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<Card className="p-6 border-purple-500/30 bg-purple-900/20">
						<div className="flex items-center gap-3 mb-2">
							<BarChart3 className="text-purple-400" size={24} />
							<h3 className="text-lg font-semibold text-purple-400">Total Names</h3>
						</div>
						<p className="text-3xl font-bold text-white">{stats.totalNames}</p>
					</Card>

					<Card className="p-6 border-green-500/30 bg-green-900/20">
						<div className="flex items-center gap-3 mb-2">
							<Eye className="text-green-400" size={24} />
							<h3 className="text-lg font-semibold text-green-400">Active</h3>
						</div>
						<p className="text-3xl font-bold text-white">{stats.activeNames}</p>
					</Card>

					<Card className="p-6 border-amber-500/30 bg-amber-900/20">
						<div className="flex items-center gap-3 mb-2">
							<Lock className="text-amber-400" size={24} />
							<h3 className="text-lg font-semibold text-amber-400">Locked In</h3>
						</div>
						<p className="text-3xl font-bold text-white">{stats.lockedInNames}</p>
					</Card>

					<Card className="p-6 border-red-500/30 bg-red-900/20">
						<div className="flex items-center gap-3 mb-2">
							<EyeOff className="text-red-400" size={24} />
							<h3 className="text-lg font-semibold text-red-400">Hidden</h3>
						</div>
						<p className="text-3xl font-bold text-white">{stats.hiddenNames}</p>
					</Card>
				</div>
			)}

			{/* Tab Navigation */}
			<div className="flex gap-2 mb-6 border-b border-white/10">
				{["overview", "names", "users", "analytics"].map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab as any)}
						className={`px-4 py-2 font-medium transition-colors ${
							activeTab === tab
								? "text-white border-b-2 border-purple-500"
								: "text-white/60 hover:text-white"
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
									className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
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
							<div className="mb-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
								<p className="text-sm text-purple-400 mb-2">{selectedNames.size} names selected</p>
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
												<h3 className="font-semibold text-white">{name.name}</h3>
												{name.description && (
													<p className="text-sm text-white/60">{name.description}</p>
												)}
												<div className="flex gap-4 mt-1 text-xs text-white/40">
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
												<div className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400">
													<Lock size={12} /> Locked
												</div>
											)}
											{name.isHidden && (
												<div className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400">
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
					>
						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h3 className="text-lg font-semibold mb-2">Image Upload</h3>
									<input
										type="file"
										accept="image/*"
										onChange={handleImageUpload}
										className="w-full p-2 bg-white/10 border border-white/20 rounded"
									/>
								</div>
								<div>
									<h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
									<p className="text-white/60">Activity tracking coming soon...</p>
								</div>
							</div>
						</Card>
					</motion.div>
				)}

				{activeTab === "users" && (
					<motion.div
						key="users"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">User Analytics</h2>
							<p className="text-white/60">User tracking and analytics coming soon...</p>
						</Card>
					</motion.div>
				)}

				{activeTab === "analytics" && (
					<motion.div
						key="analytics"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<Card className="p-6">
							<h2 className="text-2xl font-bold mb-4">Site Analytics</h2>
							<p className="text-white/60">Advanced analytics coming soon...</p>
						</Card>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
