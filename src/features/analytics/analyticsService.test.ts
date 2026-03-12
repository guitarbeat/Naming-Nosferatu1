import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardAPI, statsAPI } from "@/services/analytics/analyticsService";
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

describe("statsAPI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("maps site stats from mixed field names", async () => {
		vi.mocked(api.get).mockResolvedValueOnce({
			total_names: 11,
			activeNames: 9,
			hidden_names: 2,
			totalUsers: 6,
			total_ratings: 33,
			totalSelections: 14,
			avg_rating: 1524,
		} as never);

		const result = await statsAPI.getSiteStats();

		expect(api.get).toHaveBeenCalledWith("/analytics/site-stats");
		expect(result).toEqual({
			totalNames: 11,
			activeNames: 9,
			hiddenNames: 2,
			totalUsers: 6,
			totalRatings: 33,
			totalSelections: 14,
			avgRating: 1524,
		});
	});

	it("calls activity trend endpoint and maps mixed field names", async () => {
		vi.mocked(api.get).mockResolvedValueOnce([
			{
				date: "2026-03-10",
				selectionCount: 12,
				active_users: 4,
				uniqueNames: 6,
			},
			{
				date: "2026-03-11",
				selection_count: 9,
				activeUsers: 3,
				unique_names: 5,
			},
		] as never);

		const result = await statsAPI.getActivityTrend(14);

		expect(api.get).toHaveBeenCalledWith("/analytics/activity-trend?days=14");
		expect(result).toEqual([
			{
				date: "2026-03-10",
				selectionCount: 12,
				activeUsers: 4,
				uniqueNames: 6,
			},
			{
				date: "2026-03-11",
				selectionCount: 9,
				activeUsers: 3,
				uniqueNames: 5,
			},
		]);
	});

	it("returns an empty trend on API failure", async () => {
		vi.mocked(api.get).mockRejectedValueOnce(new Error("boom"));

		const result = await statsAPI.getActivityTrend(7);

		expect(api.get).toHaveBeenCalledWith("/analytics/activity-trend?days=7");
		expect(result).toEqual([]);
	});

	it("returns null site stats on API failure", async () => {
		vi.mocked(api.get).mockRejectedValueOnce(new Error("boom"));

		const result = await statsAPI.getSiteStats();

		expect(api.get).toHaveBeenCalledWith("/analytics/site-stats");
		expect(result).toBeNull();
	});
});
