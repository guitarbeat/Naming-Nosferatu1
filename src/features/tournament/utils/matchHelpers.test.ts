import { describe, expect, it } from "vitest";
import type {
	HeadToHeadMatch,
	NameItem,
	Team,
	TeamVersusMatch,
} from "@/shared/types";
import {
	extractMatchData,
	getMatchSideId,
	getMatchSideName,
} from "./matchHelpers";

describe("matchHelpers", () => {
	// Mock Data Setup
	const nameItemLeft: NameItem = {
		id: 1,
		name: "Dracula",
		description: "A vampire",
		pronunciation: "drak-yoo-luh",
	};

	const nameItemRight: NameItem = {
		id: 2,
		name: "Frankenstein",
		description: "A monster",
	};

	const teamLeft: Team = {
		id: "team-1",
		memberIds: ["1", "3"],
		memberNames: ["Dracula", "Wolfman"],
	};

	const teamRight: Team = {
		id: "team-2",
		memberIds: ["2", "4"],
		memberNames: ["Frankenstein", "Mummy"],
	};

	const match1v1Strings: HeadToHeadMatch = {
		mode: "1v1",
		left: "1",
		right: "2",
	};

	const match1v1Objects: HeadToHeadMatch = {
		mode: "1v1",
		left: nameItemLeft,
		right: nameItemRight,
	};

	const match2v2: TeamVersusMatch = {
		mode: "2v2",
		left: teamLeft,
		right: teamRight,
	};

	describe("getMatchSideId", () => {
		it("should return the correct ID for a 1v1 match with string identifiers", () => {
			expect(getMatchSideId(match1v1Strings, "left")).toBe("1");
			expect(getMatchSideId(match1v1Strings, "right")).toBe("2");
		});

		it("should return the correct ID for a 1v1 match with object identifiers", () => {
			expect(getMatchSideId(match1v1Objects, "left")).toBe("1");
			expect(getMatchSideId(match1v1Objects, "right")).toBe("2");
		});

		it("should return the correct ID for a 2v2 match", () => {
			expect(getMatchSideId(match2v2, "left")).toBe("team-1");
			expect(getMatchSideId(match2v2, "right")).toBe("team-2");
		});
	});

	describe("getMatchSideName", () => {
		it("should return the string directly for 1v1 string identifiers", () => {
			expect(getMatchSideName(match1v1Strings, "left")).toBe("1");
			expect(getMatchSideName(match1v1Strings, "right")).toBe("2");
		});

		it("should return the name property for 1v1 object identifiers", () => {
			expect(getMatchSideName(match1v1Objects, "left")).toBe("Dracula");
			expect(getMatchSideName(match1v1Objects, "right")).toBe("Frankenstein");
		});

		it("should return joined names for 2v2 matches", () => {
			expect(getMatchSideName(match2v2, "left")).toBe("Dracula + Wolfman");
			expect(getMatchSideName(match2v2, "right")).toBe("Frankenstein + Mummy");
		});
	});

	describe("extractMatchData", () => {
		it("should extract correct data for a 1v1 match with string identifiers", () => {
			const data = extractMatchData(match1v1Strings);
			expect(data).toEqual({
				leftId: "1",
				rightId: "2",
				leftName: "1",
				rightName: "2",
				leftMembers: ["1"],
				rightMembers: ["2"],
				leftIsTeam: false,
				rightIsTeam: false,
				leftDescription: undefined,
				rightDescription: undefined,
				leftPronunciation: undefined,
				rightPronunciation: undefined,
			});
		});

		it("should extract correct data for a 1v1 match with object identifiers", () => {
			const data = extractMatchData(match1v1Objects);
			expect(data).toEqual({
				leftId: "1",
				rightId: "2",
				leftName: "Dracula",
				rightName: "Frankenstein",
				leftMembers: ["Dracula"],
				rightMembers: ["Frankenstein"],
				leftIsTeam: false,
				rightIsTeam: false,
				leftDescription: "A vampire",
				rightDescription: "A monster",
				leftPronunciation: "drak-yoo-luh",
				rightPronunciation: undefined,
			});
		});

		it("should extract correct data for a 2v2 match", () => {
			const data = extractMatchData(match2v2);
			expect(data).toEqual({
				leftId: "team-1",
				rightId: "team-2",
				leftName: "Dracula + Wolfman",
				rightName: "Frankenstein + Mummy",
				leftMembers: ["Dracula", "Wolfman"],
				rightMembers: ["Frankenstein", "Mummy"],
				leftIsTeam: true,
				rightIsTeam: true,
			});
		});
	});
});
