import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import { FALLBACK_NAMES } from "../../../../shared/fallbackNames";
import { coreAPI, ratingsAPI, statsAPI } from "./api";
import { resolveSupabaseClient } from "./runtime";

vi.mock("./runtime", () => ({
	resolveSupabaseClient: vi.fn(),
}));

describe("Supabase service API", () => {
	const mockedResolveSupabaseClient = vi.mocked(resolveSupabaseClient);

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("adds names directly through Supabase", async () => {
		const single = vi.fn().mockResolvedValue({
			data: {
				id: "1",
				name: "Test Cat",
				description: "Desc",
				pronunciation: null,
				avg_rating: 1500,
				created_at: "2026-03-21T00:00:00.000Z",
				is_hidden: false,
				is_active: true,
				locked_in: false,
				status: "candidate",
				provenance: [],
				is_deleted: false,
			},
			error: null,
		});
		const select = vi.fn().mockReturnValue({ single });
		const insert = vi.fn().mockReturnValue({ select });
		const from = vi.fn().mockReturnValue({ insert });

		mockedResolveSupabaseClient.mockResolvedValue({ from } as never);

		const result = await coreAPI.addName("Test Cat", "Desc");

		expect(from).toHaveBeenCalledWith("cat_name_options");
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Test Cat",
				description: "Desc",
				status: "candidate",
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
				data: expect.objectContaining({ name: "Test Cat" }),
			}),
		);
	});

	it("uses Supabase for trending names before falling back to demo data", async () => {
		const query = {
			select: vi.fn(),
			eq: vi.fn(),
			order: vi.fn(),
			limit: vi.fn(),
		};
		query.select.mockReturnValue(query);
		query.eq.mockReturnValue(query);
		query.order.mockReturnValue(query);
		query.limit.mockResolvedValue({
			data: [{ id: "2", name: "Cat 2", avg_rating: 1600, is_hidden: false, is_deleted: false }],
			error: null,
		});
		const from = vi.fn().mockReturnValue(query);

		mockedResolveSupabaseClient.mockResolvedValue({ from } as never);

		const result = await coreAPI.getTrendingNames(false);

		expect(from).toHaveBeenCalledWith("cat_name_options");
		expect(query.eq).toHaveBeenCalledWith("is_hidden", false);
		expect(result).toEqual([expect.objectContaining({ name: "Cat 2" })]);
	});

	it("returns bundled fallback names when Supabase is unavailable", async () => {
		mockedResolveSupabaseClient.mockResolvedValue(null);

		const result = await coreAPI.getTrendingNames();

		expect(result).toHaveLength(FALLBACK_NAMES.length);
		expect(result[0]?.name).toBe(FALLBACK_NAMES[0]?.name);
	});

	it("hides names through Supabase RPCs", async () => {
		const rpc = vi
			.fn()
			.mockResolvedValueOnce({ data: null, error: null })
			.mockResolvedValueOnce({ data: true, error: null });

		mockedResolveSupabaseClient.mockResolvedValue({ rpc } as never);

		const result = await coreAPI.hideName("admin", "123", true);

		expect(rpc).toHaveBeenNthCalledWith(1, "set_user_context", { user_name_param: "admin" });
		expect(rpc).toHaveBeenNthCalledWith(
			2,
			"toggle_name_visibility",
			expect.objectContaining({
				p_name_id: "123",
				p_hide: true,
				p_user_name: "admin",
			}),
		);
		expect(result).toEqual({ success: true });
	});

	it("loads site stats through the Supabase RPC", async () => {
		const rpc = vi.fn().mockResolvedValue({
			data: {
				totalNames: 10,
				activeNames: 8,
				hiddenNames: 2,
				totalUsers: 4,
				totalRatings: 30,
				totalSelections: 12,
				avgRating: 1550,
			},
			error: null,
		});

		mockedResolveSupabaseClient.mockResolvedValue({ rpc } as never);

		const result = await statsAPI.getSiteStats();

		expect(rpc).toHaveBeenCalledWith("get_site_stats");
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

	it("saves ratings directly through Supabase when a user id is available", async () => {
		localStorage.setItem(STORAGE_KEYS.USER_ID, "user-1");
		const upsert = vi.fn().mockResolvedValue({ error: null });
		const from = vi.fn().mockReturnValue({ upsert });

		mockedResolveSupabaseClient.mockResolvedValue({ from } as never);

		const result = await ratingsAPI.saveRatings("Ada", {
			"cat-1": { rating: 1600, wins: 3, losses: 1 },
		});

		expect(from).toHaveBeenCalledWith("cat_name_ratings");
		expect(upsert).toHaveBeenCalledWith(
			[
				{
					user_id: "user-1",
					user_name: "Ada",
					name_id: "cat-1",
					rating: 1600,
					wins: 3,
					losses: 1,
				},
			],
			{ onConflict: "user_id,name_id" },
		);
		expect(result).toEqual({ success: true, count: 1 });
	});

	it("falls back to localStorage for ratings when no Supabase user id is available", async () => {
		mockedResolveSupabaseClient.mockResolvedValue(null);

		const result = await ratingsAPI.saveRatings("Ada", {
			"cat-1": { rating: 1500, wins: 1, losses: 1 },
		});

		expect(result).toEqual({ success: true, count: 1 });
		expect(JSON.parse(localStorage.getItem("ratings_fallback") || "{}")).toEqual(
			expect.objectContaining({
				Ada: expect.objectContaining({
					"cat-1": { rating: 1500, wins: 1, losses: 1 },
					timestamp: expect.any(Number),
				}),
			}),
		);
	});
});
