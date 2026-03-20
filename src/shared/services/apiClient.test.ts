import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./apiClient";

describe("apiClient", () => {
	const originalFetch = global.fetch;
	let fetchMock: any;

	beforeEach(() => {
		fetchMock = vi.fn();
		global.fetch = fetchMock;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.resetAllMocks();
	});

	function createMockResponse(ok: boolean, status: number, jsonValue: any, statusText = "") {
		return {
			ok,
			status,
			statusText,
			json: vi.fn().mockResolvedValue(jsonValue),
		};
	}

	function createMockResponseRejectJson(ok: boolean, status: number, statusText = "") {
		return {
			ok,
			status,
			statusText,
			json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
		};
	}

	function expectJsonRequest(overrides: Record<string, unknown> = {}) {
		return expect.objectContaining({
			headers: { "Content-Type": "application/json" },
			signal: expect.anything(),
			...overrides,
		});
	}

	describe("methods", () => {
		it("api.get constructs correct URL and passes correct method/headers", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, { success: true }));

			const result = await api.get("/test-endpoint");

			expect(fetchMock).toHaveBeenCalledWith("/api/test-endpoint", expectJsonRequest());
			expect(result).toEqual({ success: true });
		});

		it("api.post passes correctly stringified body and POST method", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, { success: true }));

			const payload = { foo: "bar" };
			const result = await api.post("/test-endpoint", payload);

			expect(fetchMock).toHaveBeenCalledWith(
				"/api/test-endpoint",
				expectJsonRequest({
					method: "POST",
					body: JSON.stringify(payload),
				}),
			);
			expect(result).toEqual({ success: true });
		});

		it("api.patch passes correctly stringified body and PATCH method", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, { success: true }));

			const payload = { foo: "bar" };
			const result = await api.patch("/test-endpoint", payload);

			expect(fetchMock).toHaveBeenCalledWith(
				"/api/test-endpoint",
				expectJsonRequest({
					method: "PATCH",
					body: JSON.stringify(payload),
				}),
			);
			expect(result).toEqual({ success: true });
		});

		it("api.delete passes DELETE method", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, { success: true }));

			const result = await api.delete("/test-endpoint");

			expect(fetchMock).toHaveBeenCalledWith(
				"/api/test-endpoint",
				expectJsonRequest({ method: "DELETE" }),
			);
			expect(result).toEqual({ success: true });
		});

		it("does not abort an in-flight request for the same URL when the method differs", async () => {
			let resolveFirstRequest: ((value: unknown) => void) | undefined;
			let firstSignal: AbortSignal | undefined;

			fetchMock.mockImplementationOnce((_url: string, options?: RequestInit) => {
				firstSignal = options?.signal as AbortSignal | undefined;
				return new Promise((resolve) => {
					resolveFirstRequest = resolve;
				});
			});
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, { success: true }));

			const firstRequest = api.get("/test-endpoint");
			await Promise.resolve();
			const secondResult = await api.post("/test-endpoint", { foo: "bar" });

			expect(firstSignal?.aborted).toBe(false);
			resolveFirstRequest?.(createMockResponse(true, 200, { first: true }));

			await expect(firstRequest).resolves.toEqual({ first: true });
			expect(secondResult).toEqual({ success: true });
		});
	});

	describe("error handling", () => {
		it("throws an error with message from error object if ok is false", async () => {
			fetchMock.mockResolvedValueOnce(
				createMockResponse(false, 400, { message: "Bad Request Data" }),
			);

			await expect(api.get("/test-endpoint")).rejects.toThrow("Bad Request Data");
		});

		it("throws an error with error from error object if ok is false", async () => {
			fetchMock.mockResolvedValueOnce(
				createMockResponse(false, 500, { error: "Internal Server Error" }),
			);

			await expect(api.get("/test-endpoint")).rejects.toThrow("Internal Server Error");
		});

		it("throws an error with statusText if ok is false and json parsing fails", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponseRejectJson(false, 502, "Bad Gateway"));

			await expect(api.get("/test-endpoint")).rejects.toThrow("Bad Gateway");
		});

		it("throws an error with fallback message if ok is false, json parsing fails, and no statusText", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponseRejectJson(false, 418));

			await expect(api.get("/test-endpoint")).rejects.toThrow("Request failed: 418");
		});

		it("includes requestUrl in the error message if status is 404", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(false, 404, { message: "Not Found" }));

			await expect(api.get("/test-endpoint")).rejects.toThrow("Not Found (/api/test-endpoint)");
		});
	});

	describe("URL resolution", () => {
		it("adds /api prefix if url starts with /", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, {}));
			await api.get("/path");
			expect(fetchMock).toHaveBeenCalledWith("/api/path", expect.any(Object));
		});

		it("adds /api/ prefix if url does not start with /", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, {}));
			await api.get("path");
			expect(fetchMock).toHaveBeenCalledWith("/api/path", expect.any(Object));
		});

		it("does not add prefix if url is absolute (http)", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, {}));
			await api.get("http://example.com/path");
			expect(fetchMock).toHaveBeenCalledWith("http://example.com/path", expect.any(Object));
		});

		it("does not add prefix if url is absolute (https)", async () => {
			fetchMock.mockResolvedValueOnce(createMockResponse(true, 200, {}));
			await api.get("https://example.com/path");
			expect(fetchMock).toHaveBeenCalledWith("https://example.com/path", expect.any(Object));
		});
	});
});
