import { describe, it, expect } from "vitest";
import { getMatchSideName } from "./matchHelpers";
import type { HeadToHeadMatch, TeamVersusMatch } from "@/shared/types";

describe("getMatchSideName", () => {
	describe("1v1 mode", () => {
		it("should return the participant name when participant is an object (left)", () => {
			const match: HeadToHeadMatch = {
				mode: "1v1",
				left: { id: "1", name: "Alice", description: "Test" },
				right: { id: "2", name: "Bob", description: "Test" },
			};
			expect(getMatchSideName(match, "left")).toBe("Alice");
		});

		it("should return the participant name when participant is an object (right)", () => {
			const match: HeadToHeadMatch = {
				mode: "1v1",
				left: { id: "1", name: "Alice", description: "Test" },
				right: { id: "2", name: "Bob", description: "Test" },
			};
			expect(getMatchSideName(match, "right")).toBe("Bob");
		});

		it("should return the participant string when participant is a string (left)", () => {
			const match: HeadToHeadMatch = {
				mode: "1v1",
				left: "Charlie",
				right: "Dave",
			};
			expect(getMatchSideName(match, "left")).toBe("Charlie");
		});

		it("should return the participant string when participant is a string (right)", () => {
			const match: HeadToHeadMatch = {
				mode: "1v1",
				left: "Charlie",
				right: "Dave",
			};
			expect(getMatchSideName(match, "right")).toBe("Dave");
		});
	});

	describe("2v2 mode", () => {
		it("should join member names with ' + ' for the left team", () => {
			const match: TeamVersusMatch = {
				mode: "2v2",
				left: {
					id: "team1",
					memberIds: ["1", "2"],
					memberNames: ["Alice", "Bob"],
				},
				right: {
					id: "team2",
					memberIds: ["3", "4"],
					memberNames: ["Charlie", "Dave"],
				},
			};
			expect(getMatchSideName(match, "left")).toBe("Alice + Bob");
		});

		it("should join member names with ' + ' for the right team", () => {
			const match: TeamVersusMatch = {
				mode: "2v2",
				left: {
					id: "team1",
					memberIds: ["1", "2"],
					memberNames: ["Alice", "Bob"],
				},
				right: {
					id: "team2",
					memberIds: ["3", "4"],
					memberNames: ["Charlie", "Dave"],
				},
			};
			expect(getMatchSideName(match, "right")).toBe("Charlie + Dave");
		});
	});
});
