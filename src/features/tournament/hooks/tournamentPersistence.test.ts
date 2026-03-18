import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sanitizePersistentState, createDefaultPersistentState } from "./tournamentPersistence";

describe("sanitizePersistentState", () => {
	const defaultUserName = "testUser";

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 0, 1)); // Mock current time for lastUpdated
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return default state when persistentStateRaw is null", () => {
		const state = sanitizePersistentState(null, defaultUserName);
		expect(state).toEqual(createDefaultPersistentState(defaultUserName));
	});

	it("should return default state when persistentStateRaw is undefined", () => {
		const state = sanitizePersistentState(undefined, defaultUserName);
		expect(state).toEqual(createDefaultPersistentState(defaultUserName));
	});

	it("should return default state when persistentStateRaw is an array", () => {
		const state = sanitizePersistentState([], defaultUserName);
		expect(state).toEqual(createDefaultPersistentState(defaultUserName));
	});

	it("should return default state when persistentStateRaw is a string", () => {
		const state = sanitizePersistentState("invalid", defaultUserName);
		expect(state).toEqual(createDefaultPersistentState(defaultUserName));
	});

	it("should return default state when persistentStateRaw is a number", () => {
		const state = sanitizePersistentState(123, defaultUserName);
		expect(state).toEqual(createDefaultPersistentState(defaultUserName));
	});

	it("should return default state when persistentStateRaw is a boolean", () => {
		const state = sanitizePersistentState(true, defaultUserName);
		expect(state).toEqual(createDefaultPersistentState(defaultUserName));
	});

	it("should use 'anonymous' fallback when userName is empty string and raw state is invalid", () => {
		const state = sanitizePersistentState(null, "");
		expect(state).toEqual(createDefaultPersistentState("anonymous"));
	});

	it("should use 'anonymous' fallback when userName is empty string and raw state is valid", () => {
		const state = sanitizePersistentState({}, "");
		expect(state.userName).toBe("anonymous");
	});

	it("should preserve valid fields from partial raw state", () => {
		const rawState = {
			currentRound: 2,
			mode: "2v2",
			namesKey: "key1,key2",
		};
		const state = sanitizePersistentState(rawState, defaultUserName);

		expect(state.currentRound).toBe(2);
		expect(state.mode).toBe("2v2");
		expect(state.namesKey).toBe("key1,key2");
		// Ensure other fields default correctly
		expect(state.matchHistory).toEqual([]);
		expect(state.teams).toEqual([]);
	});

	it("should default mode to 1v1 if mode is not '2v2'", () => {
		const state1 = sanitizePersistentState({ mode: "invalid" }, defaultUserName);
		expect(state1.mode).toBe("1v1");

		const state2 = sanitizePersistentState({ mode: 123 }, defaultUserName);
		expect(state2.mode).toBe("1v1");
	});

	it("should sanitize teams array by filtering out invalid teams", () => {
		const validTeam = {
			id: "t1",
			memberIds: ["1", "2"],
			memberNames: ["One", "Two"],
		};
		const invalidTeam1 = { id: "t2" }; // Missing arrays
		const invalidTeam2 = { id: "t3", memberIds: ["1"], memberNames: ["One", "Two"] }; // memberIds length not 2
		const invalidTeam3 = "not an object";

		const state = sanitizePersistentState({
			teams: [validTeam, invalidTeam1, invalidTeam2, invalidTeam3],
		}, defaultUserName);

		expect(state.teams).toEqual([validTeam]);
	});

	it("should default teams to empty array if teams is not an array", () => {
		const state = sanitizePersistentState({ teams: "not an array" }, defaultUserName);
		expect(state.teams).toEqual([]);
	});

	it("should sanitize teamMatches array by filtering out invalid matches", () => {
		const validMatch = { leftTeamId: "t1", rightTeamId: "t2" };
		const invalidMatch1 = { leftTeamId: "t1" }; // Missing rightTeamId
		const invalidMatch2 = { leftTeamId: 123, rightTeamId: "t2" }; // Invalid type
		const invalidMatch3 = null;

		const state = sanitizePersistentState({
			teamMatches: [validMatch, invalidMatch1, invalidMatch2, invalidMatch3],
		}, defaultUserName);

		expect(state.teamMatches).toEqual([validMatch]);
	});

	it("should default teamMatches to empty array if teamMatches is not an array", () => {
		const state = sanitizePersistentState({ teamMatches: "not an array" }, defaultUserName);
		expect(state.teamMatches).toEqual([]);
	});

	it("should sanitize matchHistory to empty array if not an array", () => {
		const state = sanitizePersistentState({ matchHistory: {} }, defaultUserName);
		expect(state.matchHistory).toEqual([]);
	});

	it("should sanitize ratings to empty object if not an object or is null", () => {
		const state1 = sanitizePersistentState({ ratings: null }, defaultUserName);
		expect(state1.ratings).toEqual({});

		const state2 = sanitizePersistentState({ ratings: "not object" }, defaultUserName);
		expect(state2.ratings).toEqual({});
	});

	it("should preserve valid ratings object", () => {
		const validRatings = { "1": 1200, "2": 1500 };
		const state = sanitizePersistentState({ ratings: validRatings }, defaultUserName);
		expect(state.ratings).toEqual(validRatings);
	});

	it("should sanitize namesKey to empty string if not a string", () => {
		const state = sanitizePersistentState({ namesKey: 123 }, defaultUserName);
		expect(state.namesKey).toBe("");
	});

	it("should sanitize teamMatchIndex to 0 if not a number or is negative", () => {
		const state1 = sanitizePersistentState({ teamMatchIndex: "1" }, defaultUserName);
		expect(state1.teamMatchIndex).toBe(0);

		const state2 = sanitizePersistentState({ teamMatchIndex: -5 }, defaultUserName);
		expect(state2.teamMatchIndex).toBe(0);
	});

	it("should preserve valid teamMatchIndex", () => {
		const state = sanitizePersistentState({ teamMatchIndex: 5 }, defaultUserName);
		expect(state.teamMatchIndex).toBe(5);
	});

	it("should sanitize bracketEntrants by converting elements to string if it is an array", () => {
		const state = sanitizePersistentState({ bracketEntrants: [1, "2", true] }, defaultUserName);
		expect(state.bracketEntrants).toEqual(["1", "2", "true"]);
	});

	it("should sanitize bracketEntrants to empty array if not an array", () => {
		const state = sanitizePersistentState({ bracketEntrants: "not array" }, defaultUserName);
		expect(state.bracketEntrants).toEqual([]);
	});
});
