import { describe, expect, it } from "vitest";
import type { Match, NameItem, Team } from "@/shared/types";
import { getMatchSideId } from "./matchHelpers";

describe("matchHelpers", () => {
	describe("getMatchSideId", () => {
		it("returns the string participant if the side is a string ID (1v1)", () => {
			const match: Match = {
				mode: "1v1",
				left: "left-id-123",
				right: "right-id-456",
			};

			expect(getMatchSideId(match, "left")).toBe("left-id-123");
			expect(getMatchSideId(match, "right")).toBe("right-id-456");
		});

		it("returns the stringified ID if the side is a NameItem with a string ID (1v1)", () => {
			const leftParticipant: NameItem = {
				id: "left-item-123",
				name: "Left Cat",
			};
			const rightParticipant: NameItem = {
				id: "right-item-456",
				name: "Right Cat",
			};
			const match: Match = {
				mode: "1v1",
				left: leftParticipant,
				right: rightParticipant,
			};

			expect(getMatchSideId(match, "left")).toBe("left-item-123");
			expect(getMatchSideId(match, "right")).toBe("right-item-456");
		});

		it("returns the stringified ID if the side is a NameItem with a numeric ID (1v1)", () => {
			const leftParticipant: NameItem = {
				id: 123,
				name: "Left Cat",
			};
			const rightParticipant: NameItem = {
				id: 456,
				name: "Right Cat",
			};
			const match: Match = {
				mode: "1v1",
				left: leftParticipant,
				right: rightParticipant,
			};

			expect(getMatchSideId(match, "left")).toBe("123");
			expect(getMatchSideId(match, "right")).toBe("456");
		});

		it("returns the stringified ID if the side is a Team (2v2)", () => {
			const leftTeam: Team = {
				id: "left-team-123",
				memberIds: ["m1", "m2"],
				memberNames: ["Member 1", "Member 2"],
			};
			const rightTeam: Team = {
				id: "right-team-456",
				memberIds: ["m3", "m4"],
				memberNames: ["Member 3", "Member 4"],
			};
			const match: Match = {
				mode: "2v2",
				left: leftTeam,
				right: rightTeam,
			};

			expect(getMatchSideId(match, "left")).toBe("left-team-123");
			expect(getMatchSideId(match, "right")).toBe("right-team-456");
		});
	});
});
