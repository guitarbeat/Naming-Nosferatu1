import { describe, expect, it } from "vitest";
import { calculatePercentile } from "./basic";

describe("calculatePercentile", () => {
	describe("Higher is better (default)", () => {
		it("returns 50 when array is empty", () => {
			expect(calculatePercentile(10, [])).toBe(50);
		});

		it("returns 50 when array has no valid numbers", () => {
			expect(calculatePercentile(10, [null, undefined, NaN] as unknown as number[])).toBe(50);
		});

		it("calculates percentile correctly for simple case", () => {
			// 5, 10, 15. Value 10. Below: 5 (1 item). Total 3. 1/3 = 33%
			expect(calculatePercentile(10, [5, 10, 15])).toBe(33);
		});

		it("calculates 0th percentile for lowest value", () => {
			// 5, 10, 15. Value 5. Below: 0. Total 3. 0/3 = 0%
			expect(calculatePercentile(5, [5, 10, 15])).toBe(0);
		});

		it("calculates percentile for highest value", () => {
			// 5, 10, 15. Value 15. Below: 5, 10. Total 3. 2/3 = 67%
			expect(calculatePercentile(15, [5, 10, 15])).toBe(67);
		});

		it("calculates 100th percentile if value is greater than all values in array", () => {
			// 5, 10. Value 15. Below: 5, 10. Total 2. 2/2 = 100%
			expect(calculatePercentile(15, [5, 10])).toBe(100);
		});

		it("calculates correctly when explicitly passing true", () => {
			expect(calculatePercentile(10, [5, 10, 15], true)).toBe(33);
		});
	});

	describe("Lower is better", () => {
		it("calculates percentile correctly for simple case", () => {
			// 5, 10, 15. Value 10. Above: 15 (1 item). Total 3. 1/3 = 33%
			expect(calculatePercentile(10, [5, 10, 15], false)).toBe(33);
		});

		it("calculates 0th percentile for highest value (worst)", () => {
			// 5, 10, 15. Value 15. Above: 0. Total 3. 0/3 = 0%
			expect(calculatePercentile(15, [5, 10, 15], false)).toBe(0);
		});

		it("calculates percentile for lowest value (best)", () => {
			// 5, 10, 15. Value 5. Above: 10, 15. Total 3. 2/3 = 67%
			expect(calculatePercentile(5, [5, 10, 15], false)).toBe(67);
		});

		it("calculates 100th percentile if value is lower than all values in array (best)", () => {
			// 10, 15. Value 5. Above: 10, 15. Total 2. 2/2 = 100%
			expect(calculatePercentile(5, [10, 15], false)).toBe(100);
		});
	});

	describe("Edge Cases", () => {
		it("ignores null/undefined/NaN values within the array", () => {
			// [5, 10, 15] effectively. Value 10 -> 33%
			expect(
				calculatePercentile(10, [5, null, 10, undefined, 15, NaN] as unknown as number[]),
			).toBe(33);
		});

		it("returns 0 if value is NaN (invalid input)", () => {
			// 5, 10. Value NaN. Below: 0. Total 2.
			expect(calculatePercentile(NaN, [5, 10])).toBe(0);
		});
	});
});
