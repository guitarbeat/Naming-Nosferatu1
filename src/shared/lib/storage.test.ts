import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStorageString } from "./storage";

describe("storage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		if (typeof window !== "undefined" && window.localStorage) {
			window.localStorage.clear();
		}
	});

	describe("getStorageString", () => {
		it("returns the value when the key exists in localStorage", () => {
			window.localStorage.setItem("test-key", "test-value");
			expect(getStorageString("test-key")).toBe("test-value");
		});

		it("returns null when the key does not exist and no fallback is provided", () => {
			expect(getStorageString("non-existent-key")).toBeNull();
		});

		it("returns the fallback when the key does not exist and a fallback is provided", () => {
			expect(getStorageString("non-existent-key", "fallback-value")).toBe(
				"fallback-value",
			);
		});

		it("returns the fallback when localStorage.getItem throws an error", () => {
			const getItemSpy = vi
				.spyOn(window.localStorage, "getItem")
				.mockImplementation(() => {
					throw new Error("Storage error");
				});

			expect(getStorageString("error-key", "fallback-value")).toBe(
				"fallback-value",
			);

			getItemSpy.mockRestore();
		});

		it("returns the fallback when storage is not available", () => {
			const originalLocalStorage = window.localStorage;

			Object.defineProperty(window, "localStorage", {
				get: () => {
					throw new Error("Access denied");
				},
				configurable: true,
			});

			expect(getStorageString("unavailable-key", "fallback-value")).toBe(
				"fallback-value",
			);

			Object.defineProperty(window, "localStorage", {
				value: originalLocalStorage,
				configurable: true,
			});
		});
	});
});
