import { describe, expect, it } from "vitest";
import { batchHideSchema, createNameSchema, saveRatingsSchema } from "./validation";

describe("Validation Schemas", () => {
	// createNameSchema tests
	it("createNameSchema should strip status and provenance", () => {
		const input = {
			name: "Test Cat",
			description: "A secure cat",
			status: "approved",
			provenance: [
				{
					action: "created",
					timestamp: "2023-01-01T00:00:00Z",
					userId: "user123",
					details: { source: "test" },
				},
			],
		};

		const result = createNameSchema.parse(input) as any;

		expect(result).toHaveProperty("name", "Test Cat");
		expect(result).not.toHaveProperty("status");
		expect(result).not.toHaveProperty("provenance");
	});

	it("createNameSchema should allow valid inputs without optional fields", () => {
		const input = {
			name: "Valid Cat",
			description: "Just a cat",
		};
		const result = createNameSchema.parse(input) as any;
		expect(result.name).toBe("Valid Cat");
		expect(result.description).toBe("Just a cat");
		expect(result.status).toBeUndefined();
		expect(result.provenance).toBeUndefined();
	});

	// batchHideSchema tests
	it("batchHideSchema should enforce max array length", () => {
		const input = {
			isHidden: true,
			nameIds: Array.from({ length: 101 }, (_, i) => i),
		};
		expect(() => batchHideSchema.parse(input)).toThrow();
	});

	it("batchHideSchema should allow valid array length", () => {
		const input = {
			isHidden: true,
			nameIds: Array.from({ length: 100 }, (_, i) => i),
		};
		expect(() => batchHideSchema.parse(input)).not.toThrow();
	});

	// saveRatingsSchema tests
	it("saveRatingsSchema should enforce max array length", () => {
		const input = {
			userId: "00000000-0000-0000-0000-000000000000",
			ratings: Array.from({ length: 101 }, (_, i) => ({
				nameId: i,
				rating: 1500,
			})),
		};
		expect(() => saveRatingsSchema.parse(input)).toThrow();
	});

	it("saveRatingsSchema should allow valid array length", () => {
		const input = {
			userId: "00000000-0000-0000-0000-000000000000",
			ratings: Array.from({ length: 100 }, (_, i) => ({
				nameId: i,
				rating: 1500,
			})),
		};
		expect(() => saveRatingsSchema.parse(input)).not.toThrow();
	});
});
