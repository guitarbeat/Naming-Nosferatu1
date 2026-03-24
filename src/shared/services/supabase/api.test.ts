import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/shared/services/apiClient";
import { FALLBACK_NAMES } from "../../../../shared/fallbackNames";
import { coreAPI } from "./api";
import { resolveSupabaseClient } from "./runtime";

// Mock dependencies
vi.mock("@/shared/services/apiClient", () => ({
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
	const mockedApi = vi.mocked(api);
	const mockedResolveSupabaseClient = vi.mocked(resolveSupabaseClient);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("coreAPI.addName", () => {
		it("should return success when API call succeeds", async () => {
			const mockResponse = {
				success: true,
				data: { id: 1, name: "Test Cat", description: "Desc", avgRating: 1500 },
			};
			mockedApi.post.mockResolvedValue(mockResponse);

			const result = await coreAPI.addName("Test Cat", "Desc");

			expect(api.post).toHaveBeenCalledWith("/names", { name: "Test Cat", description: "Desc" });
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.name).toBe("Test Cat");
		});

		it("should return error when API call fails", async () => {
			const mockResponse = { success: false, error: "Duplicate name" };
			mockedApi.post.mockResolvedValue(mockResponse);

			const result = await coreAPI.addName("Duplicate Cat", "Desc");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Duplicate name");
		});

		it("should handle exceptions", async () => {
			mockedApi.post.mockRejectedValue(new Error("Network error"));

			const result = await coreAPI.addName("Error Cat", "Desc");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Network error");
		});
	});

	describe("coreAPI.getTrendingNames", () => {
		it("should fetch names from API", async () => {
			const mockNames = [{ id: 1, name: "Cat 1", avg_rating: 1600 }];
			mockedApi.get.mockResolvedValue(mockNames);

			const result = await coreAPI.getTrendingNames(false);

			expect(api.get).toHaveBeenCalledWith("/names?includeHidden=false");
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Cat 1");
		});

		it("should fallback to Supabase client on API error (includeHidden=true)", async () => {
			mockedApi.get.mockRejectedValue(new Error("API Down"));

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
			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await coreAPI.getTrendingNames(true);

			expect(resolveSupabaseClient).toHaveBeenCalled();
			expect(mockQuery.eq).not.toHaveBeenCalledWith("is_hidden", false);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Cat 2");
		});

		it("should apply hidden filter in Supabase fallback when includeHidden=false", async () => {
			mockedApi.get.mockRejectedValue(new Error("API Down"));

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
			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await coreAPI.getTrendingNames(false);

			expect(resolveSupabaseClient).toHaveBeenCalled();
			expect(mockQuery.eq).toHaveBeenCalledWith("is_hidden", false);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Cat 3");
		});

		it("should return bundled fallback names if both API and Supabase fail", async () => {
			mockedApi.get.mockRejectedValue(new Error("API Down"));
			mockedResolveSupabaseClient.mockResolvedValue(null);

			const result = await coreAPI.getTrendingNames();
			expect(result).toHaveLength(FALLBACK_NAMES.length);
			expect(result[0]?.name).toBe(FALLBACK_NAMES[0]?.name);
		});

		it("shares one in-flight request across concurrent callers", async () => {
			let releaseRequest: (() => void) | null = null;
			mockedResolveSupabaseClient.mockResolvedValue(null);
			mockedApi.get.mockImplementation(
				() =>
					new Promise((_resolve, reject) => {
						releaseRequest = () => reject(new Error("API Down"));
					}),
			);

			const firstRequest = coreAPI.getTrendingNames(true);
			const secondRequest = coreAPI.getTrendingNames(true);
			await Promise.resolve();
			await Promise.resolve();
			releaseRequest?.();

			const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);

			expect(api.get).toHaveBeenCalledTimes(1);
			expect(firstResult).toEqual(secondResult);
			expect(firstResult).toHaveLength(FALLBACK_NAMES.length);
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
			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await coreAPI.hideName("admin", "123", true);

			expect(resolveSupabaseClient).toHaveBeenCalled();
			expect(mockRpc).toHaveBeenCalledTimes(2);
			expect(mockRpc).toHaveBeenNthCalledWith(1, "set_user_context", { user_name_param: "admin" });
			// The second call args are tricky because of the RPC argument shape checks
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
			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			mockedApi.patch.mockResolvedValue({ success: true });

			const result = await coreAPI.hideName("admin", "123", true);

			expect(mockRpc).toHaveBeenCalled();
			expect(api.patch).toHaveBeenCalledWith("/names/123/hide", { isHidden: true });
			expect(result.success).toBe(true);
		});
	});
});
