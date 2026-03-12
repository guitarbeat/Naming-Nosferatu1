import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardAPI, statsAPI } from "@/services/analytics/analyticsService";
import { Dashboard } from "./Dashboard";

vi.mock("@/services/analytics/analyticsService", () => ({
	leaderboardAPI: {
		getLeaderboard: vi.fn(),
	},
	statsAPI: {
		getSiteStats: vi.fn(),
		getUserStats: vi.fn(),
		getActivityTrend: vi.fn(),
	},
}));

vi.mock("@/services/supabase/api", () => ({
	coreAPI: {
		getTrendingNames: vi.fn(),
	},
	hiddenNamesAPI: {
		getHiddenNames: vi.fn(),
		unhideName: vi.fn(),
	},
}));

vi.mock("../tournament/components/RandomGenerator", () => ({
	RandomGenerator: () => <div data-testid="random-generator">Random Generator</div>,
}));

vi.mock("./PersonalResults", () => ({
	PersonalResults: () => <div data-testid="personal-results">Personal Results</div>,
}));

describe("Dashboard", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(leaderboardAPI.getLeaderboard).mockResolvedValue([]);
		vi.mocked(statsAPI.getSiteStats).mockResolvedValue({
			totalNames: 10,
			activeNames: 8,
			hiddenNames: 2,
			totalUsers: 5,
			totalRatings: 20,
			totalSelections: 12,
			avgRating: 1510,
		});
		vi.mocked(statsAPI.getUserStats).mockResolvedValue({
			totalRatings: 3,
			totalSelections: 2,
			totalWins: 1,
			winRate: 50,
		});
	});

	it("renders a recent activity trend with daily engagement details", async () => {
		vi.mocked(statsAPI.getActivityTrend).mockResolvedValue([
			{
				date: "2026-03-10",
				selectionCount: 12,
				activeUsers: 4,
				uniqueNames: 6,
			},
			{
				date: "2026-03-11",
				selectionCount: 7,
				activeUsers: 3,
				uniqueNames: 5,
			},
		]);

		render(<Dashboard userName="Aaron" />);

		await waitFor(() => {
			expect(screen.getByText("Selections (14d)")).toBeInTheDocument();
		});

		expect(
			screen.getByText("14-day view of tournament selections and engagement"),
		).toBeInTheDocument();
		expect(screen.getByText("Peak Names Touched")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Mar 10: 12 selections, 4 active users, 6 names touched"),
		).toBeInTheDocument();
		expect(screen.getByText("Updated from recorded tournament selections")).toBeInTheDocument();
	});

	it("renders the empty state when there is no recent activity", async () => {
		vi.mocked(statsAPI.getActivityTrend).mockResolvedValue([
			{
				date: "2026-03-10",
				selectionCount: 0,
				activeUsers: 0,
				uniqueNames: 0,
			},
		]);

		render(<Dashboard userName="Aaron" />);

		await waitFor(() => {
			expect(
				screen.getByText("No tournament selections recorded in the last 14 days."),
			).toBeInTheDocument();
		});

		expect(screen.getByText("Run a tournament to generate recent activity.")).toBeInTheDocument();
	});
});
