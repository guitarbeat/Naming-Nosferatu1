import { describe, expect, it } from "vitest";
import type { NameItem } from "@/shared/types";
import { createTournamentId } from "./tournamentPersistence";

describe("createTournamentId", () => {
	it("creates a tournament ID with sorted names and a user name", () => {
		const names: NameItem[] = [
			{ id: 1, name: "Zeta" },
			{ id: 2, name: "Alpha" },
			{ id: 3, name: "Gamma" },
		];
		const result = createTournamentId(names, "testUser");
		expect(result).toBe("tournament-testUser-Alpha-Gamma-Zeta");
	});

	it("defaults to 'anonymous' when userName is not provided", () => {
		const names: NameItem[] = [
			{ id: 1, name: "Zeta" },
			{ id: 2, name: "Alpha" },
		];
		const result = createTournamentId(names);
		expect(result).toBe("tournament-anonymous-Alpha-Zeta");
	});

	it("defaults to 'anonymous' when userName is an empty string", () => {
		const names: NameItem[] = [{ id: 1, name: "Zeta" }];
		const result = createTournamentId(names, "");
		expect(result).toBe("tournament-anonymous-Zeta");
	});

	it("uses the stringified id if name is missing or empty", () => {
		const names: NameItem[] = [
			{ id: 1, name: "Zeta" },
			{ id: 99, name: "" }, // empty string name
			{ id: "uuid-123" } as NameItem, // undefined name
		];
		const result = createTournamentId(names, "user");
		// String sorting: "99" (char code 57) < "Zeta" (char code 90) < "uuid-123" (char code 117)
		expect(result).toBe("tournament-user-99-Zeta-uuid-123");
	});

	it("handles an empty names array", () => {
		const result = createTournamentId([], "user");
		expect(result).toBe("tournament-user-");
	});
});
