import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePersonalResults } from "./usePersonalResults";
import type { NameItem } from "@/shared/types";

describe("usePersonalResults", () => {
	it("returns empty rankings when personalRatings is undefined", () => {
		const { result } = renderHook(() => usePersonalResults({ personalRatings: undefined }));
		expect(result.current.rankings).toEqual([]);
	});

	it("processes legacy ratings (numbers) correctly", () => {
		const personalRatings = {
			Fluffy: 1600,
			Mittens: 1400,
		};
		const { result } = renderHook(() => usePersonalResults({ personalRatings }));

		expect(result.current.rankings).toEqual([
			{ name: "Fluffy", rating: 1600, wins: 0, losses: 0, id: undefined },
			{ name: "Mittens", rating: 1400, wins: 0, losses: 0, id: undefined },
		]);
	});

	it("processes standard ratings (objects) correctly", () => {
		const personalRatings = {
			Fluffy: { rating: 1600, wins: 5, losses: 2 },
			Mittens: { rating: 1400, wins: 1, losses: 4 },
		};
		const { result } = renderHook(() => usePersonalResults({ personalRatings }));

		expect(result.current.rankings).toEqual([
			{ name: "Fluffy", rating: 1600, wins: 5, losses: 2, id: undefined },
			{ name: "Mittens", rating: 1400, wins: 1, losses: 4, id: undefined },
		]);
	});

	it("maps names to IDs using currentTournamentNames", () => {
		const personalRatings = {
			Fluffy: { rating: 1600, wins: 5, losses: 2 },
			Mittens: { rating: 1400, wins: 1, losses: 4 },
			Unknown: { rating: 1500, wins: 0, losses: 0 },
		};
		const currentTournamentNames: NameItem[] = [
			{ id: "id-1", name: "Fluffy" },
			{ id: "id-2", name: "Mittens" },
		];
		const { result } = renderHook(() =>
			usePersonalResults({ personalRatings, currentTournamentNames }),
		);

		expect(result.current.rankings).toEqual([
			{ name: "Fluffy", rating: 1600, wins: 5, losses: 2, id: "id-1" },
			{ name: "Unknown", rating: 1500, wins: 0, losses: 0, id: undefined },
			{ name: "Mittens", rating: 1400, wins: 1, losses: 4, id: "id-2" },
		]);
	});

	it("sorts the results by rating in descending order", () => {
		const personalRatings = {
			Third: { rating: 1400 },
			First: { rating: 1800 },
			Second: { rating: 1600 },
		};
		const { result } = renderHook(() => usePersonalResults({ personalRatings }));

		expect(result.current.rankings.map((r) => r.name)).toEqual(["First", "Second", "Third"]);
	});

	it("handles missing rating/wins/losses properties with defaults", () => {
		const personalRatings = {
			NoRating: { wins: 5 },
			NoWinsLosses: { rating: 1600 },
		};
		const { result } = renderHook(() => usePersonalResults({ personalRatings }));

		expect(result.current.rankings).toEqual([
			{ name: "NoWinsLosses", rating: 1600, wins: 0, losses: 0, id: undefined },
			{ name: "NoRating", rating: 1500, wins: 5, losses: 0, id: undefined },
		]);
	});
});
