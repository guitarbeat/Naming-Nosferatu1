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
