import { describe, it, expect } from "vitest";
import { getFlameCount } from "./heat";

describe("getFlameCount", () => {
	it("should return the minimum of 3 flames for low streaks", () => {
		expect(getFlameCount(0)).toBe(3);
		expect(getFlameCount(1)).toBe(3);
		expect(getFlameCount(2)).toBe(3);
	});

	it("should scale flames correctly based on the streak", () => {
		expect(getFlameCount(3)).toBe(4); // round(3 * 1.2) = 4
		expect(getFlameCount(4)).toBe(5); // round(4 * 1.2) = 5
		expect(getFlameCount(5)).toBe(6); // round(5 * 1.2) = 6
		expect(getFlameCount(6)).toBe(7); // round(6 * 1.2) = 7
	});

	it("should cap at the default maximum of 8 flames", () => {
		expect(getFlameCount(7)).toBe(8); // round(7 * 1.2) = 8
		expect(getFlameCount(8)).toBe(8); // round(8 * 1.2) = 10, capped at 8
		expect(getFlameCount(10)).toBe(8);
		expect(getFlameCount(100)).toBe(8);
	});

	it("should respect a custom maximum", () => {
		expect(getFlameCount(8, 10)).toBe(10); // round(8 * 1.2) = 10, capped at 10
		expect(getFlameCount(10, 10)).toBe(10); // round(10 * 1.2) = 12, capped at 10
		expect(getFlameCount(10, 5)).toBe(5); // capped at 5
		expect(getFlameCount(100, 20)).toBe(20);
	});

	it("should handle edge cases with negative streaks gracefully", () => {
		// A negative streak theoretically shouldn't happen, but testing the math:
		// round(-1 * 1.2) = -1. max(3, -1) = 3.
		expect(getFlameCount(-1)).toBe(3);
		expect(getFlameCount(-10)).toBe(3);
	});
});
