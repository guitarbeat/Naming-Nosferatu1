import { describe, expect, it } from "vitest";
import type { Match, NameItem, Team } from "@/shared/types";
import { getMatchSideId } from "./matchHelpers";

describe("getMatchSideId", () => {
	it("returns the string representation of an object ID (NameItem)", () => {
		const match: Match = {
			mode: "1v1",
			left: { id: "left-id-1", name: "Left Name" } as NameItem,
			right: { id: 123, name: "Right Name" } as NameItem,
		};
		expect(getMatchSideId(match, "left")).toBe("left-id-1");
		expect(getMatchSideId(match, "right")).toBe("123");
	});

	it("returns the string representation of a primitive ID", () => {
		const match: Match = {
			mode: "1v1",
			left: "left-string-id",
			right: 456 as unknown as string, // technically Match types left/right as NameItem | string, but we can test number just in case
		};
		expect(getMatchSideId(match, "left")).toBe("left-string-id");
		expect(getMatchSideId(match, "right")).toBe("456");
	});

	it("returns the string representation of an object ID (Team) in 2v2", () => {
		const match: Match = {
			mode: "2v2",
			left: { id: "team-left", memberIds: [], memberNames: [] } as Team,
			right: { id: "team-right", memberIds: [], memberNames: [] } as Team,
		};
		expect(getMatchSideId(match, "left")).toBe("team-left");
		expect(getMatchSideId(match, "right")).toBe("team-right");
	});
});
