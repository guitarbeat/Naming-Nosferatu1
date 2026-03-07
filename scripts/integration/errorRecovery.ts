// @ts-nocheck
/**
 * Error Recovery Module
 *
 * Handles error classification and determines appropriate recovery strategies
 * for different types of integration errors.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { type ErrorRecoveryStrategy, IntegrationError } from "./types";

/**
 * Error codes for different error categories
 */
export enum ErrorCode {
	// File System Errors
	FILE_NOT_FOUND = "FILE_NOT_FOUND",
	PERMISSION_DENIED = "PERMISSION_DENIED",
	DISK_FULL = "DISK_FULL",
	FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",

	// Parse Errors
	INVALID_SYNTAX = "INVALID_SYNTAX",
	MALFORMED_IMPORTS = "MALFORMED_IMPORTS",
	PARSE_ERROR = "PARSE_ERROR",

	// Build Errors
	TYPE_ERROR = "TYPE_ERROR",
	MISSING_DEPENDENCY = "MISSING_DEPENDENCY",
	IMPORT_RESOLUTION_FAILURE = "IMPORT_RESOLUTION_FAILURE",
	BUILD_ERROR = "BUILD_ERROR",

	// Merge Conflicts
	DUPLICATE_EXPORT = "DUPLICATE_EXPORT",
	INCOMPATIBLE_TYPES = "INCOMPATIBLE_TYPES",
	MERGE_CONFLICT = "MERGE_CONFLICT",

	// Dependency Errors
	CIRCULAR_DEPENDENCY = "CIRCULAR_DEPENDENCY",
	MISSING_INTERNAL_MODULE = "MISSING_INTERNAL_MODULE",
	MISSING_EXTERNAL_PACKAGE = "MISSING_EXTERNAL_PACKAGE",
	DEPENDENCY_ERROR = "DEPENDENCY_ERROR",

	// Unknown
	UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Determines the appropriate recovery strategy for an integration error
 *
 * @param error - The integration error to analyze
 * @returns ErrorRecoveryStrategy indicating how to handle the error
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export function getRecoveryStrategy(error: IntegrationError): ErrorRecoveryStrategy {
	const errorCode = error.code;

	// File System Errors - Retry with exponential backoff
	if (isFileSystemError(errorCode)) {
		return {
			canAutoRecover: true,
			requiresUserInput: false,
			shouldRollback: false,
			retryable: true,
		};
	}

	// Parse Errors - Skip file, report to user
	if (isParseError(errorCode)) {
		return {
			canAutoRecover: false,
			requiresUserInput: true,
			shouldRollback: false,
			retryable: false,
		};
	}

	// Build Errors - Attempt auto-fix, otherwise rollback
	if (isBuildError(errorCode)) {
		return {
			canAutoRecover: true,
			requiresUserInput: false,
			shouldRollback: true, // Rollback if auto-fix fails
			retryable: false,
		};
	}

	// Merge Conflicts - Request user guidance
	if (isMergeConflict(errorCode)) {
		return {
			canAutoRecover: false,
			requiresUserInput: true,
			shouldRollback: false,
			retryable: false,
		};
	}

	// Dependency Errors - Report with suggestions
	if (isDependencyError(errorCode)) {
		return {
			canAutoRecover: false,
			requiresUserInput: true,
			shouldRollback: false,
			retryable: false,
		};
	}

	// Unknown errors - Safe default: don't auto-recover, allow rollback
	return {
		canAutoRecover: false,
		requiresUserInput: true,
		shouldRollback: true,
		retryable: false,
	};
}

/**
 * Checks if an error code represents a file system error
 */
function isFileSystemError(code: string): boolean {
	return [
		ErrorCode.FILE_NOT_FOUND,
		ErrorCode.PERMISSION_DENIED,
		ErrorCode.DISK_FULL,
		ErrorCode.FILE_SYSTEM_ERROR,
	].includes(code as ErrorCode);
}

/**
 * Checks if an error code represents a parse error
 */
function isParseError(code: string): boolean {
	return [ErrorCode.INVALID_SYNTAX, ErrorCode.MALFORMED_IMPORTS, ErrorCode.PARSE_ERROR].includes(
		code as ErrorCode,
	);
}

/**
 * Checks if an error code represents a build error
 */
function isBuildError(code: string): boolean {
	return [
		ErrorCode.TYPE_ERROR,
		ErrorCode.MISSING_DEPENDENCY,
		ErrorCode.IMPORT_RESOLUTION_FAILURE,
		ErrorCode.BUILD_ERROR,
	].includes(code as ErrorCode);
}

/**
 * Checks if an error code represents a merge conflict
 */
function isMergeConflict(code: string): boolean {
	return [
		ErrorCode.DUPLICATE_EXPORT,
		ErrorCode.INCOMPATIBLE_TYPES,
		ErrorCode.MERGE_CONFLICT,
	].includes(code as ErrorCode);
}

/**
 * Checks if an error code represents a dependency error
 */
function isDependencyError(code: string): boolean {
	return [
		ErrorCode.CIRCULAR_DEPENDENCY,
		ErrorCode.MISSING_INTERNAL_MODULE,
		ErrorCode.MISSING_EXTERNAL_PACKAGE,
		ErrorCode.DEPENDENCY_ERROR,
	].includes(code as ErrorCode);
}

/**
 * Creates an IntegrationError from a generic error
 *
 * @param error - The original error
 * @param filePath - Optional file path where the error occurred
 * @returns IntegrationError with appropriate error code
 */
export function createIntegrationError(
	error: Error | unknown,
	filePath?: string,
): IntegrationError {
	if (error instanceof IntegrationError) {
		return error;
	}

	const message = error instanceof Error ? error.message : String(error);
	const code = classifyError(message);

	return new IntegrationError(message, code, filePath, error instanceof Error ? error : undefined);
}

/**
 * Classifies an error message to determine its error code
 *
 * @param message - The error message to classify
 * @returns The appropriate error code
 */
function classifyError(message: string): string {
	const lowerMessage = message.toLowerCase();

	// File System Errors
	if (lowerMessage.includes("enoent") || lowerMessage.includes("not found")) {
		return ErrorCode.FILE_NOT_FOUND;
	}
	if (lowerMessage.includes("eacces") || lowerMessage.includes("permission denied")) {
		return ErrorCode.PERMISSION_DENIED;
	}
	if (lowerMessage.includes("enospc") || lowerMessage.includes("disk full")) {
		return ErrorCode.DISK_FULL;
	}

	// Parse Errors
	if (lowerMessage.includes("syntax error") || lowerMessage.includes("unexpected token")) {
		return ErrorCode.INVALID_SYNTAX;
	}
	if (lowerMessage.includes("malformed import")) {
		return ErrorCode.MALFORMED_IMPORTS;
	}

	// Build Errors
	if (lowerMessage.includes("type error") || lowerMessage.includes("cannot find name")) {
		return ErrorCode.TYPE_ERROR;
	}
	if (lowerMessage.includes("cannot find module") || lowerMessage.includes("module not found")) {
		return ErrorCode.MISSING_DEPENDENCY;
	}
	if (lowerMessage.includes("import") && lowerMessage.includes("resolution")) {
		return ErrorCode.IMPORT_RESOLUTION_FAILURE;
	}
	if (lowerMessage.includes("build") && lowerMessage.includes("fail")) {
		return ErrorCode.BUILD_ERROR;
	}

	// Merge Conflicts
	if (lowerMessage.includes("duplicate export")) {
		return ErrorCode.DUPLICATE_EXPORT;
	}
	if (lowerMessage.includes("incompatible type")) {
		return ErrorCode.INCOMPATIBLE_TYPES;
	}
	if (lowerMessage.includes("conflict")) {
		return ErrorCode.MERGE_CONFLICT;
	}

	// Dependency Errors
	if (lowerMessage.includes("circular dependency")) {
		return ErrorCode.CIRCULAR_DEPENDENCY;
	}
	if (lowerMessage.includes("missing") && lowerMessage.includes("module")) {
		return ErrorCode.MISSING_INTERNAL_MODULE;
	}
	if (lowerMessage.includes("missing") && lowerMessage.includes("package")) {
		return ErrorCode.MISSING_EXTERNAL_PACKAGE;
	}

	return ErrorCode.UNKNOWN_ERROR;
}

/**
 * Formats an error message with recovery suggestions
 *
 * @param error - The integration error
 * @param strategy - The recovery strategy
 * @returns Formatted error message with suggestions
 */
export function formatErrorWithSuggestions(
	error: IntegrationError,
	strategy: ErrorRecoveryStrategy,
): string {
	let message = `Error: ${error.message}`;

	if (error.filePath) {
		message += `\nFile: ${error.filePath}`;
	}

	message += `\nError Code: ${error.code}`;

	// Add recovery suggestions based on strategy
	if (strategy.canAutoRecover) {
		message += "\n\nRecovery: Attempting automatic recovery...";
	}

	if (strategy.requiresUserInput) {
		message += "\n\nAction Required: This error requires user input to resolve.";
	}

	if (strategy.shouldRollback) {
		message += "\n\nRollback: Changes will be rolled back if recovery fails.";
	}

	if (strategy.retryable) {
		message += "\n\nRetry: This operation can be retried.";
	}

	message += getSuggestionsForErrorCode(error.code);

	return message;
}

/**
 * Gets specific suggestions for an error code
 *
 * @param code - The error code
 * @returns Suggestion text
 */
function getSuggestionsForErrorCode(code: string): string {
	switch (code) {
		case ErrorCode.FILE_NOT_FOUND:
			return "\nSuggestion: Verify the file path and ensure the file exists.";

		case ErrorCode.PERMISSION_DENIED:
			return "\nSuggestion: Check file permissions and ensure you have write access.";

		case ErrorCode.DISK_FULL:
			return "\nSuggestion: Free up disk space and retry the operation.";

		case ErrorCode.INVALID_SYNTAX:
			return "\nSuggestion: Fix syntax errors in the file before integration.";

		case ErrorCode.MALFORMED_IMPORTS:
			return "\nSuggestion: Correct import statements to use valid syntax.";

		case ErrorCode.TYPE_ERROR:
			return "\nSuggestion: Review type definitions and ensure compatibility.";

		case ErrorCode.MISSING_DEPENDENCY:
			return "\nSuggestion: Install missing dependencies or create required modules.";

		case ErrorCode.DUPLICATE_EXPORT:
			return "\nSuggestion: Resolve duplicate exports by renaming or removing one.";

		case ErrorCode.INCOMPATIBLE_TYPES:
			return "\nSuggestion: Update type definitions to be compatible.";

		case ErrorCode.CIRCULAR_DEPENDENCY:
			return "\nSuggestion: Refactor code to break circular dependencies.";

		case ErrorCode.MISSING_INTERNAL_MODULE:
			return "\nSuggestion: Create the missing module or adjust import paths.";

		case ErrorCode.MISSING_EXTERNAL_PACKAGE:
			return "\nSuggestion: Install the missing package using npm or yarn.";

		default:
			return "\nSuggestion: Review the error details and consult documentation.";
	}
}
