import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaQueryList, supportsMatchMedia } from "./mediaQuery";

describe("mediaQuery utilities", () => {
	let originalMatchMedia: typeof window.matchMedia;

	beforeEach(() => {
		originalMatchMedia = window.matchMedia;
	});

	afterEach(() => {
		if (typeof window !== "undefined") {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: originalMatchMedia,
			});
		}
		vi.restoreAllMocks();
	});

	describe("supportsMatchMedia", () => {
		it("returns true when window.matchMedia is available", () => {
			if (
				typeof window !== "undefined" &&
				typeof window.matchMedia === "function"
			) {
				expect(supportsMatchMedia()).toBe(true);
			}
		});

		it("returns false when window.matchMedia is undefined", () => {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: undefined,
			});
			expect(supportsMatchMedia()).toBe(false);
		});
	});

	describe("getMediaQueryList", () => {
		it("returns a MediaQueryList when supported and valid", () => {
			const mockMql = { matches: true } as MediaQueryList;
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: vi.fn().mockReturnValue(mockMql),
			});

			const result = getMediaQueryList("(min-width: 600px)");
			expect(result).toBe(mockMql);
			expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 600px)");
		});

		it("returns null when matchMedia is not supported", () => {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: undefined,
			});

			const result = getMediaQueryList("(min-width: 600px)");
			expect(result).toBeNull();
		});

		it("returns null when matchMedia throws an error", () => {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: vi.fn().mockImplementation(() => {
					throw new Error("Invalid format");
				}),
			});

			const result = getMediaQueryList("(invalid-query)");
			expect(result).toBeNull();
		});
	});
});
