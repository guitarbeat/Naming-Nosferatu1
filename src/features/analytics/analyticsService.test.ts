import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardAPI } from "@/services/analytics/analyticsService";
import { api } from "@/services/apiClient";

vi.mock("@/services/apiClient", () => ({
	api: {
		get: vi.fn(),
	},
}));

describe("leaderboardAPI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls analytics leaderboard endpoint and maps rows", async () => {
		const mockRows = [
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
		];

		vi.mocked(api.get).mockResolvedValueOnce(mockRows as never);

		const result = await leaderboardAPI.getLeaderboard(25);

		expect(api.get).toHaveBeenCalledWith("/analytics/leaderboard?limit=25");
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

	it("returns empty array on API failure", async () => {
		vi.mocked(api.get).mockRejectedValueOnce(new Error("boom"));

		const result = await leaderboardAPI.getLeaderboard(50);

		expect(api.get).toHaveBeenCalledWith("/analytics/leaderboard?limit=50");
		expect(result).toEqual([]);
	});
});
