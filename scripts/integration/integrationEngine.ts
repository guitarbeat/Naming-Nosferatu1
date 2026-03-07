// @ts-nocheck
/**
 * Integration Engine - Performs file integration operations
 *
 * Requirements: 3.5
 */

import * as path from "node:path";
import { compareFiles } from "./fileComparator";
import { createDirectory, fileExists, readFile, writeFile } from "./fileManager";
import { mergeFiles } from "./fileMerger";
import type { FileAnalysis, IntegrationResult, MergeStrategy } from "./types";

const INVALID_FILENAME_REGEX = /[<>:"/\\|?*]/;

/**
 * Integrates a reference file into the target location
 *
 * This function handles both scenarios:
 * - Creating a new file when no existing file exists (Requirement 3.5)
 * - Merging with an existing file when one exists (Requirements 3.2, 3.3, 3.4)
 *
 * @param analysis - FileAnalysis containing file information
 * @param referenceContent - Content of the reference file
 * @param strategy - MergeStrategy defining how to handle the integration
 * @returns IntegrationResult containing the result of the integration
 *
 * Requirements: 3.5
 */
export function integrateFile(
	analysis: FileAnalysis,
	referenceContent: string,
	strategy: MergeStrategy,
	projectRoot: string = "",
): IntegrationResult {
	const fileNameFromPath =
		typeof analysis.filePath === "string" && analysis.filePath.length > 0
			? path.basename(analysis.filePath)
			: "";
	const safeTargetLocation =
		typeof analysis.targetLocation === "string" ? analysis.targetLocation : "";
	const safeFileName = typeof analysis.fileName === "string" ? analysis.fileName : fileNameFromPath;
	const finalFileName = safeFileName || "unknown-file";
	const targetPath = path.join(projectRoot, safeTargetLocation, finalFileName);
	const actionsLog: string[] = [];

	try {
		actionsLog.push(`Starting integration of ${finalFileName}`);
		if (!safeTargetLocation) {
			actionsLog.push("Integration failed: Missing targetLocation or fileName");
			return {
				success: false,
				filePath: analysis.filePath,
				targetPath,
				action: "skipped",
				error: new Error("Missing fileName"),
				actionsLog,
			};
		}
		if (isInvalidFileName(finalFileName)) {
			const error = new Error(`Invalid file name: ${finalFileName}`);
			actionsLog.push(`Integration failed: ${error.message}`);
			return {
				success: false,
				filePath: analysis.filePath,
				targetPath,
				action: "skipped",
				error,
				actionsLog,
			};
		}

		// Check if target file already exists
		if (fileExists(targetPath)) {
			actionsLog.push(`Existing file found at ${targetPath}`);
			// Existing file - merge files (Requirements 3.2, 3.3, 3.4)
			return mergeWithExistingFile(analysis, referenceContent, targetPath, strategy, actionsLog);
		} else {
			actionsLog.push(`No existing file found at ${targetPath}`);
			// No existing file - create new file (Requirement 3.5)
			return createNewFile(analysis, referenceContent, targetPath, actionsLog);
		}
	} catch (error) {
		actionsLog.push(
			`Integration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return {
			success: false,
			filePath: analysis.filePath,
			targetPath,
			action: "skipped",
			error: error instanceof Error ? error : new Error(String(error)),
			actionsLog,
		};
	}
}

/**
 * Creates a new file at the target location
 *
 * This function:
 * 1. Ensures the target directory exists
 * 2. Writes the reference file content to the target location
 *
 * @param analysis - FileAnalysis containing file information
 * @param content - Content to write to the new file
 * @param targetPath - Full path where the file should be created
 * @param actionsLog - Log of actions taken during integration
 * @returns IntegrationResult indicating success or failure
 *
 * Requirements: 3.5, 9.2
 */
function createNewFile(
	analysis: FileAnalysis,
	content: string,
	targetPath: string,
	actionsLog: string[],
): IntegrationResult {
	try {
		// Ensure target directory exists
		const targetDirectory = path.dirname(targetPath);
		actionsLog.push(`Creating directory structure: ${targetDirectory}`);
		createDirectory(targetDirectory);

		// Write the file
		actionsLog.push(`Writing new file to ${targetPath}`);
		writeFile(targetPath, content);
		actionsLog.push(`Successfully created file at ${targetPath}`);

		return {
			success: true,
			filePath: analysis.filePath,
			targetPath,
			action: "created",
			actionsLog,
		};
	} catch (error) {
		actionsLog.push(
			`Failed to create file: ${error instanceof Error ? error.message : String(error)}`,
		);
		return {
			success: false,
			filePath: analysis.filePath,
			targetPath,
			action: "skipped",
			error: error instanceof Error ? error : new Error(String(error)),
			actionsLog,
		};
	}
}

function isInvalidFileName(fileName: string): boolean {
	if (!fileName || fileName === "." || fileName === "..") {
		return true;
	}

	if (INVALID_FILENAME_REGEX.test(fileName)) {
		return true;
	}

	for (let index = 0; index < fileName.length; index += 1) {
		const code = fileName.charCodeAt(index);
		if (Number.isFinite(code) && code < 32) {
			return true;
		}
	}

	return false;
}

/**
 * Merges a reference file with an existing file
 *
 * @param analysis - FileAnalysis containing file information
 * @param referenceContent - Content of the reference file
 * @param targetPath - Full path to the existing file
 * @param strategy - MergeStrategy defining how to handle the merge
 * @param actionsLog - Log of actions taken during integration
 * @returns IntegrationResult indicating success or failure
 *
 * Requirements: 3.2, 3.3, 3.4, 9.2
 */
function mergeWithExistingFile(
	analysis: FileAnalysis,
	referenceContent: string,
	targetPath: string,
	strategy: MergeStrategy,
	actionsLog: string[],
): IntegrationResult {
	try {
		// Read existing file content
		actionsLog.push(`Reading existing file from ${targetPath}`);
		const existingContent = readFile(targetPath);

		// Compare files to identify differences and conflicts
		actionsLog.push("Comparing reference file with existing file");
		const comparison = compareFiles(
			analysis.filePath,
			targetPath,
			referenceContent,
			existingContent,
		);

		// Merge files based on strategy
		actionsLog.push(
			`Merging files using strategy: preserveExisting=${strategy.preserveExisting}, addNewExports=${strategy.addNewExports}`,
		);
		const mergeResult = mergeFiles(comparison, strategy);

		// If there are conflicts and user input is requested, return without modifying
		if (mergeResult.conflicts.length > 0 && strategy.requestUserInput) {
			actionsLog.push(
				`Merge skipped: ${mergeResult.conflicts.length} conflict(s) detected, user input required`,
			);
			return {
				success: false,
				filePath: analysis.filePath,
				targetPath,
				action: "skipped",
				conflicts: mergeResult.conflicts,
				actionsLog,
			};
		}

		// Write merged content
		actionsLog.push(`Writing merged content to ${targetPath}`);
		writeFile(targetPath, mergeResult.mergedContent);

		if (mergeResult.conflicts.length > 0) {
			actionsLog.push(
				`Merge completed with ${mergeResult.conflicts.length} conflict(s) resolved automatically`,
			);
		} else {
			actionsLog.push("Merge completed successfully with no conflicts");
		}

		return {
			success: true,
			filePath: analysis.filePath,
			targetPath,
			action: "merged",
			conflicts: mergeResult.conflicts,
			actionsLog,
		};
	} catch (error) {
		actionsLog.push(`Merge failed: ${error instanceof Error ? error.message : String(error)}`);
		return {
			success: false,
			filePath: analysis.filePath,
			targetPath,
			action: "skipped",
			error: error instanceof Error ? error : new Error(String(error)),
			actionsLog,
		};
	}
}
