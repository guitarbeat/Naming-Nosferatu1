import { beforeEach, describe, expect, it, vi } from "vitest";
import { imagesAPI } from "./api";
import { resolveSupabaseClient } from "./runtime";

vi.mock("./runtime", () => ({
	resolveSupabaseClient: vi.fn(),
}));

describe("imagesAPI", () => {
	const mockedResolveSupabaseClient = vi.mocked(resolveSupabaseClient);

	beforeEach(() => {
		vi.clearAllMocks();
		mockedResolveSupabaseClient.mockReset();
	});

	describe("imagesAPI.list", () => {
		it("should return a list of image names when successful", async () => {
			const mockData = [{ name: "cat1.jpg" }, { name: "cat2.png" }];
			const mockList = vi.fn().mockResolvedValue({ data: mockData, error: null });
			const mockFrom = vi.fn().mockReturnValue({ list: mockList });
			const mockClient = { storage: { from: mockFrom } };

			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await imagesAPI.list();

			expect(mockFrom).toHaveBeenCalledWith("cat-images");
			expect(result).toEqual(["cat1.jpg", "cat2.png"]);
		});

		it("should return empty array when Supabase client is not available", async () => {
			mockedResolveSupabaseClient.mockResolvedValue(null);
			const result = await imagesAPI.list();
			expect(result).toEqual([]);
		});

		it("should return empty array and log error when listing fails", async () => {
			const mockError = { message: "Bucket not found" };
			const mockList = vi.fn().mockResolvedValue({ data: null, error: mockError });
			const mockFrom = vi.fn().mockReturnValue({ list: mockList });
			const mockClient = { storage: { from: mockFrom } };

			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await imagesAPI.list();
			expect(result).toEqual([]);
		});
	});

	describe("imagesAPI.upload", () => {
		const mockFile = new File(["dummy content"], "test-cat.jpg", {
			type: "image/jpeg",
		});
		const userName = "test-admin";

		it("should upload a file and return the public URL on success", async () => {
			const mockUpload = vi.fn().mockResolvedValue({ data: { path: "some-path" }, error: null });
			const mockGetPublicUrl = vi.fn().mockReturnValue({
				data: { publicUrl: "https://example.com/test-cat.jpg" },
			});
			const mockFrom = vi.fn().mockReturnValue({
				upload: mockUpload,
				getPublicUrl: mockGetPublicUrl,
			});
			const mockClient = { storage: { from: mockFrom } };

			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await imagesAPI.upload(mockFile, userName);

			expect(mockFrom).toHaveBeenCalledWith("cat-images");
			expect(mockUpload).toHaveBeenCalledWith(
				expect.stringMatching(new RegExp(`^${userName}_\\d+_\\w+\\.jpg$`)),
				mockFile,
				expect.objectContaining({ upsert: false }),
			);
			expect(result.success).toBe(true);
			expect(result.path).toBe("https://example.com/test-cat.jpg");
			expect(result.error).toBeNull();
		});

		it("should fail if file size exceeds 5MB", async () => {
			const mockFrom = vi.fn();
			const mockClient = { storage: { from: mockFrom } };
			const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], "large.jpg", {
				type: "image/jpeg",
			});
			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await imagesAPI.upload(largeFile, userName);

			expect(result.success).toBe(false);
			expect(result.error).toBe("File size exceeds 5MB limit");
			expect(mockFrom).not.toHaveBeenCalled();
		});

		it("should fail if file type is not allowed", async () => {
			const mockFrom = vi.fn();
			const mockClient = { storage: { from: mockFrom } };
			const invalidFile = new File(["dummy content"], "test.pdf", {
				type: "application/pdf",
			});
			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await imagesAPI.upload(invalidFile, userName);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Only JPEG, PNG, GIF, and WebP images are allowed");
			expect(mockFrom).not.toHaveBeenCalled();
		});

		it("should return error when Supabase client is not available", async () => {
			mockedResolveSupabaseClient.mockResolvedValue(null);
			const result = await imagesAPI.upload(mockFile, userName);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Storage client not available");
		});

		it("should return error when upload fails", async () => {
			const mockError = { message: "Network error" };
			const mockUpload = vi.fn().mockResolvedValue({ data: null, error: mockError });
			const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });
			const mockClient = { storage: { from: mockFrom } };

			mockedResolveSupabaseClient.mockResolvedValue(mockClient);

			const result = await imagesAPI.upload(mockFile, userName);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Network error");
		});
	});
});
