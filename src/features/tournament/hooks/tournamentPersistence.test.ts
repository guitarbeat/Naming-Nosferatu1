import { describe, expect, it } from "vitest";
import type { NameItem } from "@/shared/types";
import { createTournamentId } from "./tournamentPersistence";

describe("createTournamentId", () => {
	it("should generate a correct ID with sorted names and a username", () => {
		const names: NameItem[] = [
			{ id: 2, name: "Zeta" },
			{ id: 1, name: "Alpha" },
			{ id: 3, name: "Charlie" },
		];
		const result = createTournamentId(names, "Alice");
		expect(result).toBe("tournament-Alice-Alpha-Charlie-Zeta");
	});

	it("should use 'anonymous' when userName is not provided", () => {
		const names: NameItem[] = [
			{ id: 1, name: "Bravo" },
			{ id: 2, name: "Delta" },
		];
		const result = createTournamentId(names);
		expect(result).toBe("tournament-anonymous-Bravo-Delta");
	});

	it("should fallback to stringified ID when name is missing or falsy", () => {
		const names = [
			{ id: "uuid-1", name: "" },
			{ id: 42, name: undefined },
			{ id: 99, name: "Valid" },
		] as NameItem[];
		const result = createTournamentId(names, "Bob");
		// Sorted: "42", "Valid", "uuid-1"
		expect(result).toBe("tournament-Bob-42-Valid-uuid-1");
	});

	it("should handle an empty array of names", () => {
		const names: NameItem[] = [];
		const result = createTournamentId(names, "Eve");
		expect(result).toBe("tournament-Eve-");
	});

	it("should handle empty userName and empty names", () => {
		const names: NameItem[] = [];
		const result = createTournamentId(names, "");
		expect(result).toBe("tournament-anonymous-");
	});
});
