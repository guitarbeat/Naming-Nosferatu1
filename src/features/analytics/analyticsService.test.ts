import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardAPI } from "@/features/analytics/services/analyticsService";
import { coreAPI, resolveSupabaseClient } from "@/shared/services/supabase";

vi.mock("@/shared/services/supabase", () => ({
	coreAPI: {
		getTrendingNames: vi.fn(),
	},
	resolveSupabaseClient: vi.fn(),
}));

describe("leaderboardAPI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls the Supabase leaderboard RPC and maps rows", async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			data: [
				{
					name_id: "id-1",
					name: "Cat 1",
					avg_rating: 1600,
					wins: 5,
					total_ratings: 10,
					created_at: "2023-01-01",
				},
				{
					id: "id-2",
					name: "Cat 2",
					avg_rating: 1500,
					wins: 0,
					total_ratings: 0,
					date_submitted: "2023-01-02",
				},
			],
			error: null,
		});

		vi.mocked(resolveSupabaseClient).mockResolvedValue({
			rpc: mockRpc,
		} as never);

		const result = await leaderboardAPI.getLeaderboard(25);

		expect(mockRpc).toHaveBeenCalledWith("get_leaderboard_stats", { limit_count: 25 });
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
			{
				name_id: "id-2",
				name: "Cat 2",
				avg_rating: 1500,
				wins: 0,
				total_ratings: 0,
				created_at: null,
				date_submitted: "2023-01-02",
			},
		]);
	});

	it("returns fallback leaderboard data when the RPC fails", async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: "boom" },
		});

		vi.mocked(resolveSupabaseClient).mockResolvedValue({
			rpc: mockRpc,
		} as never);
		vi.mocked(coreAPI.getTrendingNames).mockResolvedValue([
			{
				id: "fallback-1",
				name: "Fallback Cat",
				avg_rating: 1500,
			},
		] as never);

		const result = await leaderboardAPI.getLeaderboard(50);

		expect(mockRpc).toHaveBeenCalledWith("get_leaderboard_stats", { limit_count: 50 });
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]).toMatchObject({
			avg_rating: 1500,
			total_ratings: 0,
			wins: 0,
		});
	});
});
