import { api } from "@/services/apiClient";

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

export interface SelectionPopularityItem {
	name_id: string | number;
	name: string;
	times_selected: number;
	created_at?: string | null;
	date_submitted?: string | null;
	[key: string]: unknown;
}

export interface AnalyticsDataItem {
	name_id: string | number;
	name: string;
	avg_rating: number;
	total_wins: number;
	times_selected: number;
	created_at?: string | null;
	date_submitted?: string | null;
	[key: string]: unknown;
}

export interface ConsolidatedName {
	id: string | number;
	name: string;
	rating: number;
	wins: number;
	selected: number;
	dateSubmitted: string | null;
	ratingPercentile?: number;
	selectedPercentile?: number;
	insights?: string[];
}

export interface NameWithInsight extends ConsolidatedName {
	ratingPercentile: number;
	selectedPercentile: number;
	insights: string[];
}

export interface SummaryStats {
	maxRating: number;
	maxWins: number;
	maxSelected: number;
	avgRating: number;
	avgWins: number;
	totalSelected: number;
	totalSelections?: number;
	totalRatings?: number;
	totalNames?: number;
	activeNames?: number;
	topName?: ConsolidatedName;
}

export interface HighlightItem {
	id: string;
	name: string;
	value: number;
	avg_rating?: number;
}

export const leaderboardAPI = {
	getLeaderboard: async (limit: number | null = 50): Promise<LeaderboardItem[]> => {
		try {
			const rows = await api.get<Array<Record<string, unknown>>>(
				`/analytics/leaderboard?limit=${limit || 50}`,
			);
			return (rows ?? []).map((row) => ({
				name_id: String(row.name_id ?? row.id ?? ""),
				name: String(row.name ?? ""),
				avg_rating: Number(row.avg_rating ?? 0),
				wins: Number(row.wins ?? 0),
				total_ratings: Number(row.total_ratings ?? 0),
				created_at: (row.created_at as string | null | undefined) ?? null,
				date_submitted: (row.date_submitted as string | null | undefined) ?? null,
			}));
		} catch {
			return [];
		}
	},
};

export const analyticsAPI = {
	getTopSelectedNames: async (limit: number | null = 50): Promise<SelectionPopularityItem[]> => {
		try {
			return await api.get<SelectionPopularityItem[]>(
				`/analytics/top-selected?limit=${limit || 50}`,
			);
		} catch {
			return [];
		}
	},

	getPopularityScores: async (
		limit: number | null = 50,
		userFilter = "all",
		userName?: string | null,
	): Promise<AnalyticsDataItem[]> => {
		try {
			const params = new URLSearchParams();
			params.set("limit", String(limit || 50));
			params.set("userFilter", userFilter);
			if (userName) {
				params.set("userName", userName);
			}
			return await api.get<AnalyticsDataItem[]>(
				`/analytics/popularity-scores?${params.toString()}`,
			);
		} catch {
			return [];
		}
	},

	getRankingHistory: async (
		limit = 10,
		periods = 7,
		options?: { dateFilter?: string },
	): Promise<Array<Record<string, unknown>>> => {
		try {
			const params = new URLSearchParams();
			params.set("limit", String(limit));
			params.set("periods", String(periods));
			if (options?.dateFilter) {
				params.set("dateFilter", options.dateFilter);
			}
			return await api.get<Array<Record<string, unknown>>>(
				`/analytics/ranking-history?${params.toString()}`,
			);
		} catch {
			return [];
		}
	},
};

export const statsAPI = {
	getSiteStats: async () => {
		try {
			return await api.get<any>("/analytics/site-stats");
		} catch {
			return null;
		}
	},

	getUserRatedNames: async (userName: string) => {
		try {
			const [names, ratings] = await Promise.all([
				api.get<any[]>("/names?includeHidden=false"),
				api.get<any[]>(`/analytics/ratings-raw?userName=${encodeURIComponent(userName)}`),
			]);

			const ratingMap = new Map<string, any>();
			for (const rating of ratings) {
				ratingMap.set(String(rating.nameId), rating);
			}

			return (names || []).map((item: any) => {
				const userRating = ratingMap.get(String(item.id));
				return {
					...item,
					user_rating: userRating ? Number(userRating.rating) : null,
					user_wins: userRating?.wins || 0,
					user_losses: userRating?.losses || 0,
					has_user_rating: !!userRating,
					isHidden: item.is_hidden || false,
				};
			});
		} catch {
			return [];
		}
	},

	getUserStats: async (userName: string) => {
		try {
			return await api.get<any>(`/analytics/user-stats?userName=${encodeURIComponent(userName)}`);
		} catch {
			return null;
		}
	},
};
