import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPersistentState } from "./tournamentPersistence";

describe("createDefaultPersistentState", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2023-01-01T00:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns the default state with the provided username", () => {
		const userName = "Alice";
		const expectedLastUpdated = Date.now();

		const state = createDefaultPersistentState(userName);

		expect(state).toEqual({
			matchHistory: [],
			currentRound: 1,
			currentMatch: 1,
			totalMatches: 0,
			userName: "Alice",
			lastUpdated: expectedLastUpdated,
			namesKey: "",
			ratings: {},
			mode: "1v1",
			teams: [],
			teamMatches: [],
			teamMatchIndex: 0,
			bracketEntrants: [],
		});
	});

	it('returns "anonymous" when an empty string is provided', () => {
		const expectedLastUpdated = Date.now();

		const state = createDefaultPersistentState("");

		expect(state).toEqual({
			matchHistory: [],
			currentRound: 1,
			currentMatch: 1,
			totalMatches: 0,
			userName: "anonymous",
			lastUpdated: expectedLastUpdated,
			namesKey: "",
			ratings: {},
			mode: "1v1",
			teams: [],
			teamMatches: [],
			teamMatchIndex: 0,
			bracketEntrants: [],
		});
	});
});
