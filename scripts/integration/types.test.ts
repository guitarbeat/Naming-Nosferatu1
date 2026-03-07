import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { FileType, IntegrationStatus } from "./types";

describe("Integration Types", () => {
	describe("FileType enum", () => {
		it("should have all expected file types", () => {
			expect(FileType.COMPONENT).toBe("component");
			expect(FileType.HOOK).toBe("hook");
			expect(FileType.SERVICE).toBe("service");
			expect(FileType.UTILITY).toBe("utility");
			expect(FileType.TYPE).toBe("type");
			expect(FileType.UNKNOWN).toBe("unknown");
		});
	});

	describe("IntegrationStatus enum", () => {
		it("should have all expected statuses", () => {
			expect(IntegrationStatus.PENDING).toBe("pending");
			expect(IntegrationStatus.IN_PROGRESS).toBe("in_progress");
			expect(IntegrationStatus.COMPLETED).toBe("completed");
			expect(IntegrationStatus.FAILED).toBe("failed");
			expect(IntegrationStatus.SKIPPED).toBe("skipped");
		});
	});

	describe("fast-check setup verification", () => {
		it("should run a simple property test", () => {
			fc.assert(
				fc.property(fc.integer(), (n) => {
					return n + 0 === n;
				}),
				{ numRuns: 100 },
			);
		});
	});
});
