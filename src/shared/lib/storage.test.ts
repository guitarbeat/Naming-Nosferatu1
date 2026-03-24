import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStorageString, isStorageAvailable } from "./storage";

describe("getStorageString", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns the value when the key exists in localStorage", () => {
		const spy = vi
			.spyOn(Storage.prototype, "getItem")
			.mockReturnValue("test_value");
		expect(getStorageString("test_key")).toBe("test_value");
		expect(spy).toHaveBeenCalledWith("test_key");
	});

	it("returns null when the key does not exist and no fallback is provided", () => {
		const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
		expect(getStorageString("missing_key")).toBeNull();
		expect(spy).toHaveBeenCalledWith("missing_key");
	});

	it("returns null when the key does not exist, even if a fallback is provided", () => {
		// If the key doesn't exist, window.localStorage.getItem returns null.
		// It does not throw an error, so the catch block is not executed.
		// getStorageString explicitly returns the result of getItem without checking for null.
		const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
		expect(getStorageString("missing_key", "fallback_value")).toBeNull();
		expect(spy).toHaveBeenCalledWith("missing_key");
	});

	it("returns the fallback when localStorage.getItem throws an error", () => {
		const spy = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => {
				throw new Error("QuotaExceededError");
			});
		expect(getStorageString("error_key", "fallback_value")).toBe(
			"fallback_value",
		);
		expect(spy).toHaveBeenCalledWith("error_key");
	});

	it("returns the fallback when storage is not available (window is undefined)", () => {
		const originalWindow = globalThis.window;
		// @ts-expect-error
		delete globalThis.window;

		expect(isStorageAvailable()).toBe(false);
		expect(getStorageString("test_key", "fallback_value")).toBe(
			"fallback_value",
		);

		globalThis.window = originalWindow;
	});

	it("returns the fallback when storage is not available (localStorage is undefined)", () => {
		const originalLocalStorage = globalThis.window.localStorage;
		Object.defineProperty(globalThis.window, "localStorage", {
			value: undefined,
			configurable: true,
		});

		expect(isStorageAvailable()).toBe(false);
		expect(getStorageString("test_key", "fallback_value")).toBe(
			"fallback_value",
		);

		Object.defineProperty(globalThis.window, "localStorage", {
			value: originalLocalStorage,
			configurable: true,
		});
	});

	it("returns the fallback when accessing window.localStorage throws an error", () => {
		const originalLocalStorage = globalThis.window.localStorage;
		Object.defineProperty(globalThis.window, "localStorage", {
			get: () => {
				throw new Error("SecurityError: The operation is insecure.");
			},
			configurable: true,
		});

		expect(isStorageAvailable()).toBe(false);
		expect(getStorageString("test_key", "fallback_value")).toBe(
			"fallback_value",
		);

		Object.defineProperty(globalThis.window, "localStorage", {
			value: originalLocalStorage,
			configurable: true,
		});
	});
});
