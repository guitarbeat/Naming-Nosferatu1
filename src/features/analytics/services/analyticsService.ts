import { isNameHidden } from "@/shared/lib/basic";
import { coreAPI, statsAPI as supabaseStatsAPI } from "@/shared/services/supabase/api";
import { resolveSupabaseClient } from "@/shared/services/supabase/runtime";
import type { IdType, NameItem } from "@/shared/types";

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

export interface EngagementMetrics {
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

interface UserRatingRow {
	nameId: IdType;
	rating: number;
	wins?: number;
	losses?: number;
}

export type UserRatedName = NameItem & {
	user_rating: number | null;
	user_wins: number;
	user_losses: number;
	has_user_rating: boolean;
	isHidden: boolean;
};

function toNumber(value: unknown, fallback = 0): number {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
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

async function getAuthenticatedClient() {
	const client = await resolveSupabaseClient();
	if (!client) {
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

async function getCurrentUserRatings(): Promise<UserRatingRow[]> {
	const auth = await getAuthenticatedClient();
	if (!auth) {
		return [];
	}

	const { data, error } = await auth.client
		.from("cat_name_ratings")
		.select("name_id, rating, wins, losses")
		.eq("user_id", auth.user.id);

	if (error) {
		return [];
	}

	return (data ?? []).map((row) => ({
		nameId: row.name_id,
		rating: toNumber(row.rating, 1500),
		wins: toNumber(row.wins),
		losses: toNumber(row.losses),
	}));
}

export const leaderboardAPI = {
	getLeaderboard: async (limit: number | null = 50): Promise<LeaderboardItem[]> => {
		try {
			const client = await resolveSupabaseClient();
			if (!client) {
				return [];
			}

			const { data, error } = await (
				client.rpc as unknown as (
					rpcName: string,
					args?: Record<string, unknown>,
				) => Promise<{
					data: Array<Record<string, unknown>> | null;
					error: { message?: string } | null;
				}>
			)("get_leaderboard_stats", { limit_count: limit || 50 });

			if (error || !data) {
				return [];
			}

			return data.map(mapLeaderboardRow);
		} catch {
			return [];
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
			avgRating: toNumber(stats.avgRating),
		};
	},

	getEngagementMetrics: async (
		_timeframe: "day" | "week" | "month" | "year",
	): Promise<EngagementMetrics | null> => {
		return null;
	},

	getDetailedUserStats: async (_userName: string): Promise<DetailedUserStats | null> => {
		const auth = await getAuthenticatedClient();
		if (!auth) {
			return null;
		}

		const [ratings, selections] = await Promise.all([
			getCurrentUserRatings(),
			auth.client
				.from("cat_tournament_selections")
				.select("id", { count: "exact", head: true })
				.eq("user_id", auth.user.id),
		]);

		const totalWins = ratings.reduce((sum, rating) => sum + toNumber(rating.wins), 0);
		const totalLosses = ratings.reduce((sum, rating) => sum + toNumber(rating.losses), 0);
		const totalRatings = ratings.length;
		const totalSelections = selections.count ?? 0;
		const totalGames = totalWins + totalLosses;

		return {
			totalRatings,
			totalSelections,
			totalWins,
			totalLosses,
			winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 1000) / 10 : 0,
			lastActiveAt: undefined,
			totalTournaments: totalSelections,
			completedTournaments: totalSelections,
			averageTournamentTime: 0,
			favoriteNames: [],
			preferredCategories: [],
			engagementScore: totalRatings > 0 ? Math.min(100, totalRatings * 5) : 0,
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
			auth.client
				.from("cat_tournament_selections")
				.select("id", { count: "exact", head: true })
				.eq("user_id", auth.user.id),
		]);

		const totalWins = ratings.reduce((sum, rating) => sum + toNumber(rating.wins), 0);
		const totalLosses = ratings.reduce((sum, rating) => sum + toNumber(rating.losses), 0);
		const totalGames = totalWins + totalLosses;

		return {
			totalRatings: ratings.length,
			totalSelections: selections.count ?? 0,
			totalWins,
			totalLosses,
			winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 1000) / 10 : 0,
		};
	},
};
