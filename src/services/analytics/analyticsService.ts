import { api } from "@/services/apiClient";
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

export interface ActivityTrendPoint {
	date: string;
	selectionCount: number;
	activeUsers: number;
	uniqueNames: number;
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

function mapActivityTrendRow(row: Record<string, unknown>): ActivityTrendPoint {
	return {
		date: String(row.date ?? ""),
		selectionCount: toNumber(row.selectionCount ?? row.selection_count),
		activeUsers: toNumber(row.activeUsers ?? row.active_users),
		uniqueNames: toNumber(row.uniqueNames ?? row.unique_names),
	};
}

export const leaderboardAPI = {
	getLeaderboard: async (limit: number | null = 50): Promise<LeaderboardItem[]> => {
		try {
			const rows = await api.get<Array<Record<string, unknown>>>(
				`/analytics/leaderboard?limit=${limit || 50}`,
			);
			return (rows ?? []).map(mapLeaderboardRow);
		} catch {
			return [];
		}
	},
};

export const statsAPI = {
	getSiteStats: async (): Promise<SiteStats | null> => {
		try {
			const stats = await api.get<Partial<SiteStats>>("/analytics/site-stats");
			if (!stats) {
				return null;
			}
			return {
				totalNames: toNumber(stats.totalNames ?? stats.total_names),
				activeNames: toNumber(stats.activeNames ?? stats.active_names),
				hiddenNames: toNumber(stats.hiddenNames ?? stats.hidden_names),
				totalUsers: toNumber(stats.totalUsers ?? stats.total_users),
				totalRatings: toNumber(stats.totalRatings ?? stats.total_ratings),
				totalSelections: toNumber(stats.totalSelections ?? stats.total_selections),
				avgRating: toNumber(stats.avgRating ?? stats.avg_rating),
			};
		} catch {
			return null;
		}
	},

	getUserRatedNames: async (userName: string): Promise<UserRatedName[]> => {
		try {
			const [names, ratings] = await Promise.all([
				api.get<NameItem[]>("/names?includeHidden=false"),
				api.get<UserRatingRow[]>(`/analytics/ratings-raw?userName=${encodeURIComponent(userName)}`),
			]);

			const ratingMap = new Map<string, UserRatingRow>();
			for (const rating of ratings ?? []) {
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
					isHidden: Boolean(item.isHidden ?? item.is_hidden),
				};
			});
		} catch {
			return [];
		}
	},

	getUserStats: async (userName: string): Promise<UserStats | null> => {
		try {
			const stats = await api.get<Partial<UserStats>>(
				`/analytics/user-stats?userName=${encodeURIComponent(userName)}`,
			);
			if (!stats) {
				return null;
			}
			return {
				totalRatings: toNumber(stats.totalRatings),
				totalSelections: toNumber(stats.totalSelections),
				totalWins: toNumber(stats.totalWins),
				totalLosses: toNumber(stats.totalLosses),
				winRate: toNumber(stats.winRate),
			};
		} catch {
			return null;
		}
	},

	getActivityTrend: async (days = 14): Promise<ActivityTrendPoint[]> => {
		try {
			const rows = await api.get<Array<Record<string, unknown>>>(
				`/analytics/activity-trend?days=${days}`,
			);
			return (rows ?? []).map(mapActivityTrendRow).filter((row) => row.date.length > 0);
		} catch {
			return [];
		}
	},
};
