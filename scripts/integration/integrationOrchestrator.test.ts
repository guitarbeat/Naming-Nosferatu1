// @ts-nocheck
/**
 * Tests for Integration Orchestrator
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IntegrationOrchestrator } from "./integrationOrchestrator";
import type { IntegrationConfig, MergeStrategy } from "./types";

describe("IntegrationOrchestrator", () => {
	const testRoot = join(process.cwd(), "test-integration-workspace");
	const sourceDir = "test-source";
	const targetDir = "src";

	const defaultStrategy: MergeStrategy = {
		preserveExisting: true,
		addNewExports: true,
		updateImports: true,
		requestUserInput: false,
	};

	const defaultConfig: IntegrationConfig = {
		sourceDirectory: sourceDir,
		targetDirectory: targetDir,
		mergeStrategy: defaultStrategy,
		verifyAfterEach: false, // Disable build verification for tests
		deleteAfterSuccess: false,
		createBackups: true,
		stopOnError: false,
	};

	beforeEach(() => {
		// Create test workspace
		if (existsSync(testRoot)) {
			rmSync(testRoot, { recursive: true, force: true });
		}
		mkdirSync(testRoot, { recursive: true });
		mkdirSync(join(testRoot, sourceDir), { recursive: true });
		mkdirSync(join(testRoot, targetDir), { recursive: true });

		// Clean up any state files
		const stateFile = ".integration-state.json";
		if (existsSync(stateFile)) {
			rmSync(stateFile, { force: true });
		}
	});

	afterEach(() => {
		// Clean up test workspace
		if (existsSync(testRoot)) {
			rmSync(testRoot, { recursive: true, force: true });
		}

		// Clean up any state files
		const stateFile = ".integration-state.json";
		if (existsSync(stateFile)) {
			rmSync(stateFile, { force: true });
		}
	});

	describe("File Discovery", () => {
		it("should discover TypeScript files in source directory", async () => {
			// Create test files
			writeFileSync(
				join(testRoot, sourceDir, "useTest.ts"),
				"export function useTest() { return true; }",
			);
			writeFileSync(
				join(testRoot, sourceDir, "utils.ts"),
				"export function helper() { return 42; }",
			);

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.totalFiles).toBe(2);
		});

		it("should ignore non-TypeScript files", async () => {
			// Create test files
			writeFileSync(join(testRoot, sourceDir, "test.ts"), "export const x = 1;");
			writeFileSync(join(testRoot, sourceDir, "readme.md"), "# README");
			writeFileSync(join(testRoot, sourceDir, "data.json"), "{}");

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.totalFiles).toBe(1);
		});

		it("should handle empty source directory", async () => {
			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.totalFiles).toBe(0);
			expect(result.success).toBe(true);
			expect(result.errors).toContain("No reference files found in source directory");
		});
	});

	describe("File Analysis", () => {
		it("should analyze file types correctly", async () => {
			// Create a hook file
			writeFileSync(
				join(testRoot, sourceDir, "useCounter.ts"),
				"export function useCounter() { return 0; }",
			);

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "hooks"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.completedFiles).toBe(1);
			expect(existsSync(join(testRoot, targetDir, "hooks", "useCounter.ts"))).toBe(true);
		});

		it("should detect dependencies", async () => {
			// Create files with dependencies
			writeFileSync(
				join(testRoot, sourceDir, "types.ts"),
				"export interface User { name: string; }",
			);
			writeFileSync(
				join(testRoot, sourceDir, "utils.ts"),
				`import { User } from './types';\nexport function getUser(): User { return { name: 'test' }; }`,
			);

			// Create target directories
			mkdirSync(join(testRoot, targetDir, "types"), { recursive: true });
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.completedFiles).toBe(2);
		});
	});

	describe("Dependency Ordering", () => {
		it("should process files in dependency order", async () => {
			// Create files with dependencies: utils depends on types
			writeFileSync(
				join(testRoot, sourceDir, "types.ts"),
				"export interface Config { value: number; }",
			);
			writeFileSync(
				join(testRoot, sourceDir, "utils.ts"),
				`import { Config } from './types';\nexport function useConfig(c: Config) { return c.value; }`,
			);

			// Create target directories
			mkdirSync(join(testRoot, targetDir, "types"), { recursive: true });
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.completedFiles).toBe(2);
			expect(result.success).toBe(true);

			// Verify both files were created
			expect(existsSync(join(testRoot, targetDir, "types", "types.ts"))).toBe(true);
			expect(existsSync(join(testRoot, targetDir, "utils", "utils.ts"))).toBe(true);
		});

		it("should handle independent files in alphabetical order", async () => {
			// Create independent files
			writeFileSync(join(testRoot, sourceDir, "zebra.ts"), 'export const zebra = "z";');
			writeFileSync(join(testRoot, sourceDir, "alpha.ts"), 'export const alpha = "a";');

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.completedFiles).toBe(2);
			expect(result.success).toBe(true);
		});
	});

	describe("Integration Actions", () => {
		it("should create new files when target does not exist", async () => {
			writeFileSync(
				join(testRoot, sourceDir, "newUtil.ts"),
				'export function newUtil() { return "new"; }',
			);

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.completedFiles).toBe(1);
			expect(existsSync(join(testRoot, targetDir, "utils", "newUtil.ts"))).toBe(true);

			const integrationResult = result.integrationResults[0];
			expect(integrationResult.action).toBe("created");
		});

		it("should merge with existing files", async () => {
			// Create existing file
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });
			writeFileSync(
				join(testRoot, targetDir, "utils", "helpers.ts"),
				"export function existingHelper() { return 1; }",
			);

			// Create reference file with new export
			writeFileSync(
				join(testRoot, sourceDir, "helpers.ts"),
				"export function newHelper() { return 2; }",
			);

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.completedFiles).toBe(1);

			const integrationResult = result.integrationResults[0];
			expect(integrationResult.action).toBe("merged");
		});
	});

	describe("Error Handling", () => {
		it("should handle circular dependencies", async () => {
			// Create circular dependency: a -> b -> a
			writeFileSync(
				join(testRoot, sourceDir, "a.ts"),
				`import { b } from './b';\nexport const a = b + 1;`,
			);
			writeFileSync(
				join(testRoot, sourceDir, "b.ts"),
				`import { a } from './a';\nexport const b = a + 1;`,
			);

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			// Should detect circular dependency
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.includes("Circular dependency"))).toBe(true);
		});

		it("should continue on error when stopOnError is false", async () => {
			// Create a file that will fail (invalid target location)
			writeFileSync(join(testRoot, sourceDir, "unknown.txt"), "not a valid typescript file");
			writeFileSync(join(testRoot, sourceDir, "valid.ts"), "export const valid = true;");

			const config = { ...defaultConfig, stopOnError: false };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			const result = await orchestrator.execute();

			// Should process the valid file even if one fails
			expect(result.totalFiles).toBeGreaterThanOrEqual(1);
		});

		it("should stop on error when stopOnError is true", async () => {
			// Create files where one will fail
			writeFileSync(
				join(testRoot, sourceDir, "a.ts"),
				`import { b } from './b';\nexport const a = b;`,
			);
			writeFileSync(
				join(testRoot, sourceDir, "b.ts"),
				`import { a } from './a';\nexport const b = a;`,
			);

			const config = { ...defaultConfig, stopOnError: true };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			const result = await orchestrator.execute();

			// Should stop when circular dependency is detected
			expect(result.success).toBe(false);
			expect(result.errors.some((e) => e.includes("Circular dependency"))).toBe(true);
		});
	});

	describe("State Management", () => {
		it("should track progress correctly", async () => {
			// Create multiple files
			writeFileSync(join(testRoot, sourceDir, "file1.ts"), "export const a = 1;");
			writeFileSync(join(testRoot, sourceDir, "file2.ts"), "export const b = 2;");
			writeFileSync(join(testRoot, sourceDir, "file3.ts"), "export const c = 3;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.totalFiles).toBe(3);
			expect(result.completedFiles).toBe(3);
			expect(result.failedFiles).toBe(0);
		});

		it("should create backups when configured", async () => {
			// Create existing file
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });
			writeFileSync(join(testRoot, targetDir, "utils", "test.ts"), "export const original = true;");

			// Create reference file
			writeFileSync(join(testRoot, sourceDir, "test.ts"), "export const updated = true;");

			const config = { ...defaultConfig, createBackups: true };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			await orchestrator.execute();

			const stateManager = orchestrator.getStateManager();
			const backups = stateManager.getBackups();

			expect(backups.length).toBeGreaterThan(0);
		});
	});

	describe("Integration Results", () => {
		it("should return detailed integration results", async () => {
			writeFileSync(join(testRoot, sourceDir, "test.ts"), "export const test = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			expect(result.integrationResults).toHaveLength(1);
			expect(result.integrationResults[0]).toHaveProperty("success");
			expect(result.integrationResults[0]).toHaveProperty("filePath");
			expect(result.integrationResults[0]).toHaveProperty("targetPath");
			expect(result.integrationResults[0]).toHaveProperty("action");
		});

		it("should include action logs in results", async () => {
			writeFileSync(join(testRoot, sourceDir, "logged.ts"), "export const logged = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const orchestrator = new IntegrationOrchestrator(defaultConfig, testRoot);
			const result = await orchestrator.execute();

			const integrationResult = result.integrationResults[0];
			expect(integrationResult.actionsLog).toBeDefined();
			expect(integrationResult.actionsLog?.length).toBeGreaterThan(0);
		});
	});

	describe("Conditional File Deletion", () => {
		it("should delete reference file after successful integration when configured", async () => {
			writeFileSync(join(testRoot, sourceDir, "toDelete.ts"), "export const toDelete = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const config = { ...defaultConfig, deleteAfterSuccess: true };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			await orchestrator.execute();

			// Reference file should be deleted
			expect(existsSync(join(testRoot, sourceDir, "toDelete.ts"))).toBe(false);
		});

		it("should NOT delete reference file when deleteAfterSuccess is false", async () => {
			writeFileSync(join(testRoot, sourceDir, "preserve.ts"), "export const preserve = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const config = { ...defaultConfig, deleteAfterSuccess: false };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			await orchestrator.execute();

			// Reference file should still exist
			expect(existsSync(join(testRoot, sourceDir, "preserve.ts"))).toBe(true);
		});

		it("should delete reference file when integration succeeds without conflicts", async () => {
			writeFileSync(join(testRoot, sourceDir, "clean.ts"), "export const clean = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const config = {
				...defaultConfig,
				deleteAfterSuccess: true,
				mergeStrategy: {
					...defaultStrategy,
					requestUserInput: false, // Don't request user input
				},
			};
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			const result = await orchestrator.execute();

			expect(result.success).toBe(true);
			expect(result.completedFiles).toBe(1);
			// Reference file should be deleted
			expect(existsSync(join(testRoot, sourceDir, "clean.ts"))).toBe(false);
		});
	});

	describe("Directory Cleanup", () => {
		it("should remove source directory when all files are successfully integrated and deleted", async () => {
			// Create reference files
			writeFileSync(join(testRoot, sourceDir, "file1.ts"), "export const file1 = true;");
			writeFileSync(join(testRoot, sourceDir, "file2.ts"), "export const file2 = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const config = { ...defaultConfig, deleteAfterSuccess: true };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			const result = await orchestrator.execute();

			expect(result.success).toBe(true);
			expect(result.completedFiles).toBe(2);

			// All reference files should be deleted
			expect(existsSync(join(testRoot, sourceDir, "file1.ts"))).toBe(false);
			expect(existsSync(join(testRoot, sourceDir, "file2.ts"))).toBe(false);

			// Source directory should be removed (Requirement 6.4)
			expect(existsSync(join(testRoot, sourceDir))).toBe(false);
		});

		it("should NOT remove source directory when files are not deleted", async () => {
			// Create reference files
			writeFileSync(join(testRoot, sourceDir, "file1.ts"), "export const file1 = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const config = { ...defaultConfig, deleteAfterSuccess: false };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			const result = await orchestrator.execute();

			expect(result.success).toBe(true);
			expect(result.completedFiles).toBe(1);

			// Reference file should still exist
			expect(existsSync(join(testRoot, sourceDir, "file1.ts"))).toBe(true);

			// Source directory should still exist
			expect(existsSync(join(testRoot, sourceDir))).toBe(true);
		});

		it("should NOT remove source directory when some files remain", async () => {
			// Create reference files
			writeFileSync(join(testRoot, sourceDir, "file1.ts"), "export const file1 = true;");
			writeFileSync(join(testRoot, sourceDir, "file2.ts"), "export const file2 = true;");
			// Create a non-TypeScript file that won't be processed
			writeFileSync(join(testRoot, sourceDir, "readme.md"), "# README");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const config = { ...defaultConfig, deleteAfterSuccess: true };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			const result = await orchestrator.execute();

			expect(result.success).toBe(true);
			expect(result.completedFiles).toBe(2);

			// TypeScript files should be deleted
			expect(existsSync(join(testRoot, sourceDir, "file1.ts"))).toBe(false);
			expect(existsSync(join(testRoot, sourceDir, "file2.ts"))).toBe(false);

			// But readme should still exist
			expect(existsSync(join(testRoot, sourceDir, "readme.md"))).toBe(true);

			// Source directory should still exist because readme.md remains
			expect(existsSync(join(testRoot, sourceDir))).toBe(true);
		});

		it("should handle case where source directory is already removed", async () => {
			// Create and process a file
			writeFileSync(join(testRoot, sourceDir, "file1.ts"), "export const file1 = true;");

			// Create target directory
			mkdirSync(join(testRoot, targetDir, "utils"), { recursive: true });

			const config = { ...defaultConfig, deleteAfterSuccess: true };
			const orchestrator = new IntegrationOrchestrator(config, testRoot);

			// Manually remove the directory before cleanup
			rmSync(join(testRoot, sourceDir), { recursive: true, force: true });

			// Should not throw error
			const result = await orchestrator.execute();

			// Should handle gracefully
			expect(result.totalFiles).toBe(0);
		});

		it("should NOT remove source directory when integration fails", async () => {
			// Create files with circular dependency
			writeFileSync(
				join(testRoot, sourceDir, "a.ts"),
				`import { b } from './b';\nexport const a = b + 1;`,
			);
			writeFileSync(
				join(testRoot, sourceDir, "b.ts"),
				`import { a } from './a';\nexport const b = a + 1;`,
			);

			const config = {
				...defaultConfig,
				deleteAfterSuccess: true,
				stopOnError: true,
			};
			const orchestrator = new IntegrationOrchestrator(config, testRoot);
			const result = await orchestrator.execute();

			expect(result.success).toBe(false);

			// Source directory should still exist because integration failed
			expect(existsSync(join(testRoot, sourceDir))).toBe(true);
		});
	});
});
