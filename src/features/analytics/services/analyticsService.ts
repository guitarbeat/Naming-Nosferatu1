import type { Database } from "@/integrations/supabase/types";
import { isNameHidden } from "@/shared/lib/basic";
import { coreAPI, statsAPI as supabaseStatsAPI } from "@/shared/services/supabase/api";
import { resolveSupabaseClient } from "@/shared/services/supabase/runtime";
import type { NameItem } from "@/shared/types";

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

type UserRatingRow = Pick<
	Database["public"]["Tables"]["cat_name_ratings"]["Row"],
	"name_id" | "rating" | "wins" | "losses"
>;

type SelectionRow = Pick<
	Database["public"]["Tables"]["cat_tournament_selections"]["Row"],
	"selected_at" | "tournament_id" | "user_id" | "user_name"
>;

type UserStatsRow = {
	avg_rating?: number | null;
	hidden_count?: number | null;
	total_losses?: number | null;
	total_ratings?: number | null;
	total_wins?: number | null;
	win_rate?: number | null;
};

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

function roundNumber(value: number): number {
	return Number.isFinite(value) ? Math.round(value) : 0;
}

function mapLeaderboardRow(row: Record<string, unknown>): LeaderboardItem {
	return {
		name_id: String(row.name_id ?? row.id ?? ""),
		name: String(row.name ?? ""),
		avg_rating: toNumber(row.avg_rating, 1500),
		wins: toNumber(row.wins),
		total_ratings: toNumber(row.total_ratings),
		created_at: (row.created_at as string | null | undefined) ?? null,
		date_submitted: (row.date_submitted as string | null | undefined) ?? null,
	};
}

function getTimeframeStart(now: Date, timeframe: "day" | "week" | "month" | "year"): Date {
	const start = new Date(now);
	if (timeframe === "day") {
		start.setDate(start.getDate() - 1);
	} else if (timeframe === "week") {
		start.setDate(start.getDate() - 7);
	} else if (timeframe === "month") {
		start.setMonth(start.getMonth() - 1);
	} else {
		start.setFullYear(start.getFullYear() - 1);
	}
	return start;
}

function filterSelectionsSince(rows: SelectionRow[], since: Date): SelectionRow[] {
	const lowerBound = since.getTime();
	return rows.filter((row) => new Date(row.selected_at).getTime() >= lowerBound);
}

function countDistinct<T>(rows: T[], getValue: (row: T) => string): number {
	return new Set(rows.map(getValue)).size;
}

function groupSelectionsByTournament(rows: SelectionRow[]) {
	const groups = new Map<
		string,
		{
			count: number;
			start: number;
			end: number;
		}
	>();

	for (const row of rows) {
		const key = row.tournament_id;
		const timestamp = new Date(row.selected_at).getTime();
		const existing = groups.get(key);

		if (!existing) {
			groups.set(key, {
				count: 1,
				start: timestamp,
				end: timestamp,
			});
			continue;
		}

		existing.count += 1;
		existing.start = Math.min(existing.start, timestamp);
		existing.end = Math.max(existing.end, timestamp);
	}

	return groups;
}

function averageTournamentMinutes(groups: ReturnType<typeof groupSelectionsByTournament>): number {
	const durations = [...groups.values()]
		.filter((group) => group.count > 1)
		.map((group) => (group.end - group.start) / 1000 / 60)
		.filter((duration) => Number.isFinite(duration) && duration >= 0);

	if (durations.length === 0) {
		return 0;
	}

	return roundNumber(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
}

function getPeakActiveUsers(rows: SelectionRow[]): number {
	const usersByDay = new Map<string, Set<string>>();
	for (const row of rows) {
		const dayKey = row.selected_at.slice(0, 10);
		const users = usersByDay.get(dayKey) ?? new Set<string>();
		users.add(row.user_id);
		usersByDay.set(dayKey, users);
	}

	return [...usersByDay.values()].reduce((peak, users) => Math.max(peak, users.size), 0);
}

function modeLabel(values: string[], fallback: string): string {
	if (values.length === 0) {
		return fallback;
	}

	const counts = new Map<string, number>();
	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? fallback;
}

function getMostActiveHour(rows: SelectionRow[]): string {
	return modeLabel(
		rows.map((row) => `${String(new Date(row.selected_at).getHours()).padStart(2, "0")}:00`),
		"00:00",
	);
}

function getMostActiveDay(rows: SelectionRow[]): string {
	const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	return modeLabel(
		rows.map((row) => dayNames[new Date(row.selected_at).getDay()] ?? "Unknown"),
		"Unknown",
	);
}

function getRetentionRate(rows: SelectionRow[]): number {
	const activeDaysByUser = new Map<string, Set<string>>();

	for (const row of rows) {
		const activeDays = activeDaysByUser.get(row.user_id) ?? new Set<string>();
		activeDays.add(row.selected_at.slice(0, 10));
		activeDaysByUser.set(row.user_id, activeDays);
	}

	if (activeDaysByUser.size === 0) {
		return 0;
	}

	const retainedUsers = [...activeDaysByUser.values()].filter((days) => days.size > 1).length;
	return roundNumber((retainedUsers / activeDaysByUser.size) * 100);
}

async function getAnalyticsClient() {
	return (await resolveSupabaseClient()) as any;
}

async function getUserSelectionsCount(client: any, userName: string): Promise<number> {
	const { count, error } = await client
		.from("cat_tournament_selections")
		.select("id", { count: "exact", head: true })
		.eq("user_name", userName);

	return error ? 0 : (count ?? 0);
}

async function getUserRatingRows(client: any, userName: string): Promise<UserRatingRow[]> {
	const { data, error } = await client
		.from("cat_name_ratings")
		.select("name_id, rating, wins, losses")
		.eq("user_name", userName);

	return error ? [] : ((data ?? []) as UserRatingRow[]);
}

async function getUserStatsFallback(client: any, userName: string): Promise<UserStats | null> {
	const ratings = await getUserRatingRows(client, userName);
	if (ratings.length === 0) {
		return {
			totalRatings: 0,
			totalSelections: await getUserSelectionsCount(client, userName),
			totalWins: 0,
			totalLosses: 0,
			winRate: 0,
		};
	}

	const totalWins = ratings.reduce((sum, row) => sum + toNumber(row.wins), 0);
	const totalLosses = ratings.reduce((sum, row) => sum + toNumber(row.losses), 0);
	const totalSelections = await getUserSelectionsCount(client, userName);
	const denominator = totalWins + totalLosses;

	return {
		totalRatings: ratings.length,
		totalSelections,
		totalWins,
		totalLosses,
		winRate: denominator > 0 ? roundNumber((totalWins / denominator) * 100) : 0,
	};
}

export const leaderboardAPI = {
	getLeaderboard: async (limit: number | null = 50): Promise<LeaderboardItem[]> => {
		try {
			const client = await getAnalyticsClient();
			if (!client) {
				return [];
			}

			const { data, error } = await client.rpc("get_leaderboard_stats", {
				limit_count: limit || 50,
			});

			if (!error && Array.isArray(data)) {
				return data.map((row: Record<string, unknown>) => mapLeaderboardRow(row));
			}

			const names = await coreAPI.getTrendingNames(false);
			return names.slice(0, limit || 50).map((name) => ({
				name_id: String(name.id),
				name: name.name,
				avg_rating: toNumber(name.avg_rating ?? name.avgRating, 1500),
				wins: toNumber(name.wins),
				total_ratings: toNumber(name.wins) + toNumber(name.losses),
				created_at:
					(typeof name.created_at === "string" ? name.created_at : name.createdAt) ?? null,
				date_submitted: null,
			}));
		} catch {
			return [];
		}
	},
};

export const statsAPI = {
	getSiteStats: async (): Promise<SiteStats | null> => {
		const stats = await supabaseStatsAPI.getSiteStats();
		if (!stats || Object.keys(stats).length === 0) {
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
		timeframe: "day" | "week" | "month" | "year",
	): Promise<EngagementMetrics | null> => {
		try {
			const client = await getAnalyticsClient();
			if (!client) {
				return null;
			}

			const now = new Date();
			const monthStart = getTimeframeStart(now, "month");
			const timeframeStart = getTimeframeStart(now, timeframe);
			const weekStart = getTimeframeStart(now, "week");
			const dayStart = getTimeframeStart(now, "day");

			const { data, error } = await client
				.from("cat_tournament_selections")
				.select("selected_at, tournament_id, user_id, user_name")
				.gte("selected_at", monthStart.toISOString())
				.order("selected_at", { ascending: true });

			if (error) {
				return null;
			}

			const selections = (data ?? []) as SelectionRow[];
			const timeframeSelections = filterSelectionsSince(selections, timeframeStart);
			const daySelections = filterSelectionsSince(selections, dayStart);
			const weekSelections = filterSelectionsSince(selections, weekStart);
			const tournamentGroups = groupSelectionsByTournament(timeframeSelections);
			const totalTournaments = tournamentGroups.size;
			const completedTournaments = [...tournamentGroups.values()].filter(
				(group) => group.count > 1,
			).length;
			const averageTournamentTime = averageTournamentMinutes(tournamentGroups);
			const averageSessionDuration = averageTournamentTime;
			const bounceRate =
				totalTournaments > 0
					? roundNumber(
							([...tournamentGroups.values()].filter((group) => group.count <= 1).length /
								totalTournaments) *
								100,
						)
					: 0;

			return {
				totalTournaments,
				completedTournaments,
				averageTournamentTime,
				totalMatches: timeframeSelections.length,
				peakActiveUsers: getPeakActiveUsers(timeframeSelections),
				dailyActiveUsers: countDistinct(daySelections, (row) => row.user_id),
				weeklyActiveUsers: countDistinct(weekSelections, (row) => row.user_id),
				monthlyActiveUsers: countDistinct(selections, (row) => row.user_id),
				mostActiveHour: getMostActiveHour(timeframeSelections),
				mostActiveDay: getMostActiveDay(timeframeSelections),
				userRetentionRate: getRetentionRate(selections),
				averageSessionDuration,
				totalPageViews: timeframeSelections.length,
				bounceRate,
			};
		} catch {
			return null;
		}
	},

	getDetailedUserStats: async (userName: string): Promise<DetailedUserStats | null> => {
		try {
			const client = await getAnalyticsClient();
			if (!client) {
				return null;
			}

			const baseStats = await statsAPI.getUserStats(userName);
			if (!baseStats) {
				return null;
			}

			const { data, error } = await client
				.from("cat_tournament_selections")
				.select("selected_at, tournament_id, user_id, user_name")
				.eq("user_name", userName)
				.order("selected_at", { ascending: true });

			const selections = error ? [] : ((data ?? []) as SelectionRow[]);
			const groups = groupSelectionsByTournament(selections);
			const lastActiveAt = selections[selections.length - 1]?.selected_at;
			const favoriteNames = (await statsAPI.getUserRatedNames(userName))
				.sort((left, right) => toNumber(right.user_rating) - toNumber(left.user_rating))
				.slice(0, 3)
				.map((item) => item.name);

			const engagementScore = Math.min(
				100,
				baseStats.totalRatings * 5 + baseStats.totalSelections * 2 + baseStats.totalWins,
			);

			return {
				...baseStats,
				lastActiveAt,
				totalTournaments: groups.size,
				completedTournaments: [...groups.values()].filter((group) => group.count > 1).length,
				averageTournamentTime: averageTournamentMinutes(groups),
				favoriteNames,
				preferredCategories: [],
				engagementScore,
			};
		} catch {
			return null;
		}
	},

	getUserRatedNames: async (userName: string): Promise<UserRatedName[]> => {
		try {
			const client = await getAnalyticsClient();
			if (!client) {
				return [];
			}

			const [names, ratings] = await Promise.all([
				coreAPI.getTrendingNames(false),
				getUserRatingRows(client, userName),
			]);

			const ratingMap = new Map<string, UserRatingRow>();
			for (const rating of ratings) {
				ratingMap.set(String(rating.name_id), rating);
			}

			return names.map((item) => {
				const userRating = ratingMap.get(String(item.id));
				return {
					...item,
					user_rating: userRating ? toNumber(userRating.rating, 1500) : null,
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
			const client = await getAnalyticsClient();
			if (!client) {
				return null;
			}

			const [statsResult, totalSelections] = await Promise.all([
				client.rpc("get_user_stats", { p_user_name: userName }),
				getUserSelectionsCount(client, userName),
			]);

			if (statsResult.error || !Array.isArray(statsResult.data) || statsResult.data.length === 0) {
				return getUserStatsFallback(client, userName);
			}

			const stats = statsResult.data[0] as UserStatsRow;
			return {
				totalRatings: toNumber(stats.total_ratings),
				totalSelections,
				totalWins: toNumber(stats.total_wins),
				totalLosses: toNumber(stats.total_losses),
				winRate: toNumber(stats.win_rate),
			};
		} catch {
			return null;
		}
	},
};
