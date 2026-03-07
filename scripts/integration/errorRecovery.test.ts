// @ts-nocheck
/**
 * Tests for Error Recovery Module
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { describe, expect, it } from "vitest";
import {
	createIntegrationError,
	ErrorCode,
	formatErrorWithSuggestions,
	getRecoveryStrategy,
} from "./errorRecovery";
import { IntegrationError } from "./types";

describe("Error Recovery Module", () => {
	describe("getRecoveryStrategy", () => {
		it("should return retryable strategy for file system errors", () => {
			const error = new IntegrationError(
				"File not found",
				ErrorCode.FILE_NOT_FOUND,
				"/path/to/file.ts",
			);

			const strategy = getRecoveryStrategy(error);

			expect(strategy.canAutoRecover).toBe(true);
			expect(strategy.requiresUserInput).toBe(false);
			expect(strategy.shouldRollback).toBe(false);
			expect(strategy.retryable).toBe(true);
		});

		it("should return non-retryable strategy for parse errors", () => {
			const error = new IntegrationError(
				"Invalid syntax",
				ErrorCode.INVALID_SYNTAX,
				"/path/to/file.ts",
			);

			const strategy = getRecoveryStrategy(error);

			expect(strategy.canAutoRecover).toBe(false);
			expect(strategy.requiresUserInput).toBe(true);
			expect(strategy.shouldRollback).toBe(false);
			expect(strategy.retryable).toBe(false);
		});

		it("should return rollback strategy for build errors", () => {
			const error = new IntegrationError("Type error", ErrorCode.TYPE_ERROR, "/path/to/file.ts");

			const strategy = getRecoveryStrategy(error);

			expect(strategy.canAutoRecover).toBe(true);
			expect(strategy.requiresUserInput).toBe(false);
			expect(strategy.shouldRollback).toBe(true);
			expect(strategy.retryable).toBe(false);
		});

		it("should require user input for merge conflicts", () => {
			const error = new IntegrationError(
				"Duplicate export",
				ErrorCode.DUPLICATE_EXPORT,
				"/path/to/file.ts",
			);

			const strategy = getRecoveryStrategy(error);

			expect(strategy.canAutoRecover).toBe(false);
			expect(strategy.requiresUserInput).toBe(true);
			expect(strategy.shouldRollback).toBe(false);
			expect(strategy.retryable).toBe(false);
		});

		it("should require user input for dependency errors", () => {
			const error = new IntegrationError(
				"Circular dependency detected",
				ErrorCode.CIRCULAR_DEPENDENCY,
				"/path/to/file.ts",
			);

			const strategy = getRecoveryStrategy(error);

			expect(strategy.canAutoRecover).toBe(false);
			expect(strategy.requiresUserInput).toBe(true);
			expect(strategy.shouldRollback).toBe(false);
			expect(strategy.retryable).toBe(false);
		});

		it("should return safe default for unknown errors", () => {
			const error = new IntegrationError(
				"Unknown error",
				ErrorCode.UNKNOWN_ERROR,
				"/path/to/file.ts",
			);

			const strategy = getRecoveryStrategy(error);

			expect(strategy.canAutoRecover).toBe(false);
			expect(strategy.requiresUserInput).toBe(true);
			expect(strategy.shouldRollback).toBe(true);
			expect(strategy.retryable).toBe(false);
		});
	});

	describe("createIntegrationError", () => {
		it("should return IntegrationError as-is", () => {
			const originalError = new IntegrationError(
				"Test error",
				ErrorCode.FILE_NOT_FOUND,
				"/path/to/file.ts",
			);

			const result = createIntegrationError(originalError);

			expect(result).toBe(originalError);
		});

		it("should classify file not found errors", () => {
			const error = new Error("ENOENT: no such file or directory");

			const result = createIntegrationError(error, "/path/to/file.ts");

			expect(result).toBeInstanceOf(IntegrationError);
			expect(result.code).toBe(ErrorCode.FILE_NOT_FOUND);
			expect(result.filePath).toBe("/path/to/file.ts");
		});

		it("should classify permission denied errors", () => {
			const error = new Error("EACCES: permission denied");

			const result = createIntegrationError(error);

			expect(result.code).toBe(ErrorCode.PERMISSION_DENIED);
		});

		it("should classify syntax errors", () => {
			const error = new Error("Syntax error: unexpected token");

			const result = createIntegrationError(error);

			expect(result.code).toBe(ErrorCode.INVALID_SYNTAX);
		});

		it("should classify type errors", () => {
			const error = new Error("Type error: cannot find name");

			const result = createIntegrationError(error);

			expect(result.code).toBe(ErrorCode.TYPE_ERROR);
		});

		it("should classify missing dependency errors", () => {
			const error = new Error('Cannot find module "./missing"');

			const result = createIntegrationError(error);

			expect(result.code).toBe(ErrorCode.MISSING_DEPENDENCY);
		});

		it("should classify duplicate export errors", () => {
			const error = new Error("Duplicate export detected");

			const result = createIntegrationError(error);

			expect(result.code).toBe(ErrorCode.DUPLICATE_EXPORT);
		});

		it("should classify circular dependency errors", () => {
			const error = new Error("Circular dependency detected");

			const result = createIntegrationError(error);

			expect(result.code).toBe(ErrorCode.CIRCULAR_DEPENDENCY);
		});

		it("should default to UNKNOWN_ERROR for unclassified errors", () => {
			const error = new Error("Some random error");

			const result = createIntegrationError(error);

			expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
		});

		it("should handle non-Error objects", () => {
			const error = "String error message";

			const result = createIntegrationError(error);

			expect(result).toBeInstanceOf(IntegrationError);
			expect(result.message).toBe("String error message");
		});
	});

	describe("formatErrorWithSuggestions", () => {
		it("should format error with file path", () => {
			const error = new IntegrationError(
				"Test error",
				ErrorCode.FILE_NOT_FOUND,
				"/path/to/file.ts",
			);
			const strategy = getRecoveryStrategy(error);

			const formatted = formatErrorWithSuggestions(error, strategy);

			expect(formatted).toContain("Error: Test error");
			expect(formatted).toContain("File: /path/to/file.ts");
			expect(formatted).toContain("Error Code: FILE_NOT_FOUND");
		});

		it("should include auto-recovery message", () => {
			const error = new IntegrationError("Test error", ErrorCode.FILE_NOT_FOUND);
			const strategy = getRecoveryStrategy(error);

			const formatted = formatErrorWithSuggestions(error, strategy);

			expect(formatted).toContain("Attempting automatic recovery");
		});

		it("should include user input required message", () => {
			const error = new IntegrationError("Test error", ErrorCode.DUPLICATE_EXPORT);
			const strategy = getRecoveryStrategy(error);

			const formatted = formatErrorWithSuggestions(error, strategy);

			expect(formatted).toContain("Action Required");
			expect(formatted).toContain("user input");
		});

		it("should include rollback message", () => {
			const error = new IntegrationError("Test error", ErrorCode.BUILD_ERROR);
			const strategy = getRecoveryStrategy(error);

			const formatted = formatErrorWithSuggestions(error, strategy);

			expect(formatted).toContain("Rollback");
			expect(formatted).toContain("rolled back");
		});

		it("should include retry message", () => {
			const error = new IntegrationError("Test error", ErrorCode.FILE_NOT_FOUND);
			const strategy = getRecoveryStrategy(error);

			const formatted = formatErrorWithSuggestions(error, strategy);

			expect(formatted).toContain("Retry");
		});

		it("should include specific suggestions for each error code", () => {
			const testCases = [
				{ code: ErrorCode.FILE_NOT_FOUND, suggestion: "Verify the file path" },
				{
					code: ErrorCode.PERMISSION_DENIED,
					suggestion: "Check file permissions",
				},
				{ code: ErrorCode.DISK_FULL, suggestion: "Free up disk space" },
				{ code: ErrorCode.INVALID_SYNTAX, suggestion: "Fix syntax errors" },
				{
					code: ErrorCode.DUPLICATE_EXPORT,
					suggestion: "Resolve duplicate exports",
				},
				{
					code: ErrorCode.CIRCULAR_DEPENDENCY,
					suggestion: "Refactor code to break circular",
				},
			];

			for (const { code, suggestion } of testCases) {
				const error = new IntegrationError("Test error", code);
				const strategy = getRecoveryStrategy(error);
				const formatted = formatErrorWithSuggestions(error, strategy);

				expect(formatted).toContain(suggestion);
			}
		});
	});

	describe("Error Classification", () => {
		it("should correctly classify all file system error codes", () => {
			const fileSystemCodes = [
				ErrorCode.FILE_NOT_FOUND,
				ErrorCode.PERMISSION_DENIED,
				ErrorCode.DISK_FULL,
				ErrorCode.FILE_SYSTEM_ERROR,
			];

			for (const code of fileSystemCodes) {
				const error = new IntegrationError("Test", code);
				const strategy = getRecoveryStrategy(error);

				expect(strategy.retryable).toBe(true);
				expect(strategy.canAutoRecover).toBe(true);
			}
		});

		it("should correctly classify all parse error codes", () => {
			const parseCodes = [
				ErrorCode.INVALID_SYNTAX,
				ErrorCode.MALFORMED_IMPORTS,
				ErrorCode.PARSE_ERROR,
			];

			for (const code of parseCodes) {
				const error = new IntegrationError("Test", code);
				const strategy = getRecoveryStrategy(error);

				expect(strategy.requiresUserInput).toBe(true);
				expect(strategy.retryable).toBe(false);
			}
		});

		it("should correctly classify all build error codes", () => {
			const buildCodes = [
				ErrorCode.TYPE_ERROR,
				ErrorCode.MISSING_DEPENDENCY,
				ErrorCode.IMPORT_RESOLUTION_FAILURE,
				ErrorCode.BUILD_ERROR,
			];

			for (const code of buildCodes) {
				const error = new IntegrationError("Test", code);
				const strategy = getRecoveryStrategy(error);

				expect(strategy.shouldRollback).toBe(true);
				expect(strategy.canAutoRecover).toBe(true);
			}
		});

		it("should correctly classify all merge conflict codes", () => {
			const mergeCodes = [
				ErrorCode.DUPLICATE_EXPORT,
				ErrorCode.INCOMPATIBLE_TYPES,
				ErrorCode.MERGE_CONFLICT,
			];

			for (const code of mergeCodes) {
				const error = new IntegrationError("Test", code);
				const strategy = getRecoveryStrategy(error);

				expect(strategy.requiresUserInput).toBe(true);
				expect(strategy.shouldRollback).toBe(false);
			}
		});

		it("should correctly classify all dependency error codes", () => {
			const dependencyCodes = [
				ErrorCode.CIRCULAR_DEPENDENCY,
				ErrorCode.MISSING_INTERNAL_MODULE,
				ErrorCode.MISSING_EXTERNAL_PACKAGE,
				ErrorCode.DEPENDENCY_ERROR,
			];

			for (const code of dependencyCodes) {
				const error = new IntegrationError("Test", code);
				const strategy = getRecoveryStrategy(error);

				expect(strategy.requiresUserInput).toBe(true);
				expect(strategy.shouldRollback).toBe(false);
			}
		});
	});
});
