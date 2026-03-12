import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/apiClient";
import { adminAuditAPI, coreAPI, statsAPI } from "./api";
import { resolveSupabaseClient } from "./runtime";

// Mock dependencies
vi.mock("@/services/apiClient", () => ({
	api: {
		post: vi.fn(),
		get: vi.fn(),
		patch: vi.fn(),
	},
}));

vi.mock("./runtime", () => ({
	resolveSupabaseClient: vi.fn(),
}));

describe("Supabase Service API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("coreAPI.addName", () => {
		it("should return success when API call succeeds", async () => {
			const mockResponse = {
				success: true,
				data: { id: 1, name: "Test Cat", description: "Desc", avgRating: 1500 },
			};
			(api.post as any).mockResolvedValue(mockResponse);

			const result = await coreAPI.addName("Test Cat", "Desc");

			expect(api.post).toHaveBeenCalledWith("/names", { name: "Test Cat", description: "Desc" });
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.name).toBe("Test Cat");
		});

		it("should return error when API call fails", async () => {
			const mockResponse = { success: false, error: "Duplicate name" };
			(api.post as any).mockResolvedValue(mockResponse);

			const result = await coreAPI.addName("Duplicate Cat", "Desc");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Duplicate name");
		});

		it("should handle exceptions", async () => {
			(api.post as any).mockRejectedValue(new Error("Network error"));

			const result = await coreAPI.addName("Error Cat", "Desc");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Network error");
		});
	});

	describe("coreAPI.getTrendingNames", () => {
		it("should fetch names from API", async () => {
			const mockNames = [{ id: 1, name: "Cat 1", avg_rating: 1600 }];
			(api.get as any).mockResolvedValue(mockNames);

			const result = await coreAPI.getTrendingNames(false);

			expect(api.get).toHaveBeenCalledWith("/names?includeHidden=false");
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Cat 1");
		});

		it("should fallback to Supabase client on API error (includeHidden=true)", async () => {
			(api.get as any).mockRejectedValue(new Error("API Down"));

			// Mock Supabase client
			const mockData = [{ id: 2, name: "Cat 2", avg_rating: 1500 }];
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
			};
			const mockClient = {
				from: vi.fn().mockReturnValue(mockQuery),
			};
			(resolveSupabaseClient as any).mockResolvedValue(mockClient);

			const result = await coreAPI.getTrendingNames(true);

			expect(resolveSupabaseClient).toHaveBeenCalled();
			expect(mockQuery.eq).not.toHaveBeenCalledWith("is_hidden", false);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Cat 2");
		});

		it("should apply hidden filter in Supabase fallback when includeHidden=false", async () => {
			(api.get as any).mockRejectedValue(new Error("API Down"));

			const mockData = [{ id: 3, name: "Cat 3", avg_rating: 1490 }];
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
			};
			const mockClient = {
				from: vi.fn().mockReturnValue(mockQuery),
			};
			(resolveSupabaseClient as any).mockResolvedValue(mockClient);

			const result = await coreAPI.getTrendingNames(false);

			expect(resolveSupabaseClient).toHaveBeenCalled();
			expect(mockQuery.eq).toHaveBeenCalledWith("is_hidden", false);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Cat 3");
		});

		it("should return empty array if both API and Supabase fail", async () => {
			(api.get as any).mockRejectedValue(new Error("API Down"));
			(resolveSupabaseClient as any).mockResolvedValue(null);

			const result = await coreAPI.getTrendingNames();
			expect(result).toEqual([]);
		});
	});

	describe("coreAPI.getTrendingNamesResult", () => {
		it("should preserve a valid empty Supabase result without masking it as an error", async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({ data: [], error: null }),
			};
			const mockClient = {
				from: vi.fn().mockReturnValue(mockQuery),
			};
			(resolveSupabaseClient as any).mockResolvedValue(mockClient);

			const result = await coreAPI.getTrendingNamesResult(true);

			expect(api.get).not.toHaveBeenCalled();
			expect(result).toEqual({
				data: [],
				error: null,
				source: "supabase",
			});
		});

		it("should expose a joined error message when all name sources fail", async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({ data: null, error: { message: "RPC exploded" } }),
			};
			const mockClient = {
				from: vi.fn().mockReturnValue(mockQuery),
			};
			(resolveSupabaseClient as any).mockResolvedValue(mockClient);
			(api.get as any).mockRejectedValue(new Error("Network down"));

			const result = await coreAPI.getTrendingNamesResult(false);

			expect(result.data).toEqual([]);
			expect(result.source).toBe("unavailable");
			expect(result.error).toContain("Supabase: RPC exploded");
			expect(result.error).toContain("API: Network down");
		});
	});

	describe("coreAPI.hideName", () => {
		// This function tries RPC first, then API patch, then direct DB update.
		// We'll test the primary RPC path.

		it("should hide name using Supabase RPC (primary path)", async () => {
			const mockRpc = vi.fn();
			// First call: set_user_context -> void
			// Second call: toggle_name_visibility -> data: true
			mockRpc
				.mockResolvedValueOnce({ data: null, error: null })
				.mockResolvedValueOnce({ data: true, error: null });

			const mockClient = {
				rpc: mockRpc,
			};
			(resolveSupabaseClient as any).mockResolvedValue(mockClient);

			const result = await coreAPI.hideName("admin", "123", true);

			expect(resolveSupabaseClient).toHaveBeenCalled();
			expect(mockRpc).toHaveBeenCalledTimes(2);
			expect(mockRpc).toHaveBeenNthCalledWith(1, "set_user_context", { user_name_param: "admin" });
			// The second call args are tricky because of "as any" inside the implementation
			// expecting toggle_name_visibility params
			expect(mockRpc).toHaveBeenNthCalledWith(
				2,
				"toggle_name_visibility",
				expect.objectContaining({
					p_name_id: "123",
					p_hide: true,
					p_user_name: "admin",
				}),
			);

			expect(result.success).toBe(true);
		});

		it("should fallback to API patch if RPC fails", async () => {
			// Mock resolveSupabaseClient to fail or return null to trigger fallback?
			// Actually implementation calls resolveSupabaseClient first.
			// If we make rpc fail, it pushes to failures array and continues to API fallback.

			const mockRpc = vi.fn().mockResolvedValue({ error: { message: "RPC failed" } });
			const mockClient = { rpc: mockRpc };
			(resolveSupabaseClient as any).mockResolvedValue(mockClient);

			(api.patch as any).mockResolvedValue({ success: true });

			const result = await coreAPI.hideName("admin", "123", true);

			expect(mockRpc).toHaveBeenCalled();
			expect(api.patch).toHaveBeenCalledWith("/names/123/hide", { isHidden: true });
			expect(result.success).toBe(true);
		});
	});

	describe("adminAuditAPI.getRecentActionsResult", () => {
		it("should map recent admin actions from the audit RPC", async () => {
			const mockRpc = vi.fn().mockResolvedValue({
				data: [
					{
						id: "audit-1",
						created_at: "2026-03-12T09:45:00.000Z",
						operation: "HIDE",
						table_name: "cat_name_options",
						user_name: "admin",
						target_name: "Luna",
						old_values: { id: "123", name: "Luna", is_hidden: false },
						new_values: { id: "123", name: "Luna", is_hidden: true },
					},
				],
				error: null,
			});
			(resolveSupabaseClient as any).mockResolvedValue({ rpc: mockRpc });

			const result = await adminAuditAPI.getRecentActionsResult(5);

			expect(mockRpc).toHaveBeenCalledWith("get_recent_admin_actions", { p_limit: 5 });
			expect(result).toEqual({
				data: [
					{
						id: "audit-1",
						createdAt: "2026-03-12T09:45:00.000Z",
						operation: "HIDE",
						tableName: "cat_name_options",
						userName: "admin",
						targetName: "Luna",
						oldValues: { id: "123", name: "Luna", is_hidden: false },
						newValues: { id: "123", name: "Luna", is_hidden: true },
					},
				],
				error: null,
				source: "supabase",
			});
		});

		it("should surface audit RPC failures without crashing the dashboard", async () => {
			const mockRpc = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Function not found" },
			});
			(resolveSupabaseClient as any).mockResolvedValue({ rpc: mockRpc });

			const result = await adminAuditAPI.getRecentActionsResult(10);

			expect(result).toEqual({
				data: [],
				error: "Function not found",
				source: "supabase",
			});
		});
	});

	describe("statsAPI.getSiteStatsResult", () => {
		it("should expose fetch failures for admin callers", async () => {
			(api.get as any).mockRejectedValue(new Error("Stats unavailable"));

			const result = await statsAPI.getSiteStatsResult();

			expect(result).toEqual({
				data: {},
				error: "Stats unavailable",
				source: "unavailable",
			});
		});
	});
});
