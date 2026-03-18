import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePersonalResults } from "./usePersonalResults";

describe("usePersonalResults", () => {
	it("should return empty rankings when personalRatings is undefined", () => {
		const { result } = renderHook(() => usePersonalResults({ personalRatings: undefined }));

		expect(result.current.rankings).toEqual([]);
	});

	it("should process personalRatings with number values correctly", () => {
		const personalRatings = {
			Alice: 1600,
			Bob: 1400.5,
			Charlie: 1500,
		};

		const { result } = renderHook(() => usePersonalResults({ personalRatings }));

		expect(result.current.rankings).toEqual([
			{ name: "Alice", rating: 1600, wins: 0, losses: 0, id: undefined },
			{ name: "Charlie", rating: 1500, wins: 0, losses: 0, id: undefined },
			{ name: "Bob", rating: 1401, wins: 0, losses: 0, id: undefined },
		]);
	});

	it("should process personalRatings with object values correctly", () => {
		const personalRatings = {
			Alice: { rating: 1600.2, wins: 10, losses: 2 },
			Bob: { rating: 1400.8, wins: 2, losses: 10 },
			Charlie: { rating: 1500, wins: 5, losses: 5 },
			David: {}, // missing fields
		};

		const { result } = renderHook(() => usePersonalResults({ personalRatings }));

		expect(result.current.rankings).toEqual([
			{ name: "Alice", rating: 1600, wins: 10, losses: 2, id: undefined },
			{ name: "Charlie", rating: 1500, wins: 5, losses: 5, id: undefined },
			{ name: "David", rating: 1500, wins: 0, losses: 0, id: undefined },
			{ name: "Bob", rating: 1401, wins: 2, losses: 10, id: undefined },
		]);
	});

	it("should map currentTournamentNames to IDs when available", () => {
		const personalRatings = {
			Alice: 1600,
			Bob: 1400,
		};

		const currentTournamentNames = [
			{ name: "Alice", id: "id-alice" },
			{ name: "Bob", id: 42 },
			{ name: "Eve", id: "id-eve" },
		];

		const { result } = renderHook(() =>
			usePersonalResults({ personalRatings, currentTournamentNames }),
		);

		expect(result.current.rankings).toEqual([
			{ name: "Alice", rating: 1600, wins: 0, losses: 0, id: "id-alice" },
			{ name: "Bob", rating: 1400, wins: 0, losses: 0, id: 42 },
		]);
	});

	it("should handle currentTournamentNames without id gracefully", () => {
		const personalRatings = {
			Alice: 1600,
		};

		const currentTournamentNames = [
			{ name: "Alice" }, // no id
		];

		const { result } = renderHook(() =>
			usePersonalResults({ personalRatings, currentTournamentNames }),
		);

		expect(result.current.rankings).toEqual([
			{ name: "Alice", rating: 1600, wins: 0, losses: 0, id: undefined },
		]);
	});
});
