// @ts-nocheck
/**
 * Tests for File Comparator
 */

import { describe, expect, it } from "vitest";
import { areFilesIdentical, compareFiles, generateDiffSummary } from "./fileComparator";

describe("fileComparator", () => {
	describe("compareFiles", () => {
		it("should identify new exports in reference file", () => {
			const referenceContent = `
export function newFunction() {
  return 'new';
}

export const newConst = 42;
`;

			const existingContent = `
export function existingFunction() {
  return 'existing';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(comparison.newExports).toHaveLength(2);
			expect(comparison.newExports.map((e) => e.name)).toContain("newFunction");
			expect(comparison.newExports.map((e) => e.name)).toContain("newConst");
			expect(comparison.hasConflicts).toBe(false);
		});

		it("should identify existing-only exports", () => {
			const referenceContent = `
export function sharedFunction() {
  return 'shared';
}
`;

			const existingContent = `
export function sharedFunction() {
  return 'shared';
}

export function existingOnlyFunction() {
  return 'existing only';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(comparison.existingOnlyExports).toHaveLength(1);
			expect(comparison.existingOnlyExports[0].name).toBe("existingOnlyFunction");
		});

		it("should identify common exports without conflicts when identical", () => {
			const content = `
export function sharedFunction() {
  return 'shared';
}
`;

			const comparison = compareFiles("reference.ts", "existing.ts", content, content);

			expect(comparison.commonExports).toHaveLength(1);
			expect(comparison.commonExports[0].name).toBe("sharedFunction");
			expect(comparison.hasConflicts).toBe(false);
			expect(comparison.conflicts).toHaveLength(0);
		});

		it("should detect duplicate export conflicts with different implementations", () => {
			const referenceContent = `
export function conflictingFunction() {
  return 'reference implementation';
}
`;

			const existingContent = `
export function conflictingFunction() {
  return 'existing implementation';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(comparison.hasConflicts).toBe(true);
			expect(comparison.conflicts).toHaveLength(1);
			expect(comparison.conflicts[0].type).toBe("duplicate_export");
			expect(comparison.conflicts[0].description).toContain("conflictingFunction");
		});

		it("should detect incompatible type conflicts", () => {
			const referenceContent = `
export const myExport = 'string value';
`;

			const existingContent = `
export function myExport() {
  return 'function';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(comparison.hasConflicts).toBe(true);
			expect(comparison.conflicts).toHaveLength(1);
			expect(comparison.conflicts[0].type).toBe("incompatible_types");
			expect(comparison.conflicts[0].description).toContain("different types");
		});

		it("should detect conflicting default exports", () => {
			const referenceContent = `
export default function RefComponent() {
  return 'reference';
}
`;

			const existingContent = `
export default function ExistingComponent() {
  return 'existing';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(comparison.hasConflicts).toBe(true);
			expect(comparison.conflicts).toHaveLength(1);
			expect(comparison.conflicts[0].type).toBe("duplicate_export");
			expect(comparison.conflicts[0].description).toContain("default exports");
		});

		it("should handle files with no exports", () => {
			const referenceContent = `
// Just a comment
const internal = 'not exported';
`;

			const existingContent = `
// Another comment
const alsoInternal = 'also not exported';
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(comparison.newExports).toHaveLength(0);
			expect(comparison.existingOnlyExports).toHaveLength(0);
			expect(comparison.commonExports).toHaveLength(0);
			expect(comparison.hasConflicts).toBe(false);
		});

		it("should handle complex files with multiple export types", () => {
			const referenceContent = `
export interface MyInterface {
  id: number;
  name: string;
}

export type MyType = string | number;

export class MyClass {
  constructor(public value: string) {}
}

export function myFunction() {
  return 'function';
}

export const myConst = 42;
`;

			const existingContent = `
export interface MyInterface {
  id: number;
}

export function existingFunction() {
  return 'existing';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			// MyInterface is common (but might have conflicts due to different structure)
			// MyType, MyClass, myFunction, myConst are new
			// existingFunction is existing-only
			expect(comparison.newExports.length).toBeGreaterThan(0);
			expect(comparison.existingOnlyExports).toHaveLength(1);
			expect(comparison.existingOnlyExports[0].name).toBe("existingFunction");
		});

		it("should not flag identical default exports as conflicts", () => {
			const content = `
export default function Component() {
  return 'same';
}
`;

			const comparison = compareFiles("reference.ts", "existing.ts", content, content);

			expect(comparison.hasConflicts).toBe(false);
			expect(comparison.conflicts).toHaveLength(0);
		});
	});

	describe("areFilesIdentical", () => {
		it("should return true for identical files", () => {
			const content = `
export function test() {
  return 'test';
}
`;
			expect(areFilesIdentical(content, content)).toBe(true);
		});

		it("should return true for files with different whitespace but same content", () => {
			const content1 = `export function test() { return 'test'; }`;
			const content2 = `export   function   test()   {   return   'test';   }`;
			expect(areFilesIdentical(content1, content2)).toBe(true);
		});

		it("should return false for different files", () => {
			const content1 = `export function test1() { return 'test1'; }`;
			const content2 = `export function test2() { return 'test2'; }`;
			expect(areFilesIdentical(content1, content2)).toBe(false);
		});

		it("should handle empty files", () => {
			expect(areFilesIdentical("", "")).toBe(true);
			expect(areFilesIdentical("", "content")).toBe(false);
		});
	});

	describe("generateDiffSummary", () => {
		it("should generate summary for new exports", () => {
			const referenceContent = `
export function newFunc() {}
export const newConst = 1;
`;
			const existingContent = "";

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const summary = generateDiffSummary(comparison);
			expect(summary).toContain("New exports");
			expect(summary).toContain("newFunc");
			expect(summary).toContain("newConst");
		});

		it("should generate summary for conflicts", () => {
			const referenceContent = `
export function conflict() { return 'ref'; }
`;
			const existingContent = `
export function conflict() { return 'existing'; }
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const summary = generateDiffSummary(comparison);
			expect(summary).toContain("Conflicts");
			expect(summary).toContain("duplicate_export");
		});

		it("should generate summary for all categories", () => {
			const referenceContent = `
export function newFunc() {}
export function common() { return 'ref'; }
`;
			const existingContent = `
export function common() { return 'existing'; }
export function existingOnly() {}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const summary = generateDiffSummary(comparison);
			expect(summary).toContain("New exports");
			expect(summary).toContain("Existing-only exports");
			expect(summary).toContain("Common exports");
			expect(summary).toContain("Conflicts");
		});
	});
});
