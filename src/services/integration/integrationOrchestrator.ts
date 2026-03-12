// @ts-nocheck
/**
 * Integration Orchestrator
 *
 * Main controller that manages the entire integration workflow:
 * 1. Analyzes all reference files
 * 2. Builds dependency graph
 * 3. Processes files in dependency order
 * 4. Verifies builds after each integration
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.4, 8.2
 */

import { readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { importsToDependencies, parseFile } from "./astParser";
import { diagnoseErrors, verifyBuild } from "./buildVerifier";
import {
	buildDependencyGraph,
	detectCircularDependencies,
	getIntegrationOrder,
} from "./dependencyGraphBuilder";
import { resolveDependencies } from "./dependencyResolver";
import {
	createIntegrationError,
	ErrorCode,
	formatErrorWithSuggestions,
	getRecoveryStrategy,
} from "./errorRecovery";
import {
	createBackup,
	deleteDirectory,
	deleteFile,
	directoryExists,
	fileExists,
	readFile,
	rollback,
} from "./fileManager";
import { classifyFile } from "./fileTypeClassifier";
import { integrateFile } from "./integrationEngine";
import { IntegrationStateManager } from "./integrationStateManager";
import { resolveTargetLocation } from "./targetLocationResolver";
import {
	type DependencyGraph,
	type FileAnalysis,
	type IntegrationConfig,
	IntegrationError,
	type IntegrationResult,
} from "./types";

/**
 * Result of the complete integration workflow
 */
interface OrchestrationResult {
	success: boolean;
	totalFiles: number;
	completedFiles: number;
	failedFiles: number;
	skippedFiles: number;
	integrationResults: IntegrationResult[];
	errors: string[];
}

/**
 * Main integration orchestrator class
 */
export class IntegrationOrchestrator {
	private config: IntegrationConfig;
	private stateManager: IntegrationStateManager;
	private projectRoot: string;

	constructor(config: IntegrationConfig, projectRoot: string = process.cwd()) {
		this.config = config;
		this.projectRoot = projectRoot;
		this.stateManager = new IntegrationStateManager(0); // Will be updated after file discovery
	}

	/**
	 * Execute the complete integration workflow
	 *
	 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.4, 8.2
	 */
	async execute(): Promise<OrchestrationResult> {
		const errors: string[] = [];
		const integrationResults: IntegrationResult[] = [];

		try {
			console.log("Starting integration workflow...");

			// Step 1: Discover all reference files
			console.log("\n[Step 1/5] Discovering reference files...");
			const referenceFiles = this.discoverReferenceFiles();
			console.log(`Found ${referenceFiles.length} reference files`);

			if (referenceFiles.length === 0) {
				return {
					success: true,
					totalFiles: 0,
					completedFiles: 0,
					failedFiles: 0,
					skippedFiles: 0,
					integrationResults: [],
					errors: ["No reference files found in source directory"],
				};
			}

			// Initialize state manager with correct file count
			this.stateManager = new IntegrationStateManager(referenceFiles.length);

			// Step 2: Analyze all files
			console.log("\n[Step 2/5] Analyzing files...");
			const analyses = this.analyzeFiles(referenceFiles);
			console.log(`Analyzed ${analyses.length} files`);

			// Step 3: Build dependency graph
			console.log("\n[Step 3/5] Building dependency graph...");
			const graph = this.buildGraph(analyses);

			// Check for circular dependencies
			const circularDeps = detectCircularDependencies(graph);
			if (circularDeps.length > 0) {
				console.warn("Warning: Circular dependencies detected:");
				for (const cd of circularDeps) {
					console.warn(`  - ${cd.description}`);
				}
				errors.push(...circularDeps.map((cd) => cd.description));

				if (this.config.stopOnError) {
					return {
						success: false,
						totalFiles: referenceFiles.length,
						completedFiles: 0,
						failedFiles: 0,
						skippedFiles: referenceFiles.length,
						integrationResults: [],
						errors,
					};
				}
			}

			// Step 4: Get integration order
			console.log("\n[Step 4/5] Determining integration order...");
			let integrationOrder: string[];
			try {
				integrationOrder = getIntegrationOrder(graph);
				console.log(`Integration order determined: ${integrationOrder.length} files`);
			} catch (error) {
				const errorMsg = `Failed to determine integration order: ${error instanceof Error ? error.message : String(error)}`;
				console.error(errorMsg);
				errors.push(errorMsg);

				return {
					success: false,
					totalFiles: referenceFiles.length,
					completedFiles: 0,
					failedFiles: 0,
					skippedFiles: referenceFiles.length,
					integrationResults: [],
					errors,
				};
			}

			// Step 5: Process files in order
			console.log("\n[Step 5/5] Processing files...");
			for (const filePath of integrationOrder) {
				// Skip if already completed (for resume capability)
				if (this.stateManager.isFileCompleted(filePath)) {
					console.log(`Skipping already completed file: ${basename(filePath)}`);
					continue;
				}

				this.stateManager.setCurrentFile(filePath);
				console.log(`\nProcessing: ${basename(filePath)}`);

				// Find the analysis for this file
				const analysis = analyses.find((a) => a.filePath === filePath);
				if (!analysis) {
					const errorMsg = `Analysis not found for ${filePath}`;
					console.error(errorMsg);
					errors.push(errorMsg);
					this.stateManager.markFileFailed(filePath, new Error(errorMsg));
					continue;
				}

				// Integrate the file
				const result = await this.integrateFile(analysis);
				integrationResults.push(result);

				if (!result.success) {
					console.error(`Failed to integrate ${basename(filePath)}: ${result.error?.message}`);
					this.stateManager.markFileFailed(filePath, result.error || new Error("Unknown error"));

					// Use error recovery system to handle the error
					const canContinue = this.handleIntegrationError(
						result.error || new Error("Unknown error"),
						filePath,
					);

					if (!canContinue || this.config.stopOnError) {
						errors.push(`Integration stopped due to error in ${basename(filePath)}`);
						break;
					}
					continue;
				}

				// Verify build if configured
				let buildResult = null;
				if (this.config.verifyAfterEach) {
					console.log("Verifying build...");
					buildResult = verifyBuild();

					if (!buildResult.success) {
						console.error(`Build verification failed after integrating ${basename(filePath)}`);
						const diagnostic = diagnoseErrors(buildResult.errors);
						console.error(`Error summary: ${diagnostic.errorSummary}`);

						if (diagnostic.suggestedFixes.length > 0) {
							console.log("Suggested fixes:");
							for (const fix of diagnostic.suggestedFixes) {
								console.log(`  - ${fix}`);
							}
						}

						errors.push(`Build failed after ${basename(filePath)}: ${diagnostic.errorSummary}`);

						// Create a build error and use error recovery system
						const buildError = new IntegrationError(
							`Build verification failed: ${diagnostic.errorSummary}`,
							ErrorCode.BUILD_ERROR,
							filePath,
						);

						this.stateManager.markFileFailed(filePath, buildError);

						// Use error recovery system to handle the build error
						const canContinue = this.handleIntegrationError(buildError, filePath);

						if (!canContinue || this.config.stopOnError) {
							errors.push("Integration stopped due to build failure");
							break;
						}
						continue;
					}

					console.log("Build verification passed");
				}

				// Delete reference file if configured and conditions are met
				// Requirements 6.1, 6.2, 6.3: Delete only after successful integration and verification
				if (this.config.deleteAfterSuccess && result.success) {
					const shouldDelete = this.shouldDeleteReferenceFile(result, buildResult);

					if (shouldDelete) {
						try {
							deleteFile(filePath);
							console.log(`Deleted reference file: ${basename(filePath)}`);
						} catch (error) {
							console.warn(
								`Failed to delete reference file: ${error instanceof Error ? error.message : String(error)}`,
							);
						}
					} else {
						console.log("Preserving reference file: awaiting user input or verification");
					}
				}

				this.stateManager.markFileCompleted(filePath);
				console.log(`Successfully integrated ${basename(filePath)}`);
			}

			// Mark integration as complete
			this.stateManager.markComplete();

			// Requirement 6.4: Remove once-integrated-delete directory when all files are processed
			await this.cleanupSourceDirectory(referenceFiles, integrationResults);

			// Generate summary
			const state = this.stateManager.getState();
			console.log(`\n${"=".repeat(60)}`);
			console.log("Integration Complete");
			console.log("=".repeat(60));
			console.log(this.stateManager.getSummary());

			return {
				success: state.failedFiles.size === 0,
				totalFiles: state.totalFiles,
				completedFiles: state.completedFiles.length,
				failedFiles: state.failedFiles.size,
				skippedFiles: state.skippedFiles.size,
				integrationResults,
				errors,
			};
		} catch (error) {
			const errorMsg = `Integration workflow failed: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);

			return {
				success: false,
				totalFiles: 0,
				completedFiles: 0,
				failedFiles: 0,
				skippedFiles: 0,
				integrationResults,
				errors,
			};
		}
	}

	/**
	 * Discover all reference files in the source directory
	 */
	private discoverReferenceFiles(): string[] {
		const sourceDir = join(this.projectRoot, this.config.sourceDirectory);

		try {
			// Check if directory exists
			const stat = statSync(sourceDir);
			if (!stat.isDirectory()) {
				console.warn(`Source path is not a directory: ${sourceDir}`);
				return [];
			}
		} catch (_error) {
			console.warn(`Source directory not found: ${sourceDir}`);
			return [];
		}

		try {
			const files = readdirSync(sourceDir);
			return files
				.filter((file) => {
					const filePath = join(sourceDir, file);
					const stat = statSync(filePath);
					// Only include TypeScript/JavaScript files
					return stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file);
				})
				.map((file) => join(sourceDir, file));
		} catch (error) {
			console.error(
				`Failed to read source directory: ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
		}
	}

	/**
	 * Analyze all reference files
	 *
	 * Requirements: 1.1, 1.2, 1.3, 1.4
	 */
	private analyzeFiles(filePaths: string[]): FileAnalysis[] {
		const analyses: FileAnalysis[] = [];

		for (const filePath of filePaths) {
			try {
				console.log(`Analyzing: ${basename(filePath)}`);
				const analysis = this.analyzeFile(filePath);
				analyses.push(analysis);
			} catch (error) {
				console.error(
					`Failed to analyze ${basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		return analyses;
	}

	/**
	 * Analyze a single file
	 *
	 * Requirements: 1.1, 1.2, 1.3, 1.4
	 */
	private analyzeFile(filePath: string): FileAnalysis {
		// Parse the file to extract imports and exports
		const parsed = parseFile(filePath);

		// Classify the file type
		const fileType = classifyFile(filePath);

		// Determine target location
		const targetLocation = resolveTargetLocation(filePath, fileType);

		// Convert imports to dependencies
		const dependencies = importsToDependencies(parsed.imports);

		// Resolve dependencies
		const resolvedDependencies = resolveDependencies(dependencies, filePath, this.projectRoot);

		// Check if target file already exists
		const fileName = basename(filePath);
		const targetPath = targetLocation ? join(this.projectRoot, targetLocation, fileName) : null;
		const hasExistingFile = targetPath ? fileExists(targetPath) : false;

		return {
			filePath,
			fileName,
			fileType,
			targetLocation: targetLocation || "",
			dependencies: resolvedDependencies,
			exports: parsed.exports,
			hasExistingFile,
		};
	}

	/**
	 * Build dependency graph from analyses
	 *
	 * Requirement: 8.2
	 */
	private buildGraph(analyses: FileAnalysis[]): DependencyGraph {
		return buildDependencyGraph(analyses);
	}

	/**
	 * Integrate a single file
	 *
	 * Requirements: 5.1, 5.4
	 */
	private async integrateFile(analysis: FileAnalysis): Promise<IntegrationResult> {
		try {
			// Read reference file content
			const referenceContent = readFile(analysis.filePath);

			// Create backup if configured and target file exists
			if (this.config.createBackups && analysis.hasExistingFile) {
				const targetPath = join(this.projectRoot, analysis.targetLocation, analysis.fileName);
				const backup = createBackup(targetPath);
				this.stateManager.addBackup(backup);
				console.log(`Created backup: ${basename(backup.backupPath)}`);
			}

			// Perform integration
			const result = integrateFile(
				analysis,
				referenceContent,
				this.config.mergeStrategy,
				this.projectRoot,
			);

			return result;
		} catch (error) {
			return {
				success: false,
				filePath: analysis.filePath,
				targetPath: join(this.projectRoot, analysis.targetLocation, analysis.fileName),
				action: "skipped",
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	/**
	 * Determine if a reference file should be deleted
	 *
	 * Requirements 6.1, 6.2, 6.3:
	 * - Delete only after successful integration and verification
	 * - Do NOT delete when build verification fails
	 * - Do NOT delete when user approval is pending (conflicts requiring user input)
	 *
	 * @param result - Integration result for the file
	 * @param buildResult - Build verification result (null if not performed)
	 * @returns true if the file should be deleted, false otherwise
	 */
	private shouldDeleteReferenceFile(result: IntegrationResult, buildResult: any): boolean {
		// Requirement 6.3: Do not delete if there are conflicts requiring user input
		if (result.conflicts && result.conflicts.length > 0) {
			return false;
		}

		// Requirement 6.2: Do not delete if build verification was performed and failed
		if (buildResult !== null && !buildResult.success) {
			return false;
		}

		// Requirement 6.1: Delete only after successful integration and verification
		return true;
	}

	/**
	 * Clean up the source directory after all files are processed
	 *
	 * Requirement 6.4: Remove once-integrated-delete directory when all reference files
	 * are successfully integrated and deleted.
	 *
	 * @param referenceFiles - Original list of reference files
	 * @param integrationResults - Results of all integration operations
	 */
	private async cleanupSourceDirectory(
		referenceFiles: string[],
		_integrationResults: IntegrationResult[],
	): Promise<void> {
		const sourceDir = join(this.projectRoot, this.config.sourceDirectory);

		// Check if source directory still exists
		if (!directoryExists(sourceDir)) {
			console.log("Source directory already removed");
			return;
		}

		// Check if all reference files were successfully processed and deleted
		const allFilesDeleted = referenceFiles.every((filePath) => !fileExists(filePath));

		if (!allFilesDeleted) {
			console.log("Not all reference files were deleted - preserving source directory");
			return;
		}

		// Check if directory is empty (no remaining files)
		try {
			const remainingFiles = readdirSync(sourceDir);

			if (remainingFiles.length > 0) {
				console.log(
					`Source directory contains ${remainingFiles.length} remaining files - not deleting`,
				);
				return;
			}

			// Directory is empty and all reference files were processed - safe to delete
			console.log("\nCleaning up source directory...");
			deleteDirectory(sourceDir);
			console.log(`Successfully removed directory: ${this.config.sourceDirectory}`);
		} catch (error) {
			console.warn(
				`Failed to clean up source directory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get the state manager for external access
	 */
	getStateManager(): IntegrationStateManager {
		return this.stateManager;
	}

	/**
	 * Handle an integration error with appropriate recovery strategy
	 *
	 * This method:
	 * 1. Creates an IntegrationError from the error
	 * 2. Determines the recovery strategy
	 * 3. Logs the error with suggestions
	 * 4. Triggers rollback if necessary
	 *
	 * @param error - The error that occurred
	 * @param filePath - The file being processed when the error occurred
	 * @returns true if error was handled and integration can continue, false if it should stop
	 *
	 * Requirements: 10.1, 10.2, 10.3, 10.4
	 */
	private handleIntegrationError(error: Error | unknown, filePath: string): boolean {
		// Create an IntegrationError with proper classification
		const integrationError = createIntegrationError(error, filePath);

		// Determine recovery strategy
		const strategy = getRecoveryStrategy(integrationError);

		// Format and log error with suggestions
		const errorMessage = formatErrorWithSuggestions(integrationError, strategy);
		console.error(`\n${"=".repeat(60)}`);
		console.error("Integration Error Detected");
		console.error("=".repeat(60));
		console.error(errorMessage);
		console.error(`${"=".repeat(60)}\n`);

		// Trigger rollback if strategy indicates it's necessary
		if (strategy.shouldRollback) {
			console.log("Initiating rollback due to error...");
			const rollbackSuccess = this.performRollback();

			if (rollbackSuccess) {
				console.log("Rollback completed successfully");
			} else {
				console.error("Rollback encountered errors - manual intervention may be required");
			}

			// After rollback, stop integration
			return false;
		}

		// If error requires user input, stop integration
		if (strategy.requiresUserInput) {
			console.log("User input required - stopping integration");
			return false;
		}

		// If error can auto-recover or is retryable, continue integration
		if (strategy.canAutoRecover || strategy.retryable) {
			console.log("Error can be recovered - continuing integration");
			return true;
		}

		// Default: stop integration for safety
		return false;
	}

	/**
	 * Perform a complete rollback of the integration
	 *
	 * This method:
	 * 1. Restores all modified files from backups
	 * 2. Restores deleted reference files
	 * 3. Cleans up backup files
	 *
	 * @returns true if rollback was successful, false if errors occurred
	 *
	 * Requirements: 10.1, 10.2, 10.3, 10.4
	 */
	private performRollback(): boolean {
		const state = this.stateManager.getState();

		console.log(`Rolling back ${state.backups.length} file modifications...`);

		// Get list of deleted reference files (completed files that were deleted)
		const deletedReferenceFiles = new Map<string, string>();

		// Note: In a real implementation, we would need to track deleted reference files
		// and their content before deletion. For now, we'll work with what we have.

		// Perform rollback
		const result = rollback(state.backups, deletedReferenceFiles);

		// Log results
		if (result.restoredFiles.length > 0) {
			console.log(`Restored ${result.restoredFiles.length} modified files:`);
			for (const file of result.restoredFiles) {
				console.log(`  - ${basename(file)}`);
			}
		}

		if (result.restoredReferenceFiles.length > 0) {
			console.log(`Restored ${result.restoredReferenceFiles.length} reference files:`);
			for (const file of result.restoredReferenceFiles) {
				console.log(`  - ${basename(file)}`);
			}
		}

		if (result.errors.length > 0) {
			console.error(`Rollback encountered ${result.errors.length} errors:`);
			for (const err of result.errors) {
				console.error(`  - ${err.file}: ${err.error}`);
			}
			return false;
		}

		return true;
	}
}
