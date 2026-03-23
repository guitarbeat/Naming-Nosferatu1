import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
	isStorageAvailable,
	getStorageString,
	setStorageString,
	removeStorageItem,
	parseJsonValue,
	readStorageJson,
	writeStorageJson,
	clearUserStorage,
} from "./storage";
import { STORAGE_KEYS } from "./constants";

describe("Storage Utilities", () => {
	let originalWindow: typeof window | undefined;

	beforeEach(() => {
		originalWindow = globalThis.window;
		vi.clearAllMocks();
		if (globalThis.window?.localStorage) {
			globalThis.window.localStorage.clear();
		}
	});

	afterEach(() => {
		globalThis.window = originalWindow as typeof window;
		vi.restoreAllMocks();
	});

	describe("isStorageAvailable", () => {
		it("returns true when localStorage is available", () => {
			expect(isStorageAvailable()).toBe(true);
		});

		it("returns false when window is undefined", () => {
			const tempWindow = globalThis.window;
			// @ts-ignore
			delete globalThis.window;

			expect(isStorageAvailable()).toBe(false);

			globalThis.window = tempWindow;
		});

		it("returns false when window.localStorage is undefined", () => {
			const tempLocalStorage = globalThis.window.localStorage;
			// @ts-ignore
			delete globalThis.window.localStorage;

			expect(isStorageAvailable()).toBe(false);

			// @ts-ignore
			globalThis.window.localStorage = tempLocalStorage;
		});

		it("returns false when localStorage access throws", () => {
			const tempLocalStorage = globalThis.window.localStorage;
			Object.defineProperty(globalThis.window, "localStorage", {
				get() {
					throw new Error("Access denied");
				},
				configurable: true,
			});

			expect(isStorageAvailable()).toBe(false);

			Object.defineProperty(globalThis.window, "localStorage", {
				value: tempLocalStorage,
				configurable: true,
			});
		});
	});

	describe("getStorageString", () => {
		it("returns fallback if storage is unavailable", () => {
			const tempLocalStorage = globalThis.window.localStorage;
			// @ts-ignore
			delete globalThis.window.localStorage;

			expect(getStorageString("test-key", "default")).toBe("default");

			// @ts-ignore
			globalThis.window.localStorage = tempLocalStorage;
		});

		it("returns value if it exists in localStorage", () => {
			globalThis.window.localStorage.setItem("test-key", "test-value");
			expect(getStorageString("test-key")).toBe("test-value");
		});

		it("returns null if value does not exist and no fallback is provided", () => {
			expect(getStorageString("test-key")).toBe(null);
		});

		it("returns fallback if localStorage.getItem throws", () => {
			const tempGetItem = globalThis.window.localStorage.getItem;
			globalThis.window.localStorage.getItem = () => {
				throw new Error("Quota exceeded");
			};

			expect(getStorageString("test-key", "fallback")).toBe("fallback");

			globalThis.window.localStorage.getItem = tempGetItem;
		});
	});

	describe("setStorageString", () => {
		it("does nothing if storage is unavailable", () => {
			const tempLocalStorage = globalThis.window.localStorage;
			// @ts-ignore
			delete globalThis.window.localStorage;

			setStorageString("test-key", "test-value"); // Should not throw

			// @ts-ignore
			globalThis.window.localStorage = tempLocalStorage;
		});

		it("sets value in localStorage", () => {
			setStorageString("test-key", "test-value");
			expect(globalThis.window.localStorage.getItem("test-key")).toBe("test-value");
		});

		it("silently catches errors when localStorage.setItem throws", () => {
			const tempSetItem = globalThis.window.localStorage.setItem;
			globalThis.window.localStorage.setItem = () => {
				throw new Error("Quota exceeded");
			};

			expect(() => setStorageString("test-key", "test-value")).not.toThrow();

			globalThis.window.localStorage.setItem = tempSetItem;
		});
	});

	describe("removeStorageItem", () => {
		it("does nothing if storage is unavailable", () => {
			const tempLocalStorage = globalThis.window.localStorage;
			// @ts-ignore
			delete globalThis.window.localStorage;

			removeStorageItem("test-key"); // Should not throw

			// @ts-ignore
			globalThis.window.localStorage = tempLocalStorage;
		});

		it("removes value from localStorage", () => {
			globalThis.window.localStorage.setItem("test-key", "test-value");
			removeStorageItem("test-key");
			expect(globalThis.window.localStorage.getItem("test-key")).toBe(null);
		});

		it("silently catches errors when localStorage.removeItem throws", () => {
			const tempRemoveItem = globalThis.window.localStorage.removeItem;
			globalThis.window.localStorage.removeItem = () => {
				throw new Error("Access denied");
			};

			expect(() => removeStorageItem("test-key")).not.toThrow();

			globalThis.window.localStorage.removeItem = tempRemoveItem;
		});
	});

	describe("parseJsonValue", () => {
		it("returns fallback if value is null", () => {
			expect(parseJsonValue(null, { a: 1 })).toEqual({ a: 1 });
		});

		it("parses valid JSON string", () => {
			expect(parseJsonValue('{"a":1}', { b: 2 })).toEqual({ a: 1 });
			expect(parseJsonValue("true", false)).toBe(true);
			expect(parseJsonValue("123", 0)).toBe(123);
			expect(parseJsonValue('"string"', "")).toBe("string");
		});

		it("returns fallback if JSON parsing throws", () => {
			expect(parseJsonValue('{"a":1', { fallback: true })).toEqual({ fallback: true });
			expect(parseJsonValue("undefined", "fallback")).toBe("fallback");
		});
	});

	describe("readStorageJson", () => {
		it("returns fallback if value is not in localStorage", () => {
			expect(readStorageJson("test-key", { fallback: true })).toEqual({ fallback: true });
		});

		it("returns parsed JSON value if it exists in localStorage", () => {
			globalThis.window.localStorage.setItem("test-key", '{"data": "value"}');
			expect(readStorageJson("test-key", { fallback: true })).toEqual({ data: "value" });
		});

		it("returns fallback if value in localStorage is invalid JSON", () => {
			globalThis.window.localStorage.setItem("test-key", "invalid-json");
			expect(readStorageJson("test-key", { fallback: true })).toEqual({ fallback: true });
		});
	});

	describe("writeStorageJson", () => {
		it("does nothing if storage is unavailable", () => {
			const tempLocalStorage = globalThis.window.localStorage;
			// @ts-ignore
			delete globalThis.window.localStorage;

			writeStorageJson("test-key", { data: "value" }); // Should not throw

			// @ts-ignore
			globalThis.window.localStorage = tempLocalStorage;
		});

		it("sets JSON string in localStorage", () => {
			writeStorageJson("test-key", { data: "value" });
			expect(globalThis.window.localStorage.getItem("test-key")).toBe('{"data":"value"}');
		});

		it("silently catches errors when localStorage.setItem throws", () => {
			const tempSetItem = globalThis.window.localStorage.setItem;
			globalThis.window.localStorage.setItem = () => {
				throw new Error("Quota exceeded");
			};

			expect(() => writeStorageJson("test-key", { data: "value" })).not.toThrow();

			globalThis.window.localStorage.setItem = tempSetItem;
		});
	});

	describe("clearUserStorage", () => {
		it("removes all specified keys from localStorage", () => {
			// Setup some data
			globalThis.window.localStorage.setItem(STORAGE_KEYS.USER, "user");
			globalThis.window.localStorage.setItem(STORAGE_KEYS.USER_ID, "user-id");
			globalThis.window.localStorage.setItem(STORAGE_KEYS.THEME, "dark");
			globalThis.window.localStorage.setItem("ratings_fallback", "fallback");
			globalThis.window.localStorage.setItem("other-key", "keep-me");

			clearUserStorage();

			expect(globalThis.window.localStorage.getItem(STORAGE_KEYS.USER)).toBe(null);
			expect(globalThis.window.localStorage.getItem(STORAGE_KEYS.USER_ID)).toBe(null);
			expect(globalThis.window.localStorage.getItem(STORAGE_KEYS.THEME)).toBe(null);
			expect(globalThis.window.localStorage.getItem("ratings_fallback")).toBe(null);

			// Should not remove unspecified keys
			expect(globalThis.window.localStorage.getItem("other-key")).toBe("keep-me");
		});
	});
});
