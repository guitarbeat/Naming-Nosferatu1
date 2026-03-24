import { describe, it, expect } from "vitest";
import { buildInitialRatings } from "./tournamentPersistence";
import { ELO_RATING } from "@/shared/lib/constants";
import type { NameItem } from "@/shared/types";

describe("buildInitialRatings", () => {
	it("should return an empty object for an empty array", () => {
		const result = buildInitialRatings([]);
		expect(result).toEqual({});
	});

	it("should assign the default rating to names without a rating", () => {
		const names: Partial<NameItem>[] = [
			{ id: "1", name: "Cat 1" },
			{ id: 2, name: "Cat 2" },
		];
		const result = buildInitialRatings(names as NameItem[]);

		expect(result).toEqual({
			"1": ELO_RATING.DEFAULT_RATING,
			"2": ELO_RATING.DEFAULT_RATING,
		});
	});

	it("should use the provided rating if available", () => {
		const names: Partial<NameItem>[] = [
			{ id: "1", name: "Cat 1", rating: 1200 },
			{ id: "2", name: "Cat 2", rating: 1800 },
		];
		const result = buildInitialRatings(names as NameItem[]);

		expect(result).toEqual({
			"1": 1200,
			"2": 1800,
		});
	});

	it("should handle a mix of provided and default ratings", () => {
		const names: Partial<NameItem>[] = [
			{ id: "1", name: "Cat 1", rating: 1400 },
			{ id: "2", name: "Cat 2" },
			{ id: "3", name: "Cat 3", rating: 0 }, // Falsy rating but is a number? Wait, `rating || DEFAULT` means 0 will become DEFAULT.
		];
		const result = buildInitialRatings(names as NameItem[]);

		expect(result).toEqual({
			"1": 1400,
			"2": ELO_RATING.DEFAULT_RATING,
			"3": ELO_RATING.DEFAULT_RATING, // because 0 || DEFAULT_RATING is DEFAULT_RATING
		});
	});

	it("should convert numeric ids to strings correctly", () => {
		const names: Partial<NameItem>[] = [
			{ id: 100, name: "Cat 100", rating: 1550 },
		];
		const result = buildInitialRatings(names as NameItem[]);

		expect(result).toEqual({
			"100": 1550,
		});
	});
});
