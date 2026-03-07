// @ts-nocheck
/**
 * Tests for File Manager backup system
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createBackup,
	createDirectory,
	deleteBackup,
	deleteDirectory,
	deleteFile,
	directoryExists,
	fileExists,
	listBackups,
	readFile,
	restoreBackup,
	rollback,
	snapshotReferenceFiles,
	updateImportPaths,
	writeFile,
} from "./fileManager";
import type { BackupInfo } from "./types";

describe("File Manager - Backup System", () => {
	const testDir = path.join(__dirname, ".test-backups");
	const testFile = path.join(testDir, "test-file.ts");
	const testContent = 'export const test = "original content";';

	beforeEach(() => {
		// Create test directory and file
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
		fs.writeFileSync(testFile, testContent);
	});

	afterEach(() => {
		// Clean up test directory
		if (fs.existsSync(testDir)) {
			const files = fs.readdirSync(testDir);
			files.forEach((file) => {
				fs.unlinkSync(path.join(testDir, file));
			});
			fs.rmdirSync(testDir);
		}
	});

	describe("createBackup", () => {
		it("should create a backup with timestamped filename", () => {
			const backup = createBackup(testFile);

			expect(backup.originalPath).toBe(testFile);
			expect(backup.backupPath).toMatch(/\.backup_test-file_\d+\.ts$/);
			expect(backup.timestamp).toBeGreaterThan(0);
			expect(fs.existsSync(backup.backupPath)).toBe(true);
		});

		it("should preserve file content in backup", () => {
			const backup = createBackup(testFile);
			const backupContent = fs.readFileSync(backup.backupPath, "utf-8");

			expect(backupContent).toBe(testContent);
		});

		it("should throw error if file does not exist", () => {
			const nonExistentFile = path.join(testDir, "does-not-exist.ts");

			expect(() => createBackup(nonExistentFile)).toThrow(
				/Cannot create backup: file does not exist/,
			);
		});

		it("should create multiple backups with different timestamps", () => {
			const backup1 = createBackup(testFile);

			// Wait a bit to ensure different timestamp
			const start = Date.now();
			while (Date.now() - start < 2) {
				// Small delay
			}

			const backup2 = createBackup(testFile);

			expect(backup1.timestamp).not.toBe(backup2.timestamp);
			expect(backup1.backupPath).not.toBe(backup2.backupPath);
			expect(fs.existsSync(backup1.backupPath)).toBe(true);
			expect(fs.existsSync(backup2.backupPath)).toBe(true);
		});
	});

	describe("restoreBackup", () => {
		it("should restore file from backup", () => {
			const backup = createBackup(testFile);

			// Modify original file
			const modifiedContent = 'export const test = "modified content";';
			fs.writeFileSync(testFile, modifiedContent);
			expect(fs.readFileSync(testFile, "utf-8")).toBe(modifiedContent);

			// Restore from backup
			restoreBackup(backup);

			expect(fs.readFileSync(testFile, "utf-8")).toBe(testContent);
		});

		it("should delete backup file after restoration", () => {
			const backup = createBackup(testFile);
			expect(fs.existsSync(backup.backupPath)).toBe(true);

			restoreBackup(backup);

			expect(fs.existsSync(backup.backupPath)).toBe(false);
		});

		it("should throw error if backup does not exist", () => {
			const fakeBackup: BackupInfo = {
				originalPath: testFile,
				backupPath: path.join(testDir, ".backup_fake_123456.ts"),
				timestamp: Date.now(),
			};

			expect(() => restoreBackup(fakeBackup)).toThrow(/Cannot restore: backup does not exist/);
		});

		it("should handle restoration when original file was deleted", () => {
			const backup = createBackup(testFile);

			// Delete original file
			fs.unlinkSync(testFile);
			expect(fs.existsSync(testFile)).toBe(false);

			// Restore from backup
			restoreBackup(backup);

			expect(fs.existsSync(testFile)).toBe(true);
			expect(fs.readFileSync(testFile, "utf-8")).toBe(testContent);
		});
	});

	describe("deleteBackup", () => {
		it("should delete backup file", () => {
			const backup = createBackup(testFile);
			expect(fs.existsSync(backup.backupPath)).toBe(true);

			deleteBackup(backup);

			expect(fs.existsSync(backup.backupPath)).toBe(false);
		});

		it("should not throw if backup does not exist", () => {
			const fakeBackup: BackupInfo = {
				originalPath: testFile,
				backupPath: path.join(testDir, ".backup_fake_123456.ts"),
				timestamp: Date.now(),
			};

			expect(() => deleteBackup(fakeBackup)).not.toThrow();
		});
	});

	describe("listBackups", () => {
		it("should list all backup files in directory", () => {
			const backup1 = createBackup(testFile);
			const backup2 = createBackup(testFile);

			const backups = listBackups(testDir);

			expect(backups).toHaveLength(2);
			expect(backups).toContain(backup1.backupPath);
			expect(backups).toContain(backup2.backupPath);
		});

		it("should return empty array for non-existent directory", () => {
			const nonExistentDir = path.join(testDir, "does-not-exist");

			const backups = listBackups(nonExistentDir);

			expect(backups).toEqual([]);
		});

		it("should only list backup files, not regular files", () => {
			createBackup(testFile);

			// Create a non-backup file
			const regularFile = path.join(testDir, "regular-file.ts");
			fs.writeFileSync(regularFile, "content");

			const backups = listBackups(testDir);

			expect(backups.every((b) => path.basename(b).startsWith(".backup_"))).toBe(true);
			expect(backups.some((b) => b === regularFile)).toBe(false);
		});

		it("should return empty array when no backups exist", () => {
			const backups = listBackups(testDir);

			expect(backups).toEqual([]);
		});
	});

	describe("Backup round-trip", () => {
		it("should preserve exact file content through backup and restore cycle", () => {
			// Create backup
			const backup = createBackup(testFile);

			// Modify file
			fs.writeFileSync(testFile, "completely different content");

			// Restore
			restoreBackup(backup);

			// Verify exact content match
			expect(fs.readFileSync(testFile, "utf-8")).toBe(testContent);
		});

		it("should handle multiple backup and restore cycles", () => {
			// First cycle
			const backup1 = createBackup(testFile);
			fs.writeFileSync(testFile, "modification 1");
			restoreBackup(backup1);
			expect(fs.readFileSync(testFile, "utf-8")).toBe(testContent);

			// Second cycle
			const backup2 = createBackup(testFile);
			fs.writeFileSync(testFile, "modification 2");
			restoreBackup(backup2);
			expect(fs.readFileSync(testFile, "utf-8")).toBe(testContent);
		});
	});
});

describe("File Manager - File Operations", () => {
	const testDir = path.join(__dirname, ".test-file-ops");
	const testFile = path.join(testDir, "test-file.ts");
	const testContent = 'export const test = "test content";';

	beforeEach(() => {
		// Create test directory
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test directory
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("readFile", () => {
		it("should read file content", () => {
			fs.writeFileSync(testFile, testContent);

			const content = readFile(testFile);

			expect(content).toBe(testContent);
		});

		it("should throw error if file does not exist", () => {
			const nonExistentFile = path.join(testDir, "does-not-exist.ts");

			expect(() => readFile(nonExistentFile)).toThrow(/Cannot read file: file does not exist/);
		});

		it("should handle UTF-8 content correctly", () => {
			const utf8Content = 'export const emoji = "🚀 Hello 世界";';
			fs.writeFileSync(testFile, utf8Content);

			const content = readFile(testFile);

			expect(content).toBe(utf8Content);
		});
	});

	describe("writeFile", () => {
		it("should write content to file", () => {
			writeFile(testFile, testContent);

			expect(fs.existsSync(testFile)).toBe(true);
			expect(fs.readFileSync(testFile, "utf-8")).toBe(testContent);
		});

		it("should create parent directories if they do not exist", () => {
			const nestedFile = path.join(testDir, "nested", "deep", "file.ts");

			writeFile(nestedFile, testContent);

			expect(fs.existsSync(nestedFile)).toBe(true);
			expect(fs.readFileSync(nestedFile, "utf-8")).toBe(testContent);
		});

		it("should overwrite existing file", () => {
			fs.writeFileSync(testFile, "original content");

			writeFile(testFile, testContent);

			expect(fs.readFileSync(testFile, "utf-8")).toBe(testContent);
		});

		it("should handle UTF-8 content correctly", () => {
			const utf8Content = 'export const emoji = "🚀 Hello 世界";';

			writeFile(testFile, utf8Content);

			expect(fs.readFileSync(testFile, "utf-8")).toBe(utf8Content);
		});
	});

	describe("deleteFile", () => {
		it("should delete existing file", () => {
			fs.writeFileSync(testFile, testContent);
			expect(fs.existsSync(testFile)).toBe(true);

			deleteFile(testFile);

			expect(fs.existsSync(testFile)).toBe(false);
		});

		it("should throw error if file does not exist", () => {
			const nonExistentFile = path.join(testDir, "does-not-exist.ts");

			expect(() => deleteFile(nonExistentFile)).toThrow(/Cannot delete file: file does not exist/);
		});
	});

	describe("fileExists", () => {
		it("should return true for existing file", () => {
			fs.writeFileSync(testFile, testContent);

			expect(fileExists(testFile)).toBe(true);
		});

		it("should return false for non-existent file", () => {
			const nonExistentFile = path.join(testDir, "does-not-exist.ts");

			expect(fileExists(nonExistentFile)).toBe(false);
		});

		it("should return false for directory", () => {
			expect(fileExists(testDir)).toBe(false);
		});
	});

	describe("directoryExists", () => {
		it("should return true for existing directory", () => {
			expect(directoryExists(testDir)).toBe(true);
		});

		it("should return false for non-existent directory", () => {
			const nonExistentDir = path.join(testDir, "does-not-exist");

			expect(directoryExists(nonExistentDir)).toBe(false);
		});

		it("should return false for file", () => {
			fs.writeFileSync(testFile, testContent);

			expect(directoryExists(testFile)).toBe(false);
		});
	});

	describe("createDirectory", () => {
		it("should create directory", () => {
			const newDir = path.join(testDir, "new-dir");

			createDirectory(newDir);

			expect(fs.existsSync(newDir)).toBe(true);
			expect(fs.statSync(newDir).isDirectory()).toBe(true);
		});

		it("should create nested directories", () => {
			const nestedDir = path.join(testDir, "nested", "deep", "dir");

			createDirectory(nestedDir);

			expect(fs.existsSync(nestedDir)).toBe(true);
			expect(fs.statSync(nestedDir).isDirectory()).toBe(true);
		});

		it("should not throw if directory already exists", () => {
			expect(() => createDirectory(testDir)).not.toThrow();
		});
	});

	describe("deleteDirectory", () => {
		it("should delete empty directory", () => {
			const emptyDir = path.join(testDir, "empty-dir");
			fs.mkdirSync(emptyDir);
			expect(fs.existsSync(emptyDir)).toBe(true);

			deleteDirectory(emptyDir);

			expect(fs.existsSync(emptyDir)).toBe(false);
		});

		it("should delete directory with contents", () => {
			const dirWithFiles = path.join(testDir, "dir-with-files");
			fs.mkdirSync(dirWithFiles);
			fs.writeFileSync(path.join(dirWithFiles, "file1.ts"), "content1");
			fs.writeFileSync(path.join(dirWithFiles, "file2.ts"), "content2");

			const nestedDir = path.join(dirWithFiles, "nested");
			fs.mkdirSync(nestedDir);
			fs.writeFileSync(path.join(nestedDir, "file3.ts"), "content3");

			deleteDirectory(dirWithFiles);

			expect(fs.existsSync(dirWithFiles)).toBe(false);
		});

		it("should throw error if directory does not exist", () => {
			const nonExistentDir = path.join(testDir, "does-not-exist");

			expect(() => deleteDirectory(nonExistentDir)).toThrow(
				/Cannot delete directory: directory does not exist/,
			);
		});
	});

	describe("File operations error handling", () => {
		it("should handle permission errors gracefully", () => {
			// This test is platform-dependent and may not work on all systems
			// We're testing that errors are properly wrapped
			const invalidPath = "\0invalid";

			expect(() => writeFile(invalidPath, "content")).toThrow(/Failed to write file/);
		});

		it("should preserve error messages in wrapped errors", () => {
			const nonExistentFile = path.join(testDir, "does-not-exist.ts");

			try {
				readFile(nonExistentFile);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toContain("Cannot read file");
				expect((error as Error).message).toContain(nonExistentFile);
			}
		});
	});

	describe("Integration scenarios", () => {
		it("should handle complete file lifecycle", () => {
			// Write file
			writeFile(testFile, testContent);
			expect(fileExists(testFile)).toBe(true);

			// Read file
			const content = readFile(testFile);
			expect(content).toBe(testContent);

			// Modify file
			const newContent = 'export const test = "modified";';
			writeFile(testFile, newContent);
			expect(readFile(testFile)).toBe(newContent);

			// Delete file
			deleteFile(testFile);
			expect(fileExists(testFile)).toBe(false);
		});

		it("should handle directory operations with files", () => {
			const subDir = path.join(testDir, "subdir");
			const fileInSubDir = path.join(subDir, "file.ts");

			// Create directory and file
			createDirectory(subDir);
			writeFile(fileInSubDir, testContent);

			expect(directoryExists(subDir)).toBe(true);
			expect(fileExists(fileInSubDir)).toBe(true);

			// Delete directory with file
			deleteDirectory(subDir);

			expect(directoryExists(subDir)).toBe(false);
			expect(fileExists(fileInSubDir)).toBe(false);
		});

		it("should handle backup and file operations together", () => {
			// Create initial file
			writeFile(testFile, testContent);

			// Create backup
			const backup = createBackup(testFile);

			// Modify file
			writeFile(testFile, "modified content");
			expect(readFile(testFile)).toBe("modified content");

			// Restore from backup
			restoreBackup(backup);
			expect(readFile(testFile)).toBe(testContent);
		});
	});
});

describe("File Manager - Import Path Updater", () => {
	describe("updateImportPaths", () => {
		it("should update relative import paths when moving file to different directory", () => {
			const content = `
import { helper } from './utils/helper';
import { Component } from '../components/Component';
export const test = 'test';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './utils/helper' from src/features/feature.ts points to src/features/utils/helper
			// From src/services/feature.ts, that same file is at '../features/utils/helper'
			expect(result).toContain("from '../features/utils/helper'");
			// '../components/Component' from src/features/feature.ts points to src/components/Component
			// From src/services/feature.ts, that same file is at '../components/Component'
			expect(result).toContain("from '../components/Component'");
		});

		it("should update import paths when moving file deeper in directory structure", () => {
			const content = `
import { util } from './util';
import { shared } from '../shared';
`;
			const oldPath = "src/feature.ts";
			const newPath = "src/features/auth/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './util' from src/feature.ts points to src/util
			// From src/features/auth/feature.ts, that's '../../util'
			expect(result).toContain("from '../../util'");
			// '../shared' from src/feature.ts points to ../shared (outside src)
			// From src/features/auth/feature.ts, that's '../../../shared'
			expect(result).toContain("from '../../../shared'");
		});

		it("should update import paths when moving file up in directory structure", () => {
			const content = `
import { util } from '../../util';
import { helper } from '../helper';
`;
			const oldPath = "src/features/auth/feature.ts";
			const newPath = "src/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// '../../util' from src/features/auth/feature.ts points to src/util
			// From src/feature.ts, that's './util'
			expect(result).toContain("from './util'");
			// '../helper' from src/features/auth/feature.ts points to src/features/helper
			// From src/feature.ts, that's './features/helper'
			expect(result).toContain("from './features/helper'");
		});

		it("should not modify external package imports", () => {
			const content = `
import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { helper } from './helper';
`;
			const oldPath = "src/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			expect(result).toContain("from 'react'");
			expect(result).toContain("from 'axios'");
			expect(result).toContain("from '../helper'");
		});

		it("should handle export-from statements", () => {
			const content = `
export { helper } from './utils/helper';
export * from '../shared';
`;
			const oldPath = "src/features/index.ts";
			const newPath = "src/services/index.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './utils/helper' from src/features/index.ts points to src/features/utils/helper
			// From src/services/index.ts, that's '../features/utils/helper'
			expect(result).toContain("from '../features/utils/helper'");
			// '../shared' from src/features/index.ts points to src/shared
			// From src/services/index.ts, that's '../shared'
			expect(result).toContain("from '../shared'");
		});

		it("should preserve import paths that point to the same location", () => {
			const content = `
import { helper } from '../utils/helper';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			expect(result).toContain("from '../utils/helper'");
		});

		it("should handle imports without file extensions", () => {
			const content = `
import { helper } from './helper';
import { util } from '../util';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// Should not add extensions if they weren't there
			expect(result).not.toContain(".ts");
			expect(result).not.toContain(".tsx");
		});

		it("should handle imports with file extensions", () => {
			const content = `
import { helper } from './helper.ts';
import { Component } from '../Component.tsx';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// Should preserve extensions if they were there
			expect(result).toContain(".ts");
			expect(result).toContain(".tsx");
		});

		it("should update cross-references using referenceMap", () => {
			const content = `
import { helper } from '../once-integrated-delete/helper';
import { util } from '../once-integrated-delete/util';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			// Need to use absolute paths in referenceMap
			const cwd = process.cwd().replace(/\\/g, "/");
			const referenceMap = new Map([
				[`${cwd}/src/once-integrated-delete/helper.ts`, `${cwd}/src/utils/helper.ts`],
				[`${cwd}/src/once-integrated-delete/util.ts`, `${cwd}/src/utils/util.ts`],
			]);

			const result = updateImportPaths(content, oldPath, newPath, referenceMap);

			// '../once-integrated-delete/helper' from src/features/feature.ts points to src/once-integrated-delete/helper
			// But referenceMap says that file is now at src/utils/helper
			// From src/services/feature.ts, that's '../utils/helper'
			expect(result).toContain("from '../utils/helper'");
			expect(result).toContain("from '../utils/util'");
		});

		it("should handle multiple imports on same line", () => {
			const content = `
import { a, b, c } from './utils';
import type { Type1, Type2 } from '../types';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './utils' from src/features/feature.ts points to src/features/utils
			// From src/services/feature.ts, that's '../features/utils'
			expect(result).toContain("from '../features/utils'");
			// '../types' from src/features/feature.ts points to src/types
			// From src/services/feature.ts, that's '../types'
			expect(result).toContain("from '../types'");
		});

		it("should handle default imports", () => {
			const content = `
import Component from './Component';
import helper from '../utils/helper';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './Component' from src/features/feature.ts points to src/features/Component
			// From src/services/feature.ts, that's '../features/Component'
			expect(result).toContain("from '../features/Component'");
			// '../utils/helper' from src/features/feature.ts points to src/utils/helper
			// From src/services/feature.ts, that's '../utils/helper'
			expect(result).toContain("from '../utils/helper'");
		});

		it("should handle mixed import styles", () => {
			const content = `
import React, { useState, useEffect } from 'react';
import Component, { helper } from './Component';
import * as utils from '../utils';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			expect(result).toContain("from 'react'");
			// './Component' from src/features/feature.ts points to src/features/Component
			// From src/services/feature.ts, that's '../features/Component'
			expect(result).toContain("from '../features/Component'");
			// '../utils' from src/features/feature.ts points to src/utils
			// From src/services/feature.ts, that's '../utils'
			expect(result).toContain("from '../utils'");
		});

		it("should handle imports with single quotes", () => {
			const content = `
import { helper } from './helper';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './helper' from src/features/feature.ts points to src/features/helper
			// From src/services/feature.ts, that's '../features/helper'
			expect(result).toContain("from '../features/helper'");
		});

		it("should handle imports with double quotes", () => {
			const content = `
import { helper } from "./helper";
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './helper' from src/features/feature.ts points to src/features/helper
			// From src/services/feature.ts, that's '../features/helper'
			expect(result).toContain('from "../features/helper"');
		});

		it("should ensure relative paths start with ./ or ../", () => {
			const content = `
import { helper } from './subdir/helper';
`;
			const oldPath = "src/features/subdir/feature.ts";
			const newPath = "src/features/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// './subdir/helper' from src/features/subdir/feature.ts points to src/features/subdir/subdir/helper
			// From src/features/feature.ts, that's './subdir/subdir/helper'
			// Should start with ./
			expect(result).toMatch(/from ['"]\.\/subdir\/subdir\/helper['"]/);
		});

		it("should handle complex directory structures", () => {
			const content = `
import { a } from './a';
import { b } from '../b';
import { c } from '../../c';
import { d } from '../../../d';
`;
			const oldPath = "src/features/auth/components/feature.ts";
			const newPath = "src/services/integration/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// All paths should be updated based on new location
			expect(result).toContain("from '../../features/auth/components/a'");
			expect(result).toContain("from '../../features/auth/b'");
			expect(result).toContain("from '../../features/c'");
			expect(result).toContain("from '../../d'");
		});

		it("should handle empty content", () => {
			const content = "";
			const oldPath = "src/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			expect(result).toBe("");
		});

		it("should handle content with no imports", () => {
			const content = `
export const test = 'test';
export function helper() {
  return 'helper';
}
`;
			const oldPath = "src/feature.ts";
			const newPath = "src/services/feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			expect(result).toBe(content);
		});

		it("should handle Windows-style paths correctly", () => {
			const content = `
import { helper } from './utils/helper';
`;
			const oldPath = "src\\features\\feature.ts";
			const newPath = "src\\services\\feature.ts";

			const result = updateImportPaths(content, oldPath, newPath);

			// Should normalize to forward slashes and update path correctly
			// './utils/helper' from src/features/feature.ts points to src/features/utils/helper
			// From src/services/feature.ts, that's '../features/utils/helper'
			expect(result).toContain("from '../features/utils/helper'");
			expect(result).not.toContain("\\");
		});

		it("should handle referenceMap with various path formats", () => {
			const content = `
import { helper } from '../temp/helper';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			// Need to use absolute paths in referenceMap
			const cwd = process.cwd().replace(/\\/g, "/");
			const referenceMap = new Map([[`${cwd}/src/temp/helper.ts`, `${cwd}/src/utils/helper.ts`]]);

			const result = updateImportPaths(content, oldPath, newPath, referenceMap);

			// '../temp/helper' from src/features/feature.ts points to src/temp/helper
			// But referenceMap says that file is now at src/utils/helper
			// From src/services/feature.ts, that's '../utils/helper'
			expect(result).toContain("from '../utils/helper'");
		});

		it("should handle referenceMap entries without extensions", () => {
			const content = `
import { helper } from '../temp/helper';
`;
			const oldPath = "src/features/feature.ts";
			const newPath = "src/services/feature.ts";

			// Need to use absolute paths in referenceMap
			const cwd = process.cwd().replace(/\\/g, "/");
			const referenceMap = new Map([[`${cwd}/src/temp/helper`, `${cwd}/src/utils/helper`]]);

			const result = updateImportPaths(content, oldPath, newPath, referenceMap);

			// '../temp/helper' from src/features/feature.ts points to src/temp/helper
			// But referenceMap says that file is now at src/utils/helper
			// From src/services/feature.ts, that's '../utils/helper'
			expect(result).toContain("from '../utils/helper'");
		});
	});
});

describe("File Manager - Rollback Mechanism", () => {
	const testDir = path.join(__dirname, ".test-rollback");
	const testFile1 = path.join(testDir, "file1.ts");
	const testFile2 = path.join(testDir, "file2.ts");
	const referenceDir = path.join(testDir, "reference");
	const referenceFile1 = path.join(referenceDir, "ref1.ts");
	const referenceFile2 = path.join(referenceDir, "ref2.ts");

	beforeEach(() => {
		// Create test directories
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
		if (!fs.existsSync(referenceDir)) {
			fs.mkdirSync(referenceDir, { recursive: true });
		}

		// Create test files
		fs.writeFileSync(testFile1, "original content 1");
		fs.writeFileSync(testFile2, "original content 2");
		fs.writeFileSync(referenceFile1, "reference content 1");
		fs.writeFileSync(referenceFile2, "reference content 2");
	});

	afterEach(() => {
		// Clean up test directory
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("rollback", () => {
		it("should restore all modified files from backups", () => {
			// Create backups
			const backup1 = createBackup(testFile1);
			const backup2 = createBackup(testFile2);

			// Modify files
			fs.writeFileSync(testFile1, "modified content 1");
			fs.writeFileSync(testFile2, "modified content 2");

			// Perform rollback
			const result = rollback([backup1, backup2]);

			// Verify files were restored
			expect(result.restoredFiles).toHaveLength(2);
			expect(result.restoredFiles).toContain(testFile1);
			expect(result.restoredFiles).toContain(testFile2);
			expect(fs.readFileSync(testFile1, "utf-8")).toBe("original content 1");
			expect(fs.readFileSync(testFile2, "utf-8")).toBe("original content 2");
			expect(result.errors).toHaveLength(0);
		});

		it("should restore deleted reference files", () => {
			// Create snapshot of reference files
			const deletedFiles = new Map([
				[referenceFile1, "reference content 1"],
				[referenceFile2, "reference content 2"],
			]);

			// Delete reference files
			fs.unlinkSync(referenceFile1);
			fs.unlinkSync(referenceFile2);
			expect(fs.existsSync(referenceFile1)).toBe(false);
			expect(fs.existsSync(referenceFile2)).toBe(false);

			// Perform rollback
			const result = rollback([], deletedFiles);

			// Verify reference files were restored
			expect(result.restoredReferenceFiles).toHaveLength(2);
			expect(result.restoredReferenceFiles).toContain(referenceFile1);
			expect(result.restoredReferenceFiles).toContain(referenceFile2);
			expect(fs.existsSync(referenceFile1)).toBe(true);
			expect(fs.existsSync(referenceFile2)).toBe(true);
			expect(fs.readFileSync(referenceFile1, "utf-8")).toBe("reference content 1");
			expect(fs.readFileSync(referenceFile2, "utf-8")).toBe("reference content 2");
			expect(result.errors).toHaveLength(0);
		});

		it("should restore both modified files and deleted reference files", () => {
			// Create backup
			const backup1 = createBackup(testFile1);

			// Modify file
			fs.writeFileSync(testFile1, "modified content 1");

			// Create snapshot and delete reference file
			const deletedFiles = new Map([[referenceFile1, "reference content 1"]]);
			fs.unlinkSync(referenceFile1);

			// Perform rollback
			const result = rollback([backup1], deletedFiles);

			// Verify both types of files were restored
			expect(result.restoredFiles).toHaveLength(1);
			expect(result.restoredFiles).toContain(testFile1);
			expect(result.restoredReferenceFiles).toHaveLength(1);
			expect(result.restoredReferenceFiles).toContain(referenceFile1);
			expect(fs.readFileSync(testFile1, "utf-8")).toBe("original content 1");
			expect(fs.readFileSync(referenceFile1, "utf-8")).toBe("reference content 1");
			expect(result.errors).toHaveLength(0);
		});

		it("should handle errors gracefully and continue with other files", () => {
			// Create valid backup
			const backup1 = createBackup(testFile1);
			fs.writeFileSync(testFile1, "modified content 1");

			// Create invalid backup (backup file doesn't exist)
			const invalidBackup: BackupInfo = {
				originalPath: testFile2,
				backupPath: path.join(testDir, ".backup_nonexistent_123456.ts"),
				timestamp: Date.now(),
			};

			// Perform rollback
			const result = rollback([backup1, invalidBackup]);

			// Verify valid file was restored
			expect(result.restoredFiles).toHaveLength(1);
			expect(result.restoredFiles).toContain(testFile1);
			expect(fs.readFileSync(testFile1, "utf-8")).toBe("original content 1");

			// Verify error was recorded
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].file).toBe(testFile2);
			expect(result.errors[0].error).toContain("backup does not exist");
		});

		it("should handle errors when restoring reference files", () => {
			// Create valid reference file snapshot
			const deletedFiles = new Map([
				[referenceFile1, "reference content 1"],
				["", "content"], // Invalid empty path
			]);

			fs.unlinkSync(referenceFile1);

			// Perform rollback
			const result = rollback([], deletedFiles);

			// Verify valid file was restored
			expect(result.restoredReferenceFiles).toHaveLength(1);
			expect(result.restoredReferenceFiles).toContain(referenceFile1);
			expect(fs.readFileSync(referenceFile1, "utf-8")).toBe("reference content 1");

			// Verify error was recorded
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].file).toBe("");
		});

		it("should handle empty backups array", () => {
			const result = rollback([]);

			expect(result.restoredFiles).toHaveLength(0);
			expect(result.restoredReferenceFiles).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
		});

		it("should handle undefined deletedReferenceFiles", () => {
			const backup1 = createBackup(testFile1);
			fs.writeFileSync(testFile1, "modified content 1");

			const result = rollback([backup1], undefined);

			expect(result.restoredFiles).toHaveLength(1);
			expect(result.restoredReferenceFiles).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
		});

		it("should report all files restored in result", () => {
			// Create multiple backups
			const backup1 = createBackup(testFile1);
			const backup2 = createBackup(testFile2);

			// Modify files
			fs.writeFileSync(testFile1, "modified 1");
			fs.writeFileSync(testFile2, "modified 2");

			// Create reference file snapshot
			const deletedFiles = new Map([
				[referenceFile1, "reference content 1"],
				[referenceFile2, "reference content 2"],
			]);

			fs.unlinkSync(referenceFile1);
			fs.unlinkSync(referenceFile2);

			// Perform rollback
			const result = rollback([backup1, backup2], deletedFiles);

			// Verify result contains all restored files
			expect(result.restoredFiles).toEqual([testFile1, testFile2]);
			expect(result.restoredReferenceFiles).toEqual([referenceFile1, referenceFile2]);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("snapshotReferenceFiles", () => {
		it("should create snapshot of all reference files", () => {
			const snapshot = snapshotReferenceFiles([referenceFile1, referenceFile2]);

			expect(snapshot.size).toBe(2);
			expect(snapshot.get(referenceFile1)).toBe("reference content 1");
			expect(snapshot.get(referenceFile2)).toBe("reference content 2");
		});

		it("should handle empty file list", () => {
			const snapshot = snapshotReferenceFiles([]);

			expect(snapshot.size).toBe(0);
		});

		it("should throw error if file does not exist", () => {
			const nonExistentFile = path.join(referenceDir, "nonexistent.ts");

			expect(() => snapshotReferenceFiles([nonExistentFile])).toThrow(
				/Failed to snapshot reference file/,
			);
		});

		it("should throw error if any file cannot be read", () => {
			const nonExistentFile = path.join(referenceDir, "nonexistent.ts");

			expect(() => snapshotReferenceFiles([referenceFile1, nonExistentFile])).toThrow(
				/Failed to snapshot reference file/,
			);
		});

		it("should preserve exact file content in snapshot", () => {
			const complexContent = `
import { helper } from './helper';

export class TestClass {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}

export const test = "test with 'quotes' and \\"escapes\\"";
`;
			fs.writeFileSync(referenceFile1, complexContent);

			const snapshot = snapshotReferenceFiles([referenceFile1]);

			expect(snapshot.get(referenceFile1)).toBe(complexContent);
		});

		it("should handle UTF-8 content correctly", () => {
			const utf8Content = 'export const emoji = "🚀 Hello 世界";';
			fs.writeFileSync(referenceFile1, utf8Content);

			const snapshot = snapshotReferenceFiles([referenceFile1]);

			expect(snapshot.get(referenceFile1)).toBe(utf8Content);
		});
	});

	describe("Integration: Rollback workflow", () => {
		it("should support complete rollback workflow", () => {
			// Step 1: Create backups before modification
			const backup1 = createBackup(testFile1);
			const backup2 = createBackup(testFile2);

			// Step 2: Snapshot reference files before deletion
			const snapshot = snapshotReferenceFiles([referenceFile1, referenceFile2]);

			// Step 3: Perform integration operations (modify and delete)
			fs.writeFileSync(testFile1, "integrated content 1");
			fs.writeFileSync(testFile2, "integrated content 2");
			fs.unlinkSync(referenceFile1);
			fs.unlinkSync(referenceFile2);

			// Verify integration state
			expect(fs.readFileSync(testFile1, "utf-8")).toBe("integrated content 1");
			expect(fs.readFileSync(testFile2, "utf-8")).toBe("integrated content 2");
			expect(fs.existsSync(referenceFile1)).toBe(false);
			expect(fs.existsSync(referenceFile2)).toBe(false);

			// Step 4: Rollback due to error
			const result = rollback([backup1, backup2], snapshot);

			// Verify complete rollback
			expect(result.restoredFiles).toHaveLength(2);
			expect(result.restoredReferenceFiles).toHaveLength(2);
			expect(result.errors).toHaveLength(0);

			// Verify original state restored
			expect(fs.readFileSync(testFile1, "utf-8")).toBe("original content 1");
			expect(fs.readFileSync(testFile2, "utf-8")).toBe("original content 2");
			expect(fs.readFileSync(referenceFile1, "utf-8")).toBe("reference content 1");
			expect(fs.readFileSync(referenceFile2, "utf-8")).toBe("reference content 2");
		});

		it("should handle partial rollback when some operations fail", () => {
			// Create backup
			const backup1 = createBackup(testFile1);

			// Create snapshot with one valid and one invalid file
			const snapshot = snapshotReferenceFiles([referenceFile1]);
			snapshot.set("", "content"); // Add invalid empty path entry

			// Modify and delete
			fs.writeFileSync(testFile1, "modified");
			fs.unlinkSync(referenceFile1);

			// Rollback
			const result = rollback([backup1], snapshot);

			// Verify partial success
			expect(result.restoredFiles).toHaveLength(1);
			expect(result.restoredReferenceFiles).toHaveLength(1);
			expect(result.errors).toHaveLength(1);

			// Verify valid files were restored
			expect(fs.readFileSync(testFile1, "utf-8")).toBe("original content 1");
			expect(fs.readFileSync(referenceFile1, "utf-8")).toBe("reference content 1");
		});

		it("should handle rollback when original files were deleted", () => {
			// Create backups
			const backup1 = createBackup(testFile1);
			const backup2 = createBackup(testFile2);

			// Delete original files (simulating move operation)
			fs.unlinkSync(testFile1);
			fs.unlinkSync(testFile2);

			// Rollback
			const result = rollback([backup1, backup2]);

			// Verify files were restored
			expect(result.restoredFiles).toHaveLength(2);
			expect(fs.existsSync(testFile1)).toBe(true);
			expect(fs.existsSync(testFile2)).toBe(true);
			expect(fs.readFileSync(testFile1, "utf-8")).toBe("original content 1");
			expect(fs.readFileSync(testFile2, "utf-8")).toBe("original content 2");
		});
	});
});
