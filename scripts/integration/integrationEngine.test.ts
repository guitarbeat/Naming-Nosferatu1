// @ts-nocheck
/**
 * Tests for Integration Engine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { integrateFile } from "./integrationEngine";
import { type FileAnalysis, FileType, type MergeStrategy } from "./types";

// Test directory setup
const TEST_DIR = path.join(__dirname, "__test_integration_engine__");
const SOURCE_DIR = path.join(TEST_DIR, "source");
const TARGET_DIR = path.join(TEST_DIR, "target");

function setupTestDir() {
	// Clean up if exists
	if (fs.existsSync(TEST_DIR)) {
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	}

	// Create test directories
	fs.mkdirSync(TEST_DIR, { recursive: true });
	fs.mkdirSync(SOURCE_DIR, { recursive: true });
	fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function cleanupTestDir() {
	if (fs.existsSync(TEST_DIR)) {
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	}
}

function createTestFile(dir: string, filename: string, content: string): string {
	const filePath = path.join(dir, filename);
	fs.writeFileSync(filePath, content, "utf-8");
	return filePath;
}

describe("integrationEngine", () => {
	beforeEach(() => {
		setupTestDir();
	});

	afterEach(() => {
		cleanupTestDir();
	});

	describe("integrateFile - new file creation", () => {
		it("should create a new file when no existing file exists (Requirement 3.5)", () => {
			const referenceContent = `
export function newFunction() {
  return 'new';
}

export const newConst = 42;
`;

			const sourceFile = createTestFile(SOURCE_DIR, "newFile.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "newFile.ts",
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [
					{ name: "newFunction", type: "function", isDefault: false },
					{ name: "newConst", type: "const", isDefault: false },
				],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			// Verify result
			expect(result.success).toBe(true);
			expect(result.action).toBe("created");
			expect(result.targetPath).toBe(path.join(TARGET_DIR, "newFile.ts"));

			// Verify file was created
			const targetPath = path.join(TARGET_DIR, "newFile.ts");
			expect(fs.existsSync(targetPath)).toBe(true);

			// Verify content matches
			const writtenContent = fs.readFileSync(targetPath, "utf-8");
			expect(writtenContent).toBe(referenceContent);
		});

		it("should create directory structure if it does not exist (Requirement 3.5)", () => {
			const referenceContent = `
export function utilityFunction() {
  return 'utility';
}
`;

			const sourceFile = createTestFile(SOURCE_DIR, "utility.ts", referenceContent);

			// Target a nested directory that doesn't exist
			const nestedTargetDir = path.join(TARGET_DIR, "utils", "helpers");

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "utility.ts",
				fileType: FileType.UTILITY,
				targetLocation: nestedTargetDir,
				dependencies: [],
				exports: [{ name: "utilityFunction", type: "function", isDefault: false }],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			// Verify result
			expect(result.success).toBe(true);
			expect(result.action).toBe("created");

			// Verify directory was created
			expect(fs.existsSync(nestedTargetDir)).toBe(true);

			// Verify file was created
			const targetPath = path.join(nestedTargetDir, "utility.ts");
			expect(fs.existsSync(targetPath)).toBe(true);

			// Verify content
			const writtenContent = fs.readFileSync(targetPath, "utf-8");
			expect(writtenContent).toBe(referenceContent);
		});

		it("should handle React component files", () => {
			const referenceContent = `
import React from 'react';

export default function MyComponent() {
  return <div>Hello World</div>;
}
`;

			const sourceFile = createTestFile(SOURCE_DIR, "MyComponent.tsx", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "MyComponent.tsx",
				fileType: FileType.COMPONENT,
				targetLocation: TARGET_DIR,
				dependencies: [{ importPath: "react", isExternal: true, isResolved: true }],
				exports: [{ name: "MyComponent", type: "function", isDefault: true }],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(true);
			expect(result.action).toBe("created");

			const targetPath = path.join(TARGET_DIR, "MyComponent.tsx");
			expect(fs.existsSync(targetPath)).toBe(true);

			const writtenContent = fs.readFileSync(targetPath, "utf-8");
			expect(writtenContent).toBe(referenceContent);
		});

		it("should handle custom hook files", () => {
			const referenceContent = `
import { useState } from 'react';

export function useCustomHook() {
  const [state, setState] = useState(0);
  return { state, setState };
}
`;

			const sourceFile = createTestFile(SOURCE_DIR, "useCustomHook.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "useCustomHook.ts",
				fileType: FileType.HOOK,
				targetLocation: TARGET_DIR,
				dependencies: [{ importPath: "react", isExternal: true, isResolved: true }],
				exports: [{ name: "useCustomHook", type: "function", isDefault: false }],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(true);
			expect(result.action).toBe("created");

			const targetPath = path.join(TARGET_DIR, "useCustomHook.ts");
			expect(fs.existsSync(targetPath)).toBe(true);
		});

		it("should handle type definition files", () => {
			const referenceContent = `
export interface User {
  id: number;
  name: string;
  email: string;
}

export type UserRole = 'admin' | 'user' | 'guest';
`;

			const sourceFile = createTestFile(SOURCE_DIR, "types.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "types.ts",
				fileType: FileType.TYPE,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [
					{ name: "User", type: "interface", isDefault: false },
					{ name: "UserRole", type: "type", isDefault: false },
				],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(true);
			expect(result.action).toBe("created");

			const targetPath = path.join(TARGET_DIR, "types.ts");
			expect(fs.existsSync(targetPath)).toBe(true);

			const writtenContent = fs.readFileSync(targetPath, "utf-8");
			expect(writtenContent).toBe(referenceContent);
		});

		it("should handle service files", () => {
			const referenceContent = `
export class ApiService {
  async fetchData(url: string): Promise<any> {
    const response = await fetch(url);
    return response.json();
  }
}

export const apiService = new ApiService();
`;

			const sourceFile = createTestFile(SOURCE_DIR, "apiService.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "apiService.ts",
				fileType: FileType.SERVICE,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [
					{ name: "ApiService", type: "class", isDefault: false },
					{ name: "apiService", type: "const", isDefault: false },
				],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(true);
			expect(result.action).toBe("created");

			const targetPath = path.join(TARGET_DIR, "apiService.ts");
			expect(fs.existsSync(targetPath)).toBe(true);
		});

		it("should handle empty files", () => {
			const referenceContent = "";

			const sourceFile = createTestFile(SOURCE_DIR, "empty.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "empty.ts",
				fileType: FileType.UNKNOWN,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(true);
			expect(result.action).toBe("created");

			const targetPath = path.join(TARGET_DIR, "empty.ts");
			expect(fs.existsSync(targetPath)).toBe(true);

			const writtenContent = fs.readFileSync(targetPath, "utf-8");
			expect(writtenContent).toBe(referenceContent);
		});
	});

	describe("integrateFile - merging with existing files", () => {
		it("should merge with existing file when file exists", () => {
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

			// Create existing file
			createTestFile(TARGET_DIR, "merge.ts", existingContent);

			const sourceFile = createTestFile(SOURCE_DIR, "merge.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "merge.ts",
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [{ name: "newFunction", type: "function", isDefault: false }],
				hasExistingFile: true,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(true);
			expect(result.action).toBe("merged");

			// Verify merged content contains both functions
			const targetPath = path.join(TARGET_DIR, "merge.ts");
			const mergedContent = fs.readFileSync(targetPath, "utf-8");
			expect(mergedContent).toContain("existingFunction");
			expect(mergedContent).toContain("newFunction");
		});

		it("should skip merge when conflicts exist and user input is requested", () => {
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

			// Create existing file
			createTestFile(TARGET_DIR, "conflict.ts", existingContent);

			const sourceFile = createTestFile(SOURCE_DIR, "conflict.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "conflict.ts",
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [{ name: "conflictingFunction", type: "function", isDefault: false }],
				hasExistingFile: true,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: true,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(false);
			expect(result.action).toBe("skipped");
			expect(result.conflicts).toBeDefined();
			expect(result.conflicts?.length).toBeGreaterThan(0);

			// Verify existing file was not modified
			const targetPath = path.join(TARGET_DIR, "conflict.ts");
			const unchangedContent = fs.readFileSync(targetPath, "utf-8");
			expect(unchangedContent).toBe(existingContent);
		});
	});

	describe("integrateFile - error handling", () => {
		it("should handle errors gracefully when file write fails", () => {
			const referenceContent = `
export function testFunction() {
  return 'test';
}
`;

			const sourceFile = createTestFile(SOURCE_DIR, "test.ts", referenceContent);

			// Use an invalid filename with characters that are not allowed in filenames
			// This will cause the write operation to fail
			const invalidFileName = "test<>:|?.ts"; // Invalid characters for Windows filenames

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: invalidFileName,
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [{ name: "testFunction", type: "function", isDefault: false }],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			expect(result.success).toBe(false);
			expect(result.action).toBe("skipped");
			expect(result.error).toBeDefined();
		});
	});

	describe("integrateFile - result tracking (Requirement 9.2)", () => {
		it("should track actions taken during new file creation", () => {
			const referenceContent = `
export function trackedFunction() {
  return 'tracked';
}
`;

			const sourceFile = createTestFile(SOURCE_DIR, "tracked.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "tracked.ts",
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [{ name: "trackedFunction", type: "function", isDefault: false }],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			// Verify result tracking
			expect(result.success).toBe(true);
			expect(result.action).toBe("created");
			expect(result.actionsLog).toBeDefined();
			expect(result.actionsLog?.length).toBeGreaterThan(0);

			// Verify specific actions are logged
			expect(result.actionsLog?.some((log) => log.includes("Starting integration"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("No existing file found"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Creating directory structure"))).toBe(
				true,
			);
			expect(result.actionsLog?.some((log) => log.includes("Writing new file"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Successfully created"))).toBe(true);
		});

		it("should track actions taken during file merge", () => {
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

			// Create existing file
			createTestFile(TARGET_DIR, "mergeTracked.ts", existingContent);

			const sourceFile = createTestFile(SOURCE_DIR, "mergeTracked.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "mergeTracked.ts",
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [{ name: "newFunction", type: "function", isDefault: false }],
				hasExistingFile: true,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			// Verify result tracking
			expect(result.success).toBe(true);
			expect(result.action).toBe("merged");
			expect(result.actionsLog).toBeDefined();
			expect(result.actionsLog?.length).toBeGreaterThan(0);

			// Verify specific actions are logged
			expect(result.actionsLog?.some((log) => log.includes("Starting integration"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Existing file found"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Reading existing file"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Comparing reference file"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Merging files"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Writing merged content"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("Merge completed"))).toBe(true);
		});

		it("should track conflicts when merge is skipped due to user input requirement", () => {
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

			// Create existing file
			createTestFile(TARGET_DIR, "conflictTracked.ts", existingContent);

			const sourceFile = createTestFile(SOURCE_DIR, "conflictTracked.ts", referenceContent);

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: "conflictTracked.ts",
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [{ name: "conflictingFunction", type: "function", isDefault: false }],
				hasExistingFile: true,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: true,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			// Verify result tracking
			expect(result.success).toBe(false);
			expect(result.action).toBe("skipped");
			expect(result.conflicts).toBeDefined();
			expect(result.conflicts?.length).toBeGreaterThan(0);
			expect(result.actionsLog).toBeDefined();

			// Verify conflict is logged
			expect(result.actionsLog?.some((log) => log.includes("conflict(s) detected"))).toBe(true);
			expect(result.actionsLog?.some((log) => log.includes("user input required"))).toBe(true);
		});

		it("should track failures in actions log", () => {
			const referenceContent = `
export function failFunction() {
  return 'fail';
}
`;

			const sourceFile = createTestFile(SOURCE_DIR, "fail.ts", referenceContent);

			// Use an invalid filename to cause failure
			const invalidFileName = "fail<>:|?.ts";

			const analysis: FileAnalysis = {
				filePath: sourceFile,
				fileName: invalidFileName,
				fileType: FileType.UTILITY,
				targetLocation: TARGET_DIR,
				dependencies: [],
				exports: [{ name: "failFunction", type: "function", isDefault: false }],
				hasExistingFile: false,
			};

			const strategy: MergeStrategy = {
				preserveExisting: true,
				addNewExports: true,
				updateImports: true,
				requestUserInput: false,
			};

			const result = integrateFile(analysis, referenceContent, strategy);

			// Verify failure tracking
			expect(result.success).toBe(false);
			expect(result.action).toBe("skipped");
			expect(result.error).toBeDefined();
			expect(result.actionsLog).toBeDefined();

			// Verify failure is logged
			expect(
				result.actionsLog?.some((log) => log.includes("Failed") || log.includes("failed")),
			).toBe(true);
		});
	});
});
