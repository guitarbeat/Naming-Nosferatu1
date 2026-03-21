import { beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_NAMES } from "../../../../shared/fallbackNames";
import { coreAPI } from "./api";
import { resolveSupabaseClient } from "./runtime";

vi.mock("./runtime", () => ({
	resolveSupabaseClient: vi.fn(),
}));

describe("Supabase Service API", () => {
	const mockedResolveSupabaseClient = vi.mocked(resolveSupabaseClient);
	const mockAuthGetUser = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthGetUser.mockResolvedValue({
			data: { user: { id: "user-1", email: "admin@example.com", user_metadata: {} } },
			error: null,
		});
	});

	describe("coreAPI.addName", () => {
		it("returns success when Supabase insert succeeds", async () => {
			const mockSingle = vi.fn().mockResolvedValue({
				data: { id: "1", name: "Test Cat", description: "Desc", avg_rating: 1500 },
				error: null,
			});
			const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
			const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
			const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
			mockedResolveSupabaseClient.mockResolvedValue({
				auth: { getUser: mockAuthGetUser },
				from: mockFrom,
			} as never);

			const result = await coreAPI.addName("Test Cat", "Desc");

			expect(mockFrom).toHaveBeenCalledWith("cat_name_options");
			expect(mockInsert).toHaveBeenCalledWith({
				name: "Test Cat",
				description: "Desc",
				status: "candidate",
			});
			expect(result).toMatchObject({
				success: true,
				status: "committed",
			});
			expect(result.data?.name).toBe("Test Cat");
		});

		it("returns a failed mutation result when Supabase insert fails", async () => {
			const mockSingle = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Duplicate name" },
			});
			const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
			const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
			const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
			mockedResolveSupabaseClient.mockResolvedValue({
				auth: { getUser: mockAuthGetUser },
				from: mockFrom,
			} as never);

			const result = await coreAPI.addName("Duplicate Cat", "Desc");

			expect(result).toEqual({
				success: false,
				status: "failed",
				error: "Duplicate name",
			});
		});
	});

	describe("coreAPI.getTrendingNames", () => {
		it("fetches names from Supabase", async () => {
			const mockLimit = vi.fn().mockResolvedValue({
				data: [{ id: "1", name: "Cat 1", avg_rating: 1600, is_hidden: false, is_active: true }],
				error: null,
			});
			const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
			const mockEq = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnValue({
				eq: mockEq,
				order: mockOrder,
			});
			const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
			mockedResolveSupabaseClient.mockResolvedValue({
				auth: { getUser: mockAuthGetUser },
				from: mockFrom,
			} as never);

			const result = await coreAPI.getTrendingNames(false);

			expect(mockFrom).toHaveBeenCalledWith("cat_name_options");
			expect(mockEq).toHaveBeenCalledWith("is_hidden", false);
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Cat 1");
		});

		it("returns bundled fallback names in development when Supabase is unavailable", async () => {
			mockedResolveSupabaseClient.mockResolvedValue(null);

			const result = await coreAPI.getTrendingNames();

			expect(result).toHaveLength(FALLBACK_NAMES.length);
			expect(result[0]?.name).toBe(FALLBACK_NAMES[0]?.name);
		});
	});

	describe("coreAPI.hideName", () => {
		it("uses the authenticated Supabase RPC path", async () => {
			const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });
			mockedResolveSupabaseClient.mockResolvedValue({
				auth: { getUser: mockAuthGetUser },
				rpc: mockRpc,
			} as never);

			const result = await coreAPI.hideName("admin", "123", true);

			expect(mockAuthGetUser).toHaveBeenCalled();
			expect(mockRpc).toHaveBeenCalledWith("toggle_name_visibility", {
				p_name_id: "123",
				p_hide: true,
			});
			expect(result).toEqual({
				success: true,
				status: "committed",
				data: true,
			});
		});

		it("returns a failed mutation result when there is no Supabase session", async () => {
			mockAuthGetUser.mockResolvedValue({
				data: { user: null },
				error: null,
			});
			mockedResolveSupabaseClient.mockResolvedValue({
				auth: { getUser: mockAuthGetUser },
				rpc: vi.fn(),
			} as never);

			const result = await coreAPI.hideName("admin", "123", true);

			expect(result.success).toBe(false);
			expect(result.status).toBe("failed");
			expect(result.error).toContain("signed-in Supabase session");
		});
	});
});
