// @ts-nocheck
/**
 * Integration State Manager
 *
 * Manages the state of the integration process, tracking progress across all files
 * and providing persistence for resume capability.
 *
 * Requirements: 9.1, 9.3
 */

import * as fs from "node:fs";
import type { BackupInfo, IntegrationState } from "./types";

export class IntegrationStateManager {
	private state: IntegrationState;
	private stateFilePath: string;

	constructor(totalFiles: number, stateFilePath: string = ".integration-state.json") {
		this.stateFilePath = stateFilePath;
		this.state = this.loadState() || this.createInitialState(totalFiles);
	}

	/**
	 * Create initial state for a new integration session
	 */
	private createInitialState(totalFiles: number): IntegrationState {
		return {
			totalFiles,
			processedFiles: 0,
			completedFiles: [],
			failedFiles: new Map<string, Error>(),
			skippedFiles: new Map<string, string>(),
			currentFile: null,
			backups: [],
			startTime: Date.now(),
		};
	}

	/**
	 * Load state from disk if it exists
	 * Requirement 9.3: Maintain record of completed integrations for resume
	 */
	private loadState(): IntegrationState | null {
		try {
			if (fs.existsSync(this.stateFilePath)) {
				const data = fs.readFileSync(this.stateFilePath, "utf-8");
				const parsed = JSON.parse(data);

				// Reconstruct Map objects from JSON
				return {
					...parsed,
					failedFiles: new Map(parsed.failedFiles || []),
					skippedFiles: new Map(parsed.skippedFiles || []),
				};
			}
		} catch (error) {
			console.warn("Failed to load integration state:", error);
		}
		return null;
	}

	/**
	 * Persist state to disk
	 * Requirement 9.3: Maintain record of completed integrations for resume
	 */
	private saveState(): void {
		try {
			// Convert Map objects to arrays for JSON serialization
			const serializable = {
				...this.state,
				failedFiles: Array.from(this.state.failedFiles.entries()).map(([key, error]) => [
					key,
					{ message: error.message, stack: error.stack },
				]),
				skippedFiles: Array.from(this.state.skippedFiles.entries()),
			};

			fs.writeFileSync(this.stateFilePath, JSON.stringify(serializable, null, 2), "utf-8");
		} catch (error) {
			console.error("Failed to save integration state:", error);
		}
	}

	/**
	 * Get the current state
	 */
	getState(): Readonly<IntegrationState> {
		return { ...this.state };
	}

	/**
	 * Check if a file has already been completed
	 * Requirement 9.4: Skip already-completed files when resuming
	 */
	isFileCompleted(filePath: string): boolean {
		return this.state.completedFiles.includes(filePath);
	}

	/**
	 * Set the current file being processed
	 * Requirement 9.2: Report status of each file
	 */
	setCurrentFile(filePath: string): void {
		this.state.currentFile = filePath;
		this.saveState();
	}

	/**
	 * Mark a file as completed
	 * Requirement 9.2: Report status of each file
	 */
	markFileCompleted(filePath: string): void {
		if (!this.state.completedFiles.includes(filePath)) {
			this.state.completedFiles.push(filePath);
			this.state.processedFiles++;
		}
		this.state.currentFile = null;
		this.saveState();
	}

	/**
	 * Mark a file as failed
	 * Requirement 9.2: Report status of each file
	 */
	markFileFailed(filePath: string, error: Error): void {
		this.state.failedFiles.set(filePath, error);
		this.state.processedFiles++;
		this.state.currentFile = null;
		this.saveState();
	}

	/**
	 * Mark a file as skipped
	 * Requirement 9.2: Report status of each file
	 */
	markFileSkipped(filePath: string, reason: string): void {
		this.state.skippedFiles.set(filePath, reason);
		this.state.processedFiles++;
		this.state.currentFile = null;
		this.saveState();
	}

	/**
	 * Add a backup to the state
	 * Requirement 10.1: Track backups for rollback capability
	 */
	addBackup(backup: BackupInfo): void {
		this.state.backups.push(backup);
		this.saveState();
	}

	/**
	 * Get all backups
	 */
	getBackups(): BackupInfo[] {
		return [...this.state.backups];
	}

	/**
	 * Clear all backups from state
	 */
	clearBackups(): void {
		this.state.backups = [];
		this.saveState();
	}

	/**
	 * Mark integration as complete
	 */
	markComplete(): void {
		this.state.endTime = Date.now();
		this.saveState();
	}

	/**
	 * Check if integration is complete
	 */
	isComplete(): boolean {
		return this.state.endTime !== undefined;
	}

	/**
	 * Get progress percentage
	 * Requirement 9.1: Report total number of files and progress
	 */
	getProgress(): number {
		if (this.state.totalFiles === 0) {
			return 100;
		}
		return Math.round((this.state.processedFiles / this.state.totalFiles) * 100);
	}

	/**
	 * Get a summary of the current state
	 * Requirement 9.1: Report total number of files and progress
	 */
	getSummary(): string {
		const { totalFiles, processedFiles, completedFiles, failedFiles, skippedFiles } = this.state;
		const progress = this.getProgress();

		return [
			`Integration Progress: ${progress}% (${processedFiles}/${totalFiles})`,
			`Completed: ${completedFiles.length}`,
			`Failed: ${failedFiles.size}`,
			`Skipped: ${skippedFiles.size}`,
		].join("\n");
	}

	/**
	 * Reset the state (for testing or starting fresh)
	 */
	reset(): void {
		const totalFiles = this.state.totalFiles;
		this.state = this.createInitialState(totalFiles);
		this.saveState();
	}

	/**
	 * Delete the state file from disk
	 */
	deleteStateFile(): void {
		try {
			if (fs.existsSync(this.stateFilePath)) {
				fs.unlinkSync(this.stateFilePath);
			}
		} catch (error) {
			console.error("Failed to delete state file:", error);
		}
	}
}
