import { isNameHidden } from "@/shared/lib/basic";
import { api } from "@/shared/services/apiClient";
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
	averageTournamentTime: number; // in minutes
	totalMatches: number;
	peakActiveUsers: number;
	dailyActiveUsers: number;
	weeklyActiveUsers: number;
	monthlyActiveUsers: number;
	mostActiveHour: string;
	mostActiveDay: string;
	userRetentionRate: number; // percentage of users who return after 7 days
	averageSessionDuration: number; // in minutes
	totalPageViews: number;
	bounceRate: number; // percentage of single-page sessions
	[key: string]: unknown;
}

export interface DetailedUserStats extends UserStats {
	lastActiveAt?: string;
	totalTournaments?: number;
	completedTournaments?: number;
	averageTournamentTime?: number;
	favoriteNames?: string[];
	preferredCategories?: string[];
	engagementScore?: number; // 0-100 based on activity level
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

export const leaderboardAPI = {
	getLeaderboard: async (
		limit: number | null = 50,
	): Promise<LeaderboardItem[]> => {
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
				totalNames: toNumber(stats.totalNames),
				activeNames: toNumber(stats.activeNames),
				hiddenNames: toNumber(stats.hiddenNames),
				totalUsers: toNumber(stats.totalUsers),
				totalRatings: toNumber(stats.totalRatings),
				totalSelections: toNumber(stats.totalSelections),
				avgRating: toNumber(stats.avgRating),
			};
		} catch {
			return null;
		}
	},

	getEngagementMetrics: async (
		timeframe: "day" | "week" | "month" | "year",
	): Promise<EngagementMetrics | null> => {
		try {
			const metrics = await api.get<Partial<EngagementMetrics>>(
				`/analytics/engagement?timeframe=${timeframe}`,
			);
			if (!metrics) {
				return null;
			}
			return {
				totalTournaments: toNumber(metrics.totalTournaments),
				completedTournaments: toNumber(metrics.completedTournaments),
				averageTournamentTime: toNumber(metrics.averageTournamentTime),
				totalMatches: toNumber(metrics.totalMatches),
				peakActiveUsers: toNumber(metrics.peakActiveUsers),
				dailyActiveUsers: toNumber(metrics.dailyActiveUsers),
				weeklyActiveUsers: toNumber(metrics.weeklyActiveUsers),
				monthlyActiveUsers: toNumber(metrics.monthlyActiveUsers),
				mostActiveHour: String(metrics.mostActiveHour),
				mostActiveDay: String(metrics.mostActiveDay),
				userRetentionRate: toNumber(metrics.userRetentionRate),
				averageSessionDuration: toNumber(metrics.averageSessionDuration),
				totalPageViews: toNumber(metrics.totalPageViews),
				bounceRate: toNumber(metrics.bounceRate),
			};
		} catch {
			return null;
		}
	},

	getDetailedUserStats: async (
		userName: string,
	): Promise<DetailedUserStats | null> => {
		try {
			const stats = await api.get<Partial<DetailedUserStats>>(
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
				lastActiveAt: String(stats.lastActiveAt),
				totalTournaments: toNumber(stats.totalTournaments),
				completedTournaments: toNumber(stats.completedTournaments),
				averageTournamentTime: toNumber(stats.averageTournamentTime),
				favoriteNames: stats.favoriteNames
					? String(stats.favoriteNames).split(",")
					: [],
				preferredCategories: stats.preferredCategories
					? String(stats.preferredCategories).split(",")
					: [],
				engagementScore: toNumber(stats.engagementScore),
			};
		} catch {
			return null;
		}
	},

	getUserRatedNames: async (userName: string): Promise<UserRatedName[]> => {
		try {
			const [names, ratings] = await Promise.all([
				api.get<NameItem[]>("/names?includeHidden=false"),
				api.get<UserRatingRow[]>(
					`/analytics/ratings-raw?userName=${encodeURIComponent(userName)}`,
				),
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
					isHidden: isNameHidden(item),
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
};
