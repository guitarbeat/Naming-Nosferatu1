// @ts-nocheck
/**
 * Tests for Integration State Manager
 */

import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IntegrationStateManager } from "./integrationStateManager";
import type { BackupInfo } from "./types";

describe("IntegrationStateManager", () => {
	const testStateFile = ".test-integration-state.json";
	let manager: IntegrationStateManager;

	beforeEach(() => {
		// Clean up any existing test state file
		if (fs.existsSync(testStateFile)) {
			fs.unlinkSync(testStateFile);
		}
	});

	afterEach(() => {
		// Clean up test state file
		if (fs.existsSync(testStateFile)) {
			fs.unlinkSync(testStateFile);
		}
	});

	describe("Initialization", () => {
		it("should create initial state with correct total files", () => {
			manager = new IntegrationStateManager(10, testStateFile);
			const state = manager.getState();

			expect(state.totalFiles).toBe(10);
			expect(state.processedFiles).toBe(0);
			expect(state.completedFiles).toEqual([]);
			expect(state.failedFiles.size).toBe(0);
			expect(state.skippedFiles.size).toBe(0);
			expect(state.currentFile).toBeNull();
			expect(state.backups).toEqual([]);
			expect(state.startTime).toBeDefined();
			expect(state.endTime).toBeUndefined();
		});

		it("should load existing state from disk", () => {
			// Create initial manager and mark some files as completed
			manager = new IntegrationStateManager(5, testStateFile);
			manager.markFileCompleted("file1.ts");
			manager.markFileCompleted("file2.ts");

			// Create new manager with same state file
			const newManager = new IntegrationStateManager(5, testStateFile);
			const state = newManager.getState();

			expect(state.completedFiles).toEqual(["file1.ts", "file2.ts"]);
			expect(state.processedFiles).toBe(2);
		});
	});

	describe("File Status Tracking", () => {
		beforeEach(() => {
			manager = new IntegrationStateManager(5, testStateFile);
		});

		it("should track current file being processed", () => {
			manager.setCurrentFile("file1.ts");
			const state = manager.getState();

			expect(state.currentFile).toBe("file1.ts");
		});

		it("should mark file as completed", () => {
			manager.setCurrentFile("file1.ts");
			manager.markFileCompleted("file1.ts");
			const state = manager.getState();

			expect(state.completedFiles).toContain("file1.ts");
			expect(state.processedFiles).toBe(1);
			expect(state.currentFile).toBeNull();
		});

		it("should not duplicate completed files", () => {
			manager.markFileCompleted("file1.ts");
			manager.markFileCompleted("file1.ts");
			const state = manager.getState();

			expect(state.completedFiles.length).toBe(1);
			expect(state.processedFiles).toBe(1);
		});

		it("should mark file as failed with error", () => {
			const error = new Error("Integration failed");
			manager.setCurrentFile("file1.ts");
			manager.markFileFailed("file1.ts", error);
			const state = manager.getState();

			expect(state.failedFiles.has("file1.ts")).toBe(true);
			expect(state.failedFiles.get("file1.ts")?.message).toBe("Integration failed");
			expect(state.processedFiles).toBe(1);
			expect(state.currentFile).toBeNull();
		});

		it("should mark file as skipped with reason", () => {
			manager.setCurrentFile("file1.ts");
			manager.markFileSkipped("file1.ts", "Circular dependency");
			const state = manager.getState();

			expect(state.skippedFiles.has("file1.ts")).toBe(true);
			expect(state.skippedFiles.get("file1.ts")).toBe("Circular dependency");
			expect(state.processedFiles).toBe(1);
			expect(state.currentFile).toBeNull();
		});

		it("should check if file is completed", () => {
			manager.markFileCompleted("file1.ts");

			expect(manager.isFileCompleted("file1.ts")).toBe(true);
			expect(manager.isFileCompleted("file2.ts")).toBe(false);
		});
	});

	describe("Backup Management", () => {
		beforeEach(() => {
			manager = new IntegrationStateManager(5, testStateFile);
		});

		it("should add backup to state", () => {
			const backup: BackupInfo = {
				originalPath: "src/file.ts",
				backupPath: "src/file.ts.backup",
				timestamp: Date.now(),
			};

			manager.addBackup(backup);
			const backups = manager.getBackups();

			expect(backups).toHaveLength(1);
			expect(backups[0]).toEqual(backup);
		});

		it("should track multiple backups", () => {
			const backup1: BackupInfo = {
				originalPath: "src/file1.ts",
				backupPath: "src/file1.ts.backup",
				timestamp: Date.now(),
			};
			const backup2: BackupInfo = {
				originalPath: "src/file2.ts",
				backupPath: "src/file2.ts.backup",
				timestamp: Date.now(),
			};

			manager.addBackup(backup1);
			manager.addBackup(backup2);
			const backups = manager.getBackups();

			expect(backups).toHaveLength(2);
		});

		it("should clear all backups", () => {
			const backup: BackupInfo = {
				originalPath: "src/file.ts",
				backupPath: "src/file.ts.backup",
				timestamp: Date.now(),
			};

			manager.addBackup(backup);
			manager.clearBackups();
			const backups = manager.getBackups();

			expect(backups).toHaveLength(0);
		});
	});

	describe("Progress Tracking", () => {
		beforeEach(() => {
			manager = new IntegrationStateManager(10, testStateFile);
		});

		it("should calculate progress percentage", () => {
			expect(manager.getProgress()).toBe(0);

			manager.markFileCompleted("file1.ts");
			expect(manager.getProgress()).toBe(10);

			manager.markFileCompleted("file2.ts");
			expect(manager.getProgress()).toBe(20);

			manager.markFileFailed("file3.ts", new Error("Failed"));
			expect(manager.getProgress()).toBe(30);

			manager.markFileSkipped("file4.ts", "Skipped");
			expect(manager.getProgress()).toBe(40);
		});

		it("should handle zero total files", () => {
			const emptyManager = new IntegrationStateManager(0, testStateFile);
			expect(emptyManager.getProgress()).toBe(100);
		});

		it("should generate progress summary", () => {
			manager.markFileCompleted("file1.ts");
			manager.markFileCompleted("file2.ts");
			manager.markFileFailed("file3.ts", new Error("Failed"));
			manager.markFileSkipped("file4.ts", "Skipped");

			const summary = manager.getSummary();

			expect(summary).toContain("40%");
			expect(summary).toContain("4/10");
			expect(summary).toContain("Completed: 2");
			expect(summary).toContain("Failed: 1");
			expect(summary).toContain("Skipped: 1");
		});
	});

	describe("Completion Tracking", () => {
		beforeEach(() => {
			manager = new IntegrationStateManager(5, testStateFile);
		});

		it("should mark integration as complete", () => {
			expect(manager.isComplete()).toBe(false);

			manager.markComplete();

			expect(manager.isComplete()).toBe(true);
			const state = manager.getState();
			expect(state.endTime).toBeDefined();
		});
	});

	describe("State Persistence", () => {
		it("should persist state to disk", () => {
			manager = new IntegrationStateManager(5, testStateFile);
			manager.markFileCompleted("file1.ts");
			manager.markFileFailed("file2.ts", new Error("Test error"));
			manager.markFileSkipped("file3.ts", "Test reason");

			expect(fs.existsSync(testStateFile)).toBe(true);

			// Load state in new manager
			const newManager = new IntegrationStateManager(5, testStateFile);
			const state = newManager.getState();

			expect(state.completedFiles).toContain("file1.ts");
			expect(state.failedFiles.has("file2.ts")).toBe(true);
			expect(state.skippedFiles.has("file3.ts")).toBe(true);
		});

		it("should persist backups to disk", () => {
			manager = new IntegrationStateManager(5, testStateFile);
			const backup: BackupInfo = {
				originalPath: "src/file.ts",
				backupPath: "src/file.ts.backup",
				timestamp: Date.now(),
			};

			manager.addBackup(backup);

			// Load state in new manager
			const newManager = new IntegrationStateManager(5, testStateFile);
			const backups = newManager.getBackups();

			expect(backups).toHaveLength(1);
			expect(backups[0].originalPath).toBe("src/file.ts");
		});

		it("should handle corrupted state file gracefully", () => {
			// Write invalid JSON to state file
			fs.writeFileSync(testStateFile, "invalid json", "utf-8");

			// Should create new state instead of crashing
			manager = new IntegrationStateManager(5, testStateFile);
			const state = manager.getState();

			expect(state.totalFiles).toBe(5);
			expect(state.processedFiles).toBe(0);
		});
	});

	describe("State Reset", () => {
		beforeEach(() => {
			manager = new IntegrationStateManager(5, testStateFile);
		});

		it("should reset state to initial values", () => {
			manager.markFileCompleted("file1.ts");
			manager.markFileFailed("file2.ts", new Error("Failed"));
			manager.addBackup({
				originalPath: "src/file.ts",
				backupPath: "src/file.ts.backup",
				timestamp: Date.now(),
			});

			manager.reset();
			const state = manager.getState();

			expect(state.processedFiles).toBe(0);
			expect(state.completedFiles).toEqual([]);
			expect(state.failedFiles.size).toBe(0);
			expect(state.skippedFiles.size).toBe(0);
			expect(state.backups).toEqual([]);
			expect(state.totalFiles).toBe(5); // Should preserve total files
		});
	});

	describe("State File Cleanup", () => {
		beforeEach(() => {
			manager = new IntegrationStateManager(5, testStateFile);
		});

		it("should delete state file from disk", () => {
			manager.markFileCompleted("file1.ts");
			expect(fs.existsSync(testStateFile)).toBe(true);

			manager.deleteStateFile();
			expect(fs.existsSync(testStateFile)).toBe(false);
		});

		it("should handle missing state file gracefully", () => {
			manager.deleteStateFile();
			// Should not throw error
			expect(fs.existsSync(testStateFile)).toBe(false);
		});
	});

	describe("Resume Capability", () => {
		it("should skip already-completed files when resuming", () => {
			// First session
			manager = new IntegrationStateManager(5, testStateFile);
			manager.markFileCompleted("file1.ts");
			manager.markFileCompleted("file2.ts");

			// Simulate interruption and resume
			const resumedManager = new IntegrationStateManager(5, testStateFile);

			expect(resumedManager.isFileCompleted("file1.ts")).toBe(true);
			expect(resumedManager.isFileCompleted("file2.ts")).toBe(true);
			expect(resumedManager.isFileCompleted("file3.ts")).toBe(false);
			expect(resumedManager.getProgress()).toBe(40);
		});

		it("should preserve failed and skipped files on resume", () => {
			// First session
			manager = new IntegrationStateManager(5, testStateFile);
			manager.markFileFailed("file1.ts", new Error("Build failed"));
			manager.markFileSkipped("file2.ts", "Circular dependency");

			// Resume
			const resumedManager = new IntegrationStateManager(5, testStateFile);
			const state = resumedManager.getState();

			expect(state.failedFiles.has("file1.ts")).toBe(true);
			expect(state.skippedFiles.has("file2.ts")).toBe(true);
		});
	});
});
