import { describe, it, expect } from "vitest";
import { getMatchSideId, getMatchSideName, extractMatchData } from "./matchHelpers";
import type { Match, NameItem, Team } from "@/shared/types";

describe("matchHelpers", () => {
	const mockNameItem1: NameItem = {
		id: 1,
		name: "Mittens",
		description: "A very fluffy cat",
		pronunciation: "mit-uhnz",
	};

	const mockNameItem2: NameItem = {
		id: "cat-2",
		name: "Garfield",
	};

	const mockTeam1: Team = {
		id: "team-1",
		memberIds: ["1", "2"],
		memberNames: ["Mittens", "Garfield"],
	};

	const mockTeam2: Team = {
		id: "team-2",
		memberIds: ["3", "4"],
		memberNames: ["Simba", "Nala"],
	};

	describe("getMatchSideId", () => {
		it("should return the stringified id from a NameItem object in a 1v1 match", () => {
			const match: Match = { mode: "1v1", left: mockNameItem1, right: mockNameItem2 };
			expect(getMatchSideId(match, "left")).toBe("1");
			expect(getMatchSideId(match, "right")).toBe("cat-2");
		});

		it("should return the string value when the participant is a string in a 1v1 match", () => {
			const match: Match = { mode: "1v1", left: "string-id-1", right: "string-id-2" };
			expect(getMatchSideId(match, "left")).toBe("string-id-1");
			expect(getMatchSideId(match, "right")).toBe("string-id-2");
		});

		it("should return the team id in a 2v2 match", () => {
			const match: Match = { mode: "2v2", left: mockTeam1, right: mockTeam2 };
			expect(getMatchSideId(match, "left")).toBe("team-1");
			expect(getMatchSideId(match, "right")).toBe("team-2");
		});
	});

	describe("getMatchSideName", () => {
		it("should return the name from a NameItem object in a 1v1 match", () => {
			const match: Match = { mode: "1v1", left: mockNameItem1, right: mockNameItem2 };
			expect(getMatchSideName(match, "left")).toBe("Mittens");
			expect(getMatchSideName(match, "right")).toBe("Garfield");
		});

		it("should return the string value when the participant is a string in a 1v1 match", () => {
			const match: Match = { mode: "1v1", left: "String Cat", right: "Another Cat" };
			expect(getMatchSideName(match, "left")).toBe("String Cat");
			expect(getMatchSideName(match, "right")).toBe("Another Cat");
		});

		it("should return the joined member names in a 2v2 match", () => {
			const match: Match = { mode: "2v2", left: mockTeam1, right: mockTeam2 };
			expect(getMatchSideName(match, "left")).toBe("Mittens + Garfield");
			expect(getMatchSideName(match, "right")).toBe("Simba + Nala");
		});
	});

	describe("extractMatchData", () => {
		it("should correctly extract data for a 1v1 match with NameItem objects", () => {
			const match: Match = { mode: "1v1", left: mockNameItem1, right: mockNameItem2 };
			const data = extractMatchData(match);

			expect(data).toEqual({
				leftId: "1",
				rightId: "cat-2",
				leftName: "Mittens",
				rightName: "Garfield",
				leftMembers: ["Mittens"],
				rightMembers: ["Garfield"],
				leftIsTeam: false,
				rightIsTeam: false,
				leftDescription: "A very fluffy cat",
				rightDescription: undefined,
				leftPronunciation: "mit-uhnz",
				rightPronunciation: undefined,
			});
		});

		it("should correctly extract data for a 1v1 match with string participants", () => {
			const match: Match = { mode: "1v1", left: "String Cat 1", right: "String Cat 2" };
			const data = extractMatchData(match);

			expect(data).toEqual({
				leftId: "String Cat 1",
				rightId: "String Cat 2",
				leftName: "String Cat 1",
				rightName: "String Cat 2",
				leftMembers: ["String Cat 1"],
				rightMembers: ["String Cat 2"],
				leftIsTeam: false,
				rightIsTeam: false,
				leftDescription: undefined,
				rightDescription: undefined,
				leftPronunciation: undefined,
				rightPronunciation: undefined,
			});
		});

		it("should correctly extract data for a 2v2 match", () => {
			const match: Match = { mode: "2v2", left: mockTeam1, right: mockTeam2 };
			const data = extractMatchData(match);

			expect(data).toEqual({
				leftId: "team-1",
				rightId: "team-2",
				leftName: "Mittens + Garfield",
				rightName: "Simba + Nala",
				leftMembers: ["Mittens", "Garfield"],
				rightMembers: ["Simba", "Nala"],
				leftIsTeam: true,
				rightIsTeam: true,
				// description and pronunciation are currently undefined for teams based on the implementation
			});
		});
	});
});
