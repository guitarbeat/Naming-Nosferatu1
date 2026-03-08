// @ts-nocheck
/**
 * File Manager - Handles file operations including backups, restoration, and safe file operations
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { BackupInfo } from "./types";

/**
 * Creates a timestamped backup of a file before modification
 * @param filePath - Path to the file to backup
 * @returns BackupInfo containing backup details
 * @throws Error if file doesn't exist or backup fails
 */
export function createBackup(filePath: string): BackupInfo {
	// Verify the file exists
	if (!fs.existsSync(filePath)) {
		throw new Error(`Cannot create backup: file does not exist at ${filePath}`);
	}

	// Generate timestamp for backup
	const parsedPath = path.parse(filePath);
	let timestamp = Date.now();
	let backupPath = path.join(
		parsedPath.dir,
		`.backup_${parsedPath.name}_${timestamp}${parsedPath.ext}`,
	);

	// Ensure backup path is unique even when multiple backups happen in the same millisecond
	while (fs.existsSync(backupPath)) {
		timestamp += 1;
		backupPath = path.join(
			parsedPath.dir,
			`.backup_${parsedPath.name}_${timestamp}${parsedPath.ext}`,
		);
	}

	// Copy file to backup location
	try {
		fs.copyFileSync(filePath, backupPath);
	} catch (error) {
		throw new Error(
			`Failed to create backup of ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return {
		originalPath: filePath,
		backupPath,
		timestamp,
	};
}

/**
 * Restores a file from its backup
 * @param backup - BackupInfo containing backup details
 * @throws Error if backup doesn't exist or restoration fails
 */
export function restoreBackup(backup: BackupInfo): void {
	// Verify backup exists
	if (!fs.existsSync(backup.backupPath)) {
		throw new Error(`Cannot restore: backup does not exist at ${backup.backupPath}`);
	}

	try {
		// Restore file from backup
		fs.copyFileSync(backup.backupPath, backup.originalPath);

		// Delete the backup file after successful restoration
		fs.unlinkSync(backup.backupPath);
	} catch (error) {
		throw new Error(
			`Failed to restore backup from ${backup.backupPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Deletes a backup file
 * @param backup - BackupInfo containing backup details
 */
export function deleteBackup(backup: BackupInfo): void {
	if (fs.existsSync(backup.backupPath)) {
		try {
			fs.unlinkSync(backup.backupPath);
		} catch (error) {
			// Log but don't throw - backup cleanup is not critical
			console.warn(`Failed to delete backup at ${backup.backupPath}: ${error}`);
		}
	}
}

/**
 * Gets all backup files in a directory
 * @param dirPath - Directory to search for backups
 * @returns Array of backup file paths
 */
export function listBackups(dirPath: string): string[] {
	if (!fs.existsSync(dirPath)) {
		return [];
	}

	try {
		const files = fs.readdirSync(dirPath);
		return files
			.filter((file) => file.startsWith(".backup_"))
			.map((file) => path.join(dirPath, file));
	} catch (error) {
		console.warn(`Failed to list backups in ${dirPath}: ${error}`);
		return [];
	}
}

/**
 * Safely reads a file's content
 * @param filePath - Path to the file to read
 * @returns File content as string
 * @throws Error if file doesn't exist or read fails
 */
export function readFile(filePath: string): string {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Cannot read file: file does not exist at ${filePath}`);
	}

	try {
		return fs.readFileSync(filePath, "utf-8");
	} catch (error) {
		throw new Error(
			`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Safely writes content to a file, creating directories if needed
 * @param filePath - Path to the file to write
 * @param content - Content to write to the file
 * @throws Error if write fails
 */
export function writeFile(filePath: string, content: string): void {
	try {
		// Ensure directory exists
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// Write file
		fs.writeFileSync(filePath, content, "utf-8");
	} catch (error) {
		throw new Error(
			`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Safely deletes a file
 * @param filePath - Path to the file to delete
 * @throws Error if file doesn't exist or deletion fails
 */
export function deleteFile(filePath: string): void {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Cannot delete file: file does not exist at ${filePath}`);
	}

	try {
		fs.unlinkSync(filePath);
	} catch (error) {
		throw new Error(
			`Failed to delete file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Checks if a file exists
 * @param filePath - Path to check
 * @returns true if file exists, false otherwise
 */
export function fileExists(filePath: string): boolean {
	try {
		return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
	} catch (_error) {
		return false;
	}
}

/**
 * Checks if a directory exists
 * @param dirPath - Path to check
 * @returns true if directory exists, false otherwise
 */
export function directoryExists(dirPath: string): boolean {
	try {
		return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
	} catch (_error) {
		return false;
	}
}

/**
 * Creates a directory and all parent directories if they don't exist
 * @param dirPath - Path to the directory to create
 * @throws Error if directory creation fails
 */
export function createDirectory(dirPath: string): void {
	try {
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
	} catch (error) {
		throw new Error(
			`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Deletes a directory and all its contents
 * @param dirPath - Path to the directory to delete
 * @throws Error if directory doesn't exist or deletion fails
 */
export function deleteDirectory(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		throw new Error(`Cannot delete directory: directory does not exist at ${dirPath}`);
	}

	try {
		fs.rmSync(dirPath, { recursive: true, force: true });
	} catch (error) {
		throw new Error(
			`Failed to delete directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
/**
 * Updates import paths in file content when moving a file to a new location
 *
 * This function transforms relative import paths to reflect the file's new location
 * and updates cross-references to other files that may have moved to their target locations.
 *
 * @param content - The file content containing import statements
 * @param oldPath - The original file path
 * @param newPath - The new file path after moving
 * @param referenceMap - Optional map of old paths to new paths for cross-references
 * @returns Updated file content with corrected import paths
 *
 * Requirements: 4.1, 4.2, 4.3
 */
export function updateImportPaths(
	content: string,
	oldPath: string,
	newPath: string,
	referenceMap?: Map<string, string>,
): string {
	// Parse the content to find import statements
	const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
	const exportFromRegex = /export\s+(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"]/g;

	let updatedContent = content;
	const replacements: Array<{ original: string; updated: string }> = [];

	// Find all import statements
	let match = importRegex.exec(content);
	while (match !== null) {
		const importPath = match[1];
		const fullMatch = match[0];

		// Only process relative imports (starting with . or ..)
		if (importPath.startsWith(".")) {
			const updatedPath = transformImportPath(importPath, oldPath, newPath, referenceMap);
			if (updatedPath !== importPath) {
				replacements.push({
					original: fullMatch,
					updated: fullMatch.replace(importPath, updatedPath),
				});
			}
		}
		match = importRegex.exec(content);
	}

	// Find all export-from statements
	importRegex.lastIndex = 0; // Reset regex
	match = exportFromRegex.exec(content);
	while (match !== null) {
		const importPath = match[1];
		const fullMatch = match[0];

		// Only process relative imports
		if (importPath.startsWith(".")) {
			const updatedPath = transformImportPath(importPath, oldPath, newPath, referenceMap);
			if (updatedPath !== importPath) {
				replacements.push({
					original: fullMatch,
					updated: fullMatch.replace(importPath, updatedPath),
				});
			}
		}
		match = exportFromRegex.exec(content);
	}

	// Apply all replacements
	for (const { original, updated } of replacements) {
		updatedContent = updatedContent.replace(original, updated);
	}

	return updatedContent;
}

/**
 * Transforms a single import path based on file relocation
 *
 * @param importPath - The original import path (relative)
 * @param oldFilePath - The original file path
 * @param newFilePath - The new file path
 * @param referenceMap - Optional map of old paths to new paths for cross-references
 * @returns The transformed import path
 */
function transformImportPath(
	importPath: string,
	oldFilePath: string,
	newFilePath: string,
	referenceMap?: Map<string, string>,
): string {
	const normalizedImportPath = normalizePathForComparison(importPath);
	const normalizedOldFilePath = toNormalizedAbsolutePath(oldFilePath);
	const normalizedNewFilePath = toNormalizedAbsolutePath(newFilePath);

	// Resolve the absolute path that the import currently points to
	const oldFileDir = path.posix.dirname(normalizedOldFilePath);
	const absoluteImportPath = path.posix.resolve(oldFileDir, normalizedImportPath);

	// Check if this import points to a file that has been moved (using referenceMap)
	let targetPath = absoluteImportPath;
	if (referenceMap) {
		const normalizedPath = toNormalizedAbsolutePath(absoluteImportPath);

		// Check if this path (or with extensions) exists in the reference map
		for (const [oldRef, newRef] of referenceMap.entries()) {
			const normalizedOldRef = toNormalizedAbsolutePath(oldRef);

			// Check exact match or match without extension
			if (
				normalizedPath === normalizedOldRef ||
				normalizedPath === normalizedOldRef.replace(/\.(ts|tsx|js|jsx)$/, "") ||
				`${normalizedPath}.ts` === normalizedOldRef ||
				`${normalizedPath}.tsx` === normalizedOldRef
			) {
				targetPath = toNormalizedAbsolutePath(newRef);
				break;
			}
		}
	}

	// Calculate the new relative path from the new file location to the target
	const newFileDir = path.posix.dirname(normalizedNewFilePath);
	let newRelativePath = path.posix.relative(newFileDir, targetPath);

	// Ensure the path starts with ./ or ../
	if (!newRelativePath.startsWith(".")) {
		newRelativePath = `./${newRelativePath}`;
	}

	// Remove file extensions if the original import didn't have them
	if (!normalizedImportPath.match(/\.(ts|tsx|js|jsx)$/)) {
		newRelativePath = newRelativePath.replace(/\.(ts|tsx|js|jsx)$/, "");
	}

	return newRelativePath;
}

function normalizePathForComparison(filePath: string): string {
	return filePath.replace(/\\/g, "/");
}

function toNormalizedAbsolutePath(filePath: string): string {
	const normalizedPath = normalizePathForComparison(filePath);
	if (path.posix.isAbsolute(normalizedPath)) {
		return path.posix.normalize(normalizedPath);
	}

	const cwd = normalizePathForComparison(process.cwd());
	return path.posix.normalize(path.posix.resolve(cwd, normalizedPath));
}

export interface RollbackResult {
	restoredFiles: string[];
	restoredReferenceFiles: string[];
	errors: Array<{
		file: string;
		error: string;
	}>;
}

/**
 * Creates an in-memory snapshot of reference files before deletion.
 */
export function snapshotReferenceFiles(referenceFiles: string[]): Map<string, string> {
	const snapshot = new Map<string, string>();

	for (const filePath of referenceFiles) {
		try {
			if (!fs.existsSync(filePath)) {
				throw new Error(`file does not exist at ${filePath}`);
			}

			const content = fs.readFileSync(filePath, "utf-8");
			snapshot.set(filePath, content);
		} catch (error) {
			throw new Error(
				`Failed to snapshot reference file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return snapshot;
}

/**
 * Restores backed up target files and deleted reference files.
 */
export function rollback(
	backups: BackupInfo[],
	deletedReferenceFiles?: Map<string, string>,
): RollbackResult {
	const result: RollbackResult = {
		restoredFiles: [],
		restoredReferenceFiles: [],
		errors: [],
	};

	for (const backup of backups) {
		try {
			restoreBackup(backup);
			result.restoredFiles.push(backup.originalPath);
		} catch (error) {
			result.errors.push({
				file: backup.originalPath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	if (deletedReferenceFiles) {
		for (const [filePath, content] of deletedReferenceFiles.entries()) {
			try {
				if (!filePath) {
					throw new Error("Invalid reference file path");
				}

				const directory = path.dirname(filePath);
				if (directory && !fs.existsSync(directory)) {
					fs.mkdirSync(directory, { recursive: true });
				}

				fs.writeFileSync(filePath, content, "utf-8");
				result.restoredReferenceFiles.push(filePath);
			} catch (error) {
				result.errors.push({
					file: filePath,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	return result;
}
