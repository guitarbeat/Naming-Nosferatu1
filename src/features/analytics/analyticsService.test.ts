import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardAPI, statsAPI } from "@/features/analytics/services/analyticsService";
import { coreAPI, statsAPI as supabaseStatsAPI } from "@/shared/services/supabase/api";
import { resolveSupabaseClient } from "@/shared/services/supabase/runtime";

vi.mock("@/shared/services/supabase/runtime", () => ({
	resolveSupabaseClient: vi.fn(),
}));

vi.mock("@/shared/services/supabase/api", () => ({
	coreAPI: {
		getTrendingNames: vi.fn(),
	},
	statsAPI: {
		getSiteStats: vi.fn(),
	},
}));

describe("analyticsService", () => {
	const mockedResolveSupabaseClient = vi.mocked(resolveSupabaseClient);
	const mockedCoreApi = vi.mocked(coreAPI);
	const mockedSupabaseStatsApi = vi.mocked(supabaseStatsAPI);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("maps leaderboard rows from the Supabase RPC", async () => {
		const rpc = vi.fn().mockResolvedValue({
			data: [
				{
					name_id: "id-1",
					name: "Cat 1",
					avg_rating: 1600,
					wins: 5,
					total_ratings: 10,
					created_at: "2023-01-01",
				},
			],
			error: null,
		});
		mockedResolveSupabaseClient.mockResolvedValue({ rpc } as never);

		const result = await leaderboardAPI.getLeaderboard(25);

		expect(rpc).toHaveBeenCalledWith("get_leaderboard_stats", { limit_count: 25 });
		expect(result).toEqual([
			{
				name_id: "id-1",
				name: "Cat 1",
				avg_rating: 1600,
				wins: 5,
				total_ratings: 10,
				created_at: "2023-01-01",
				date_submitted: null,
			},
		]);
	});

	it("delegates site stats to the shared Supabase stats service", async () => {
		mockedSupabaseStatsApi.getSiteStats.mockResolvedValue({
			totalNames: 10,
			activeNames: 8,
			hiddenNames: 2,
			totalUsers: 4,
			totalRatings: 30,
			totalSelections: 12,
			avgRating: 1550,
		});

		const result = await statsAPI.getSiteStats();

		expect(mockedSupabaseStatsApi.getSiteStats).toHaveBeenCalled();
		expect(result).toEqual({
			totalNames: 10,
			activeNames: 8,
			hiddenNames: 2,
			totalUsers: 4,
			totalRatings: 30,
			totalSelections: 12,
			avgRating: 1550,
		});
	});

	it("builds user stats from the Supabase RPC plus selection counts", async () => {
		const select = vi.fn().mockReturnValue({
			eq: vi.fn().mockResolvedValue({ count: 7, error: null }),
		});
		const from = vi.fn().mockReturnValue({ select });
		const rpc = vi.fn().mockResolvedValue({
			data: [{ total_ratings: 3, total_wins: 9, total_losses: 6, win_rate: 60 }],
			error: null,
		});
		mockedResolveSupabaseClient.mockResolvedValue({ from, rpc } as never);

		const result = await statsAPI.getUserStats("aaron");

		expect(rpc).toHaveBeenCalledWith("get_user_stats", { p_user_name: "aaron" });
		expect(result).toEqual({
			totalRatings: 3,
			totalSelections: 7,
			totalWins: 9,
			totalLosses: 6,
			winRate: 60,
		});
	});

	it("falls back to coreAPI names if the leaderboard RPC is unavailable", async () => {
		mockedResolveSupabaseClient.mockResolvedValue({
			rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("unavailable") }),
		} as never);
		mockedCoreApi.getTrendingNames.mockResolvedValue([
			{ id: "fallback-1", name: "Fallback Cat", avg_rating: 1501, wins: 2, losses: 1 },
		]);

		const result = await leaderboardAPI.getLeaderboard(10);

		expect(result).toEqual([
			{
				name_id: "fallback-1",
				name: "Fallback Cat",
				avg_rating: 1501,
				wins: 2,
				total_ratings: 3,
				created_at: null,
				date_submitted: null,
			},
		]);
	});
});
