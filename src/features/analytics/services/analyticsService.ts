import { isNameHidden } from "@/shared/lib/basic";
import {
	coreAPI,
	resolveSupabaseClient,
	statsAPI as supabaseStatsAPI,
} from "@/shared/services/supabase";
import type { IdType, NameItem } from "@/shared/types";

type Timeframe = "day" | "week" | "month" | "year";

interface UserRatingRow {
	nameId: IdType;
	rating: number;
	userId?: string;
	userName?: string;
	wins?: number;
	losses?: number;
	updatedAt?: string;
}

interface SelectionRow {
	id: number;
	nameId: string;
	selectedAt: string;
	selectionType?: string | null;
	tournamentId: string;
	userId?: string;
	userName?: string;
}

export interface LeaderboardItem {
	name_id: string | number;
	name: string;
	avg_rating: number;
	wins: number;
	total_ratings: number;
	created_at?: string | null;
	date_submitted?: string | null;
	[key: string]: unknown;
}

export interface SiteStats {
	totalNames: number;
	activeNames: number;
	hiddenNames: number;
	totalUsers: number;
	totalRatings: number;
	totalSelections: number;
	avgRating: number;
	[key: string]: unknown;
}

export interface UserStats {
	totalRatings: number;
	totalSelections: number;
	totalWins: number;
	totalLosses?: number;
	winRate: number;
	[key: string]: unknown;
}

export interface TopSelectionSummary {
	count: number;
	name: string;
	nameId: string;
}

export interface EngagementMetrics {
	activeUsers: number;
	activeRaters: number;
	activeSelectors: number;
	averageRatingsPerRater: number;
	averageSelectionsPerSelector: number;
	latestRatingAt: string | null;
	latestSelectionAt: string | null;
	ratingsUpdatedInWindow: number;
	selectionsInWindow: number;
	timeframe: Exclude<Timeframe, "year">;
	topSelections: TopSelectionSummary[];
	totalRatings: number;
	totalSelections: number;
	[key: string]: unknown;
}

export interface DetailedUserStats extends UserStats {
	lastActiveAt?: string;
	totalTournaments?: number;
	completedTournaments?: number;
	averageTournamentTime?: number;
	favoriteNames?: string[];
	preferredCategories?: string[];
	engagementScore?: number;
	[key: string]: unknown;
}

export type UserRatedName = NameItem & {
	user_rating: number | null;
	user_wins: number;
	user_losses: number;
	has_user_rating: boolean;
	isHidden: boolean;
};

export interface AdminActivityItem {
	id: string;
	name: string;
	timestamp: string;
	type: "rating" | "selection";
	userName: string;
	details: string;
}

export interface AdminUserSummary {
	averageRating: number;
	lastActiveAt: string | null;
	ratingsCount: number;
	selectionsCount: number;
	totalLosses: number;
	totalWins: number;
	userKey: string;
	userName: string;
}

function toNumber(value: unknown, fallback = 0): number {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}

function round(value: number): number {
	return Math.round(value * 10) / 10;
}

function supportsAuth(client: unknown): client is {
	auth: {
		getUser: () => Promise<{
			data: { user: unknown };
			error: unknown;
		}>;
	};
} {
	return (
		typeof (client as { auth?: unknown } | null)?.auth === "object" &&
		typeof (client as { auth?: { getUser?: unknown } } | null)?.auth?.getUser === "function"
	);
}

function supportsQuerying(client: unknown): client is {
	from: (table: string) => {
		select: (...args: unknown[]) => unknown;
	};
} {
	return typeof (client as { from?: unknown } | null)?.from === "function";
}

function supportsRpc(client: unknown): client is {
	rpc: (
		name: string,
		args?: Record<string, unknown>,
	) => Promise<{
		data: Array<Record<string, unknown>> | null;
		error: { message?: string } | null;
	}>;
} {
	return typeof (client as { rpc?: unknown } | null)?.rpc === "function";
}

function getTimeframeStart(timeframe: Exclude<Timeframe, "year">): Date {
	const now = Date.now();
	switch (timeframe) {
		case "day":
			return new Date(now - 24 * 60 * 60 * 1000);
		case "month":
			return new Date(now - 30 * 24 * 60 * 60 * 1000);
		default:
			return new Date(now - 7 * 24 * 60 * 60 * 1000);
	}
}

function maxTimestamp(left: string | null, right: string | null): string | null {
	if (!left) {
		return right;
	}
	if (!right) {
		return left;
	}
	return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

async function getClient() {
	return await resolveSupabaseClient();
}

async function getAuthenticatedClient() {
	const client = await getClient();
	if (!client || !supportsAuth(client)) {
		return null;
	}

	const {
		data: { user },
		error,
	} = await client.auth.getUser();

	if (error || !user) {
		return null;
	}

	return { client, user };
}

async function getNameLookup(): Promise<Map<string, string>> {
	const names = await coreAPI.getTrendingNames(true).catch(() => []);
	return new Map(names.map((name) => [String(name.id), name.name]));
}

async function getCurrentUserRatings(): Promise<UserRatingRow[]> {
	const auth = await getAuthenticatedClient();
	if (!auth) {
		return [];
	}

	const { data, error } = await auth.client
		.from("cat_name_ratings")
		.select("name_id, rating, wins, losses, updated_at, user_id, user_name")
		.eq("user_id", auth.user.id);

	if (error) {
		return [];
	}

	return (data ?? []).map((row) => ({
		nameId: row.name_id,
		rating: toNumber(row.rating, 1500),
		userId: row.user_id,
		userName: row.user_name,
		wins: toNumber(row.wins),
		losses: toNumber(row.losses),
		updatedAt: row.updated_at,
	}));
}

async function getSelectionRows(options?: {
	limit?: number;
	since?: Date;
	userId?: string;
}): Promise<SelectionRow[]> {
	const client = await getClient();
	if (!client || !supportsQuerying(client)) {
		return [];
	}

	let query = client
		.from("cat_tournament_selections")
		.select("id, name_id, selected_at, selection_type, tournament_id, user_id, user_name")
		.order("selected_at", { ascending: false });

	if (options?.since) {
		query = query.gte("selected_at", options.since.toISOString());
	}

	if (options?.userId) {
		query = query.eq("user_id", options.userId);
	}

	const { data, error } = await query.limit(options?.limit ?? 5000);
	if (error) {
		return [];
	}

	return (data ?? []).map((row) => ({
		id: row.id,
		nameId: row.name_id,
		selectedAt: row.selected_at,
		selectionType: row.selection_type,
		tournamentId: row.tournament_id,
		userId: row.user_id,
		userName: row.user_name,
	}));
}

async function getRatingRows(options?: {
	limit?: number;
	since?: Date;
	userId?: string;
}): Promise<UserRatingRow[]> {
	const client = await getClient();
	if (!client || !supportsQuerying(client)) {
		return [];
	}

	let query = client
		.from("cat_name_ratings")
		.select("name_id, rating, wins, losses, updated_at, user_id, user_name")
		.order("updated_at", { ascending: false });

	if (options?.since) {
		query = query.gte("updated_at", options.since.toISOString());
	}

	if (options?.userId) {
		query = query.eq("user_id", options.userId);
	}

	const { data, error } = await query.limit(options?.limit ?? 5000);
	if (error) {
		return [];
	}

	return (data ?? []).map((row) => ({
		nameId: row.name_id,
		rating: toNumber(row.rating, 1500),
		userId: row.user_id,
		userName: row.user_name,
		wins: toNumber(row.wins),
		losses: toNumber(row.losses),
		updatedAt: row.updated_at,
	}));
}

function mapLeaderboardRow(row: Record<string, unknown>): LeaderboardItem {
	return {
		name_id: String(row.name_id ?? row.id ?? ""),
		name: String(row.name ?? ""),
		avg_rating: toNumber(row.avg_rating),
		wins: toNumber(row.wins),
		total_ratings: toNumber(row.total_ratings),
		created_at: (row.created_at as string | null | undefined) ?? null,
		date_submitted: (row.date_submitted as string | null | undefined) ?? null,
	};
}

async function getLeaderboardFallback(limit: number): Promise<LeaderboardItem[]> {
	const [names, ratings] = await Promise.all([
		coreAPI.getTrendingNames(false).catch(() => []),
		getRatingRows().catch(() => []),
	]);
	const ratingStats = new Map<
		string,
		{ totalRatings: number; totalRating: number; wins: number; losses: number }
	>();

	for (const row of ratings) {
		const key = String(row.nameId);
		const current = ratingStats.get(key) ?? {
			totalRatings: 0,
			totalRating: 0,
			wins: 0,
			losses: 0,
		};
		current.totalRatings += 1;
		current.totalRating += row.rating;
		current.wins += toNumber(row.wins);
		current.losses += toNumber(row.losses);
		ratingStats.set(key, current);
	}

	return names
		.map((name) => {
			const stats = ratingStats.get(String(name.id));
			return {
				name_id: String(name.id),
				name: name.name,
				avg_rating:
					stats && stats.totalRatings > 0
						? Math.round(stats.totalRating / stats.totalRatings)
						: toNumber(name.avg_rating, toNumber(name.avgRating, 1500)),
				wins: stats?.wins ?? 0,
				total_ratings: stats?.totalRatings ?? 0,
				created_at:
					(typeof name.created_at === "string" ? name.created_at : name.createdAt) ?? null,
				date_submitted: null,
			};
		})
		.sort(
			(left, right) => right.avg_rating - left.avg_rating || left.name.localeCompare(right.name),
		)
		.slice(0, Math.max(1, limit));
}

async function getTopSelections(limit: number): Promise<TopSelectionSummary[]> {
	const rows = await supabaseStatsAPI.getTopSelections(limit);
	return rows.map((row) => ({
		nameId: row.nameId,
		name: row.name,
		count: row.count,
	}));
}

export const leaderboardAPI = {
	getLeaderboard: async (limit: number | null = 50): Promise<LeaderboardItem[]> => {
		const normalizedLimit = Math.max(1, limit ?? 50);

		try {
			const client = await getClient();
			if (!client) {
				return [];
			}
			if (!supportsRpc(client)) {
				return await getLeaderboardFallback(normalizedLimit);
			}

			const { data, error } = await client.rpc("get_leaderboard_stats", {
				limit_count: normalizedLimit,
			});

			if (error || !data) {
				return await getLeaderboardFallback(normalizedLimit);
			}

			return data.map(mapLeaderboardRow);
		} catch {
			return await getLeaderboardFallback(normalizedLimit);
		}
	},
};

export const statsAPI = {
	getSiteStats: async (): Promise<SiteStats | null> => {
		const stats = await supabaseStatsAPI.getSiteStats();
		if (!stats) {
			return null;
		}

		return {
			totalNames: toNumber(stats.totalNames),
			activeNames: toNumber(stats.activeNames),
			hiddenNames: toNumber(stats.hiddenNames),
			totalUsers: toNumber(stats.totalUsers),
			totalRatings: toNumber(stats.totalRatings),
			totalSelections: toNumber(stats.totalSelections),
			avgRating: toNumber(stats.avgRating, 1500),
		};
	},

	getEngagementMetrics: async (
		timeframe: Exclude<Timeframe, "year">,
	): Promise<EngagementMetrics | null> => {
		const since = getTimeframeStart(timeframe);
		const [siteStats, selectionRows, ratingRows, topSelections] = await Promise.all([
			statsAPI.getSiteStats(),
			getSelectionRows({ since }),
			getRatingRows({ since }),
			getTopSelections(5),
		]);

		const selectors = new Set(
			selectionRows.map((row) => row.userId || row.userName).filter(Boolean),
		);
		const raters = new Set(ratingRows.map((row) => row.userId || row.userName).filter(Boolean));
		const activeUsers = new Set([...selectors, ...raters]);
		const latestSelectionAt = selectionRows[0]?.selectedAt ?? null;
		const latestRatingAt = ratingRows[0]?.updatedAt ?? null;

		return {
			timeframe,
			totalSelections: siteStats?.totalSelections ?? 0,
			totalRatings: siteStats?.totalRatings ?? 0,
			selectionsInWindow: selectionRows.length,
			ratingsUpdatedInWindow: ratingRows.length,
			activeSelectors: selectors.size,
			activeRaters: raters.size,
			activeUsers: activeUsers.size,
			averageSelectionsPerSelector:
				selectors.size > 0 ? round(selectionRows.length / selectors.size) : 0,
			averageRatingsPerRater: raters.size > 0 ? round(ratingRows.length / raters.size) : 0,
			latestSelectionAt,
			latestRatingAt,
			topSelections,
		};
	},

	getDetailedUserStats: async (_userName: string): Promise<DetailedUserStats | null> => {
		const auth = await getAuthenticatedClient();
		if (!auth) {
			return null;
		}

		const [ratings, selections] = await Promise.all([
			getCurrentUserRatings(),
			getSelectionRows({ userId: auth.user.id }),
		]);

		const totalWins = ratings.reduce((sum, rating) => sum + toNumber(rating.wins), 0);
		const totalLosses = ratings.reduce((sum, rating) => sum + toNumber(rating.losses), 0);
		const totalRatings = ratings.length;
		const totalSelections = selections.length;
		const totalGames = totalWins + totalLosses;
		const lastActiveAt = [ratings[0]?.updatedAt ?? null, selections[0]?.selectedAt ?? null].reduce(
			(current, next) => maxTimestamp(current, next),
			null as string | null,
		);

		return {
			totalRatings,
			totalSelections,
			totalWins,
			totalLosses,
			winRate: totalGames > 0 ? round((totalWins / totalGames) * 100) : 0,
			lastActiveAt: lastActiveAt ?? undefined,
			totalTournaments: new Set(selections.map((selection) => selection.tournamentId)).size,
			completedTournaments: new Set(selections.map((selection) => selection.tournamentId)).size,
			averageTournamentTime: 0,
			favoriteNames: [],
			preferredCategories: [],
			engagementScore:
				Math.min(
					100,
					Math.round((totalRatings + totalSelections) * 4 + Math.max(0, totalWins - totalLosses)),
				) || 0,
		};
	},

	getUserRatedNames: async (_userName: string): Promise<UserRatedName[]> => {
		try {
			const [names, ratings] = await Promise.all([
				coreAPI.getTrendingNames(false),
				getCurrentUserRatings(),
			]);
			const ratingMap = new Map<string, UserRatingRow>();

			for (const rating of ratings) {
				ratingMap.set(String(rating.nameId), rating);
			}

			return (names ?? []).map((item) => {
				const userRating = ratingMap.get(String(item.id));
				return {
					...item,
					user_rating: userRating ? toNumber(userRating.rating) : null,
					user_wins: toNumber(userRating?.wins),
					user_losses: toNumber(userRating?.losses),
					has_user_rating: Boolean(userRating),
					isHidden: isNameHidden(item),
				};
			});
		} catch {
			return [];
		}
	},

	getUserStats: async (_userName: string): Promise<UserStats | null> => {
		const auth = await getAuthenticatedClient();
		if (!auth) {
			return null;
		}

		const [ratings, selections] = await Promise.all([
			getCurrentUserRatings(),
			getSelectionRows({ userId: auth.user.id }),
		]);

		const totalWins = ratings.reduce((sum, rating) => sum + toNumber(rating.wins), 0);
		const totalLosses = ratings.reduce((sum, rating) => sum + toNumber(rating.losses), 0);
		const totalGames = totalWins + totalLosses;

		return {
			totalRatings: ratings.length,
			totalSelections: selections.length,
			totalWins,
			totalLosses,
			winRate: totalGames > 0 ? round((totalWins / totalGames) * 100) : 0,
		};
	},
};

export const adminAnalyticsAPI = {
	getRecentActivity: async (limit = 10): Promise<AdminActivityItem[]> => {
		const [selectionRows, ratingRows, nameLookup] = await Promise.all([
			getSelectionRows({ limit: Math.max(limit, 10) }),
			getRatingRows({ limit: Math.max(limit, 10) }),
			getNameLookup(),
		]);

		const activity: AdminActivityItem[] = [
			...selectionRows.map((row) => ({
				id: `selection:${row.id}`,
				type: "selection" as const,
				name: nameLookup.get(String(row.nameId)) ?? String(row.nameId),
				timestamp: row.selectedAt,
				userName: row.userName || row.userId || "Unknown user",
				details: row.selectionType
					? `${row.selectionType.replaceAll("_", " ")} in ${row.tournamentId}`
					: `Added to ${row.tournamentId}`,
			})),
			...ratingRows.map((row) => ({
				id: `rating:${row.userId || row.userName}:${row.nameId}:${row.updatedAt ?? ""}`,
				type: "rating" as const,
				name: nameLookup.get(String(row.nameId)) ?? String(row.nameId),
				timestamp: row.updatedAt ?? new Date(0).toISOString(),
				userName: row.userName || row.userId || "Unknown user",
				details: `${Math.round(row.rating)} rating, ${toNumber(row.wins)}W/${toNumber(row.losses)}L`,
			})),
		];

		return activity
			.sort(
				(left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
			)
			.slice(0, Math.max(1, limit));
	},

	getTopSelections: async (limit = 10): Promise<TopSelectionSummary[]> => {
		return await getTopSelections(limit);
	},

	getUserSummaries: async (limit = 25): Promise<AdminUserSummary[]> => {
		const [ratings, selections] = await Promise.all([getRatingRows(), getSelectionRows()]);
		const summaries = new Map<
			string,
			{
				lastActiveAt: string | null;
				ratingCount: number;
				ratingTotal: number;
				selectionCount: number;
				totalLosses: number;
				totalWins: number;
				userName: string;
			}
		>();

		for (const row of ratings) {
			const key = row.userId || row.userName || `rating:${row.nameId}`;
			const current = summaries.get(key) ?? {
				lastActiveAt: null,
				ratingCount: 0,
				ratingTotal: 0,
				selectionCount: 0,
				totalLosses: 0,
				totalWins: 0,
				userName: row.userName || row.userId || "Unknown user",
			};
			current.lastActiveAt = maxTimestamp(current.lastActiveAt, row.updatedAt ?? null);
			current.ratingCount += 1;
			current.ratingTotal += row.rating;
			current.totalLosses += toNumber(row.losses);
			current.totalWins += toNumber(row.wins);
			summaries.set(key, current);
		}

		for (const row of selections) {
			const key = row.userId || row.userName || `selection:${row.id}`;
			const current = summaries.get(key) ?? {
				lastActiveAt: null,
				ratingCount: 0,
				ratingTotal: 0,
				selectionCount: 0,
				totalLosses: 0,
				totalWins: 0,
				userName: row.userName || row.userId || "Unknown user",
			};
			current.lastActiveAt = maxTimestamp(current.lastActiveAt, row.selectedAt);
			current.selectionCount += 1;
			summaries.set(key, current);
		}

		return [...summaries.entries()]
			.map(([userKey, summary]) => ({
				userKey,
				userName: summary.userName,
				ratingsCount: summary.ratingCount,
				selectionsCount: summary.selectionCount,
				totalWins: summary.totalWins,
				totalLosses: summary.totalLosses,
				averageRating:
					summary.ratingCount > 0 ? round(summary.ratingTotal / summary.ratingCount) : 0,
				lastActiveAt: summary.lastActiveAt,
			}))
			.sort((left, right) => {
				const rightActivity = right.ratingsCount + right.selectionsCount;
				const leftActivity = left.ratingsCount + left.selectionsCount;
				if (rightActivity !== leftActivity) {
					return rightActivity - leftActivity;
				}
				return (
					new Date(right.lastActiveAt ?? 0).getTime() - new Date(left.lastActiveAt ?? 0).getTime()
				);
			})
			.slice(0, Math.max(1, limit));
	},
};
