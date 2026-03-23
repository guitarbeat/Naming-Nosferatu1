import { describe, expect, it } from "vitest";
import type { NameItem } from "@/shared/types";
import {
	calculatePercentile,
	cn,
	getActiveNames,
	getHiddenNames,
	getLockedNames,
	getVisibleNames,
	isNameActive,
	isNameHidden,
	isNameLocked,
	matchesNameSearchTerm,
} from "./basic";

describe("cn", () => {
	it("merges basic classes", () => {
		expect(cn("class1", "class2")).toBe("class1 class2");
	});

	it("merges conditional classes", () => {
		expect(cn("class1", true && "class2", false && "class3")).toBe("class1 class2");
	});

	it("merges and overrides tailwind classes correctly", () => {
		expect(cn("px-2 py-1", "p-4")).toBe("p-4");
		expect(cn("text-sm", "text-lg")).toBe("text-lg");
		expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
	});

	it("handles arrays and objects", () => {
		expect(cn(["class1", "class2"])).toBe("class1 class2");
		expect(cn({ class1: true, class2: false, class3: true })).toBe("class1 class3");
		expect(cn(["class1"], { class2: true })).toBe("class1 class2");
	});

	it("ignores falsy values", () => {
		expect(cn("class1", null, undefined, false, 0, "", "class2")).toBe("class1 class2");
	});
});

describe("getVisibleNames", () => {
	it("returns an empty array when input is null or undefined", () => {
		expect(getVisibleNames(null)).toEqual([]);
		expect(getVisibleNames(undefined)).toEqual([]);
	});

	it("returns an empty array when input is not an array", () => {
		// @ts-expect-error Testing invalid runtime inputs
		expect(getVisibleNames("not an array")).toEqual([]);
		// @ts-expect-error Testing invalid runtime inputs
		expect(getVisibleNames({ length: 5 })).toEqual([]);
	});

	it("returns all items when none are hidden", () => {
		const names = [
			{ id: 1, name: "Mittens" },
			{ id: 2, name: "Socks", isHidden: false },
			{ id: 3, name: "Luna", is_hidden: false },
			{ id: 4, name: "Bella", isHidden: undefined, is_hidden: null },
		] as unknown as NameItem[];
		expect(getVisibleNames(names)).toEqual(names);
	});

	it("filters out items where isHidden is true", () => {
		const names = [
			{ id: 1, name: "Mittens", isHidden: true },
			{ id: 2, name: "Socks", isHidden: false },
		] as unknown as NameItem[];
		expect(getVisibleNames(names)).toEqual([{ id: 2, name: "Socks", isHidden: false }]);
	});

	it("filters out items where is_hidden is true", () => {
		const names = [
			{ id: 1, name: "Mittens", is_hidden: true },
			{ id: 2, name: "Socks", is_hidden: false },
		] as unknown as NameItem[];
		expect(getVisibleNames(names)).toEqual([{ id: 2, name: "Socks", is_hidden: false }]);
	});

	it("filters out items when either hidden flag is true", () => {
		const names = [
			{ id: 1, name: "Mittens", isHidden: true, is_hidden: false },
			{ id: 2, name: "Socks", isHidden: false, is_hidden: true },
			{ id: 3, name: "Luna", isHidden: true, is_hidden: true },
			{ id: 4, name: "Bella", isHidden: false, is_hidden: false },
		] as unknown as NameItem[];
		expect(getVisibleNames(names)).toEqual([
			{ id: 4, name: "Bella", isHidden: false, is_hidden: false },
		]);
	});
});

describe("getActiveNames", () => {
	it("returns visible, unlocked names", () => {
		const names = [
			{ id: 1, name: "Mittens", isHidden: false },
			{ id: 2, name: "Socks", isHidden: true },
			{ id: 3, name: "Luna", lockedIn: true },
		] as unknown as NameItem[];
		expect(getActiveNames(names).map((name) => name.id)).toEqual([1]);
	});
});

describe("getHiddenNames", () => {
	it("returns only hidden names", () => {
		const names = [
			{ id: 1, name: "Mittens", is_hidden: true },
			{ id: 2, name: "Socks", isHidden: false },
		] as unknown as NameItem[];
		expect(getHiddenNames(names).map((name) => name.id)).toEqual([1]);
	});
});

describe("getLockedNames", () => {
	it("returns only locked names", () => {
		const names = [
			{ id: 1, name: "Mittens", locked_in: true },
			{ id: 2, name: "Socks", lockedIn: false },
		] as unknown as NameItem[];
		expect(getLockedNames(names).map((name) => name.id)).toEqual([1]);
	});
});

describe("isNameHidden", () => {
	it("reads both camelCase and snake_case hidden flags", () => {
		expect(isNameHidden({ id: 1, name: "Cat", isHidden: true } as NameItem)).toBe(true);
		expect(isNameHidden({ id: 2, name: "Cat", is_hidden: true } as NameItem)).toBe(true);
		expect(isNameHidden({ id: 3, name: "Cat" } as NameItem)).toBe(false);
	});
});

describe("isNameLocked", () => {
	it("reads both camelCase and snake_case locked flags", () => {
		expect(isNameLocked({ id: 1, name: "Cat", lockedIn: true } as NameItem)).toBe(true);
		expect(isNameLocked({ id: 2, name: "Cat", locked_in: true } as NameItem)).toBe(true);
		expect(isNameLocked({ id: 3, name: "Cat" } as NameItem)).toBe(false);
	});
});

describe("isNameActive", () => {
	it("returns true only when name is neither hidden nor locked", () => {
		expect(isNameActive({ id: 1, name: "Cat" } as NameItem)).toBe(true);
		expect(isNameActive({ id: 2, name: "Cat", isHidden: true } as NameItem)).toBe(false);
		expect(isNameActive({ id: 3, name: "Cat", lockedIn: true } as NameItem)).toBe(false);
		expect(
			isNameActive({
				id: 4,
				name: "Cat",
				is_hidden: false,
				locked_in: false,
			} as NameItem),
		).toBe(true);
	});
});

describe("matchesNameSearchTerm", () => {
	const catName = {
		id: 1,
		name: "Mittens",
		description: "Fluffy orange cat",
	} as NameItem;

	it("matches on name and description", () => {
		expect(matchesNameSearchTerm(catName, "Mittens")).toBe(true);
		expect(matchesNameSearchTerm(catName, "orange")).toBe(true);
		expect(matchesNameSearchTerm(catName, "absent")).toBe(false);
	});

	it("handles empty search terms and null-safe inputs", () => {
		expect(matchesNameSearchTerm(catName, "")).toBe(true);
		expect(matchesNameSearchTerm(null, "cat")).toBe(false);
	});
});

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
