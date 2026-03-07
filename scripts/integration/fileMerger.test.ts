// @ts-nocheck
/**
 * Tests for File Merger
 */

import { describe, expect, it } from "vitest";
import { compareFiles } from "./fileComparator";
import { canMergeWithoutConflicts, createDefaultMergeStrategy, mergeFiles } from "./fileMerger";
import type { MergeStrategy } from "./types";

describe("fileMerger", () => {
	describe("mergeFiles", () => {
		it("should preserve all existing exports (Requirement 3.2)", () => {
			const existingContent = `
export function existingFunction() {
  return 'existing';
}

export const existingConst = 42;

export class ExistingClass {
  constructor(public value: string) {}
}
`;

			const referenceContent = `
export function newFunction() {
  return 'new';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: false,
				requestUserInput: false,
			};

			const result = mergeFiles(comparison, strategy);

			// All existing exports should be preserved
			expect(result.mergedContent).toContain("existingFunction");
			expect(result.mergedContent).toContain("existingConst");
			expect(result.mergedContent).toContain("ExistingClass");
			expect(result.preservedExports).toHaveLength(3);
		});

		it("should add non-conflicting new exports (Requirement 3.3)", () => {
			const existingContent = `
export function existingFunction() {
  return 'existing';
}
`;

			const referenceContent = `
export function existingFunction() {
  return 'existing';
}

export function newFunction() {
  return 'new';
}

export const newConst = 100;
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: false,
				requestUserInput: false,
			};

			const result = mergeFiles(comparison, strategy);

			// New exports should be added
			expect(result.mergedContent).toContain("newFunction");
			expect(result.mergedContent).toContain("newConst");
			expect(result.addedExports).toHaveLength(2);
			expect(result.addedExports.map((e) => e.name)).toContain("newFunction");
			expect(result.addedExports.map((e) => e.name)).toContain("newConst");
		});

		it("should detect conflicts and not merge when requestUserInput is true (Requirement 3.4)", () => {
			const existingContent = `
export function conflictingFunction() {
  return 'existing implementation';
}
`;

			const referenceContent = `
export function conflictingFunction() {
  return 'reference implementation';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: false,
				requestUserInput: true,
			};

			const result = mergeFiles(comparison, strategy);

			// Should detect conflicts
			expect(result.conflicts).toHaveLength(1);
			expect(result.conflicts[0].type).toBe("duplicate_export");

			// Should not modify content when conflicts exist and user input is requested
			expect(result.mergedContent).toBe(existingContent);
			expect(result.addedExports).toHaveLength(0);
		});

		it("should merge imports from both files", () => {
			const existingContent = `
import { existingImport } from './existing';
import { shared } from './shared';

export function existingFunction() {
  return 'existing';
}
`;

			const referenceContent = `
import { newImport } from './new';
import { shared } from './shared';

export function newFunction() {
  return 'new';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = mergeFiles(comparison, strategy);

			// Should contain imports from both files
			expect(result.mergedContent).toContain("existingImport");
			expect(result.mergedContent).toContain("newImport");
			// Shared import should appear only once
			const sharedImportCount = (result.mergedContent.match(/import.*shared/g) || []).length;
			expect(sharedImportCount).toBe(1);
		});

		it("should handle files with no conflicts", () => {
			const existingContent = `
export function existingFunction() {
  return 'existing';
}
`;

			const referenceContent = `
export function newFunction() {
  return 'new';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: false,
				requestUserInput: false,
			};

			const result = mergeFiles(comparison, strategy);

			expect(result.conflicts).toHaveLength(0);
			expect(result.mergedContent).toContain("existingFunction");
			expect(result.mergedContent).toContain("newFunction");
		});

		it("should not add new exports when strategy.addNewExports is false", () => {
			const existingContent = `
export function existingFunction() {
  return 'existing';
}
`;

			const referenceContent = `
export function newFunction() {
  return 'new';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: false,
				updateImports: false,
				requestUserInput: false,
			};

			const result = mergeFiles(comparison, strategy);

			expect(result.mergedContent).toContain("existingFunction");
			expect(result.mergedContent).not.toContain("newFunction");
			expect(result.addedExports).toHaveLength(0);
		});

		it("should handle complex exports including classes, interfaces, and types", () => {
			const existingContent = `
export interface ExistingInterface {
  id: number;
}

export class ExistingClass {
  constructor(public value: string) {}
}
`;

			const referenceContent = `
export type NewType = string | number;

export interface NewInterface {
  name: string;
}

export function newFunction() {
  return 'new';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: false,
				requestUserInput: false,
			};

			const result = mergeFiles(comparison, strategy);

			// Existing exports should be preserved
			expect(result.mergedContent).toContain("ExistingInterface");
			expect(result.mergedContent).toContain("ExistingClass");

			// New exports should be added
			expect(result.mergedContent).toContain("NewType");
			expect(result.mergedContent).toContain("NewInterface");
			expect(result.mergedContent).toContain("newFunction");
		});

		it("should handle default exports", () => {
			const existingContent = `
export function helperFunction() {
  return 'helper';
}
`;

			const referenceContent = `
export default function DefaultComponent() {
  return 'default';
}

export function utilityFunction() {
  return 'utility';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: false,
				requestUserInput: false,
			};

			const result = mergeFiles(comparison, strategy);

			expect(result.mergedContent).toContain("helperFunction");
			expect(result.mergedContent).toContain("DefaultComponent");
			expect(result.mergedContent).toContain("utilityFunction");
		});

		it("should preserve existing exports even when reference has conflicts", () => {
			const existingContent = `
export function existingFunction() {
  return 'existing';
}

export const existingConst = 42;
`;

			const referenceContent = `
export function existingFunction() {
  return 'different implementation';
}

export function newFunction() {
  return 'new';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: false,
				requestUserInput: true,
			};

			const result = mergeFiles(comparison, strategy);

			// Should preserve all existing exports
			expect(result.preservedExports).toHaveLength(2);
			expect(result.preservedExports.map((e) => e.name)).toContain("existingFunction");
			expect(result.preservedExports.map((e) => e.name)).toContain("existingConst");

			// Should not add new exports when conflicts exist and user input is requested
			expect(result.addedExports).toHaveLength(0);
		});
	});

	describe("canMergeWithoutConflicts", () => {
		it("should return true when no conflicts exist", () => {
			const existingContent = `
export function existingFunction() {
  return 'existing';
}
`;

			const referenceContent = `
export function newFunction() {
  return 'new';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(canMergeWithoutConflicts(comparison)).toBe(true);
		});

		it("should return false when conflicts exist", () => {
			const existingContent = `
export function conflictingFunction() {
  return 'existing';
}
`;

			const referenceContent = `
export function conflictingFunction() {
  return 'reference';
}
`;

			const comparison = compareFiles(
				"reference.ts",
				"existing.ts",
				referenceContent,
				existingContent,
			);

			expect(canMergeWithoutConflicts(comparison)).toBe(false);
		});
	});

	describe("createDefaultMergeStrategy", () => {
		it("should create strategy with default values", () => {
			const strategy = createDefaultMergeStrategy();

			expect(strategy.preserveExisting).toBe(true);
			expect(strategy.addNewExports).toBe(true);
			expect(strategy.updateImports).toBe(true);
			expect(strategy.requestUserInput).toBe(true);
		});

		it("should allow customizing requestUserInput", () => {
			const strategy = createDefaultMergeStrategy(false);

			expect(strategy.requestUserInput).toBe(false);
		});
	});
});
