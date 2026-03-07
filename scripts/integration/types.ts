/**
 * Core types for the Reference File Integration System
 */

// ============================================================================
// File Analysis Types
// ============================================================================

export enum FileType {
	COMPONENT = "component",
	HOOK = "hook",
	SERVICE = "service",
	UTILITY = "utility",
	TYPE = "type",
	UNKNOWN = "unknown",
}

export interface Dependency {
	importPath: string;
	isExternal: boolean;
	isResolved: boolean;
	sourceFile?: string; // If from another reference file
}

export interface Export {
	name: string;
	type: "function" | "class" | "const" | "type" | "interface";
	isDefault: boolean;
}

export interface FileAnalysis {
	filePath: string;
	fileName: string;
	fileType: FileType;
	targetLocation: string;
	dependencies: Dependency[];
	exports: Export[];
	hasExistingFile: boolean;
}

// ============================================================================
// Dependency Graph Types
// ============================================================================

export enum IntegrationStatus {
	PENDING = "pending",
	IN_PROGRESS = "in_progress",
	COMPLETED = "completed",
	FAILED = "failed",
	SKIPPED = "skipped",
}

export interface FileNode {
	filePath: string;
	analysis: FileAnalysis;
	status: IntegrationStatus;
}

export interface DependencyGraph {
	nodes: Map<string, FileNode>;
	edges: Map<string, string[]>; // source -> [dependencies]
}

export interface CircularDependency {
	cycle: string[]; // Array of file paths forming the cycle
	description: string; // Human-readable description of the cycle
}

// ============================================================================
// Integration Engine Types
// ============================================================================

export interface Conflict {
	type: "duplicate_export" | "incompatible_types" | "naming_collision";
	description: string;
	referenceCode: string;
	existingCode: string;
}

export interface IntegrationResult {
	success: boolean;
	filePath: string;
	targetPath: string;
	action: "created" | "merged" | "skipped";
	conflicts?: Conflict[];
	error?: Error;
	actionsLog?: string[]; // Log of actions taken during integration (Requirement 9.2)
}

export interface MergeStrategy {
	preserveExisting: boolean;
	addNewExports: boolean;
	updateImports: boolean;
	requestUserInput: boolean;
}

// ============================================================================
// Build Verification Types
// ============================================================================

export interface BuildError {
	file: string;
	line: number;
	column: number;
	message: string;
	code?: string;
}

export interface BuildWarning {
	file: string;
	message: string;
}

export interface BuildResult {
	success: boolean;
	errors: BuildError[];
	warnings: BuildWarning[];
}

// ============================================================================
// File Manager Types
// ============================================================================

export interface BackupInfo {
	originalPath: string;
	backupPath: string;
	timestamp: number;
}

// ============================================================================
// Integration State Types
// ============================================================================

export interface IntegrationState {
	totalFiles: number;
	processedFiles: number;
	completedFiles: string[];
	failedFiles: Map<string, Error>;
	skippedFiles: Map<string, string>; // file -> reason
	currentFile: string | null;
	backups: BackupInfo[];
	startTime: number;
	endTime?: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface IntegrationConfig {
	sourceDirectory: string; // "once-integrated-delete"
	targetDirectory: string; // "src"
	mergeStrategy: MergeStrategy;
	verifyAfterEach: boolean;
	deleteAfterSuccess: boolean;
	createBackups: boolean;
	stopOnError: boolean;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface ErrorRecoveryStrategy {
	canAutoRecover: boolean;
	requiresUserInput: boolean;
	shouldRollback: boolean;
	retryable: boolean;
}

/**
 * Custom error class for integration-related failures.
 */
export class IntegrationError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly filePath?: string,
		public readonly integrationCause?: Error,
	) {
		super(message);
		this.name = "IntegrationError";
	}
}
