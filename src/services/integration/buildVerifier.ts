// @ts-nocheck
/**
 * Build Verifier - Executes TypeScript compiler and analyzes build errors
 * Validates: Requirement 5.1
 */

import { execSync } from "node:child_process";
import type { BuildError, BuildResult, BuildWarning } from "./types";

/**
 * Verifies the TypeScript build by running tsc
 * Executes tsc to check for errors and parses the output
 *
 * @returns BuildResult containing success status, errors, and warnings
 */
export function verifyBuild(): BuildResult {
	try {
		// Run TypeScript compiler in noEmit mode (just check, don't generate files)
		// Use --pretty false to get parseable output
		execSync("npx tsc --noEmit --pretty false", {
			encoding: "utf-8",
			stdio: "pipe",
		});

		// If execSync doesn't throw, build succeeded
		return {
			success: true,
			errors: [],
			warnings: [],
		};
	} catch (error: any) {
		// tsc exits with non-zero code when there are errors
		const output = error.stdout || error.stderr || "";
		const { errors, warnings } = parseTscOutput(output);

		return {
			success: false,
			errors,
			warnings,
		};
	}
}

/**
 * Parses TypeScript compiler output to extract errors and warnings
 *
 * TSC output format:
 * path/to/file.ts(line,column): error TS####: message
 * path/to/file.ts(line,column): warning TS####: message
 *
 * @param output - Raw output from tsc command
 * @returns Object containing parsed errors and warnings
 */
export function parseTscOutput(output: string): {
	errors: BuildError[];
	warnings: BuildWarning[];
} {
	const errors: BuildError[] = [];
	const warnings: BuildWarning[] = [];

	// Split output into lines
	const lines = output.split("\n");

	for (const line of lines) {
		// Match error pattern: file.ts(line,col): error TS####: message
		const errorMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);

		if (errorMatch) {
			const [, file, lineStr, colStr, code, message] = errorMatch;
			errors.push({
				file: file.trim(),
				line: parseInt(lineStr, 10),
				column: parseInt(colStr, 10),
				message: message.trim(),
				code,
			});
			continue;
		}

		// Match warning pattern: file.ts(line,col): warning TS####: message
		const warningMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s+warning\s+(TS\d+):\s+(.+)$/);

		if (warningMatch) {
			const [, file, , , , message] = warningMatch;
			warnings.push({
				file: file.trim(),
				message: message.trim(),
			});
		}
	}

	return { errors, warnings };
}

/**
 * Categorizes build errors by type for better error handling
 *
 * @param errors - Array of build errors
 * @returns Map of error categories to errors
 */
export function categorizeErrors(errors: BuildError[]): Map<string, BuildError[]> {
	const categories = new Map<string, BuildError[]>();

	for (const error of errors) {
		const category = getErrorCategory(error.code || "");

		if (!categories.has(category)) {
			categories.set(category, []);
		}

		categories.get(category)?.push(error);
	}

	return categories;
}

/**
 * Determines the category of a TypeScript error based on its code
 *
 * @param code - TypeScript error code (e.g., "TS2304")
 * @returns Error category string
 */
function getErrorCategory(code: string): string {
	// Common TypeScript error code ranges
	// Module resolution errors (TS27xx and some TS23xx)
	if (code === "TS2307" || code === "TS2792" || code.startsWith("TS27")) {
		return "module_resolution";
	}
	// Import errors (TS1xxx and TS13xx)
	if (code.startsWith("TS13") || code.startsWith("TS11")) {
		return "import_error";
	}
	// Syntax errors (TS1xxx)
	if (code.startsWith("TS10") || code === "TS1005") {
		return "syntax_error";
	}
	// Property errors (TS2339 specifically)
	if (code === "TS2339" || code.startsWith("TS24")) {
		return "property_error";
	}
	// Type errors (TS23xx)
	if (code.startsWith("TS23")) {
		return "type_error";
	}
	// Generic errors (TS25xx)
	if (code.startsWith("TS25")) {
		return "generic_error";
	}
	// JSX errors (TS26xx)
	if (code.startsWith("TS26")) {
		return "jsx_error";
	}
	// Config errors (TS60xx)
	if (code.startsWith("TS60")) {
		return "config_error";
	}

	return "unknown";
}

/**
 * Diagnoses build errors and suggests fixes for known issues
 * Validates: Requirement 5.2
 *
 * @param errors - Array of build errors to diagnose
 * @returns DiagnosticResult with recovery info and suggested fixes
 */
export function diagnoseErrors(errors: BuildError[]): import("./types").DiagnosticResult {
	if (errors.length === 0) {
		return {
			canAutoRecover: true,
			suggestedFixes: [],
			errorSummary: "No errors found",
		};
	}

	const categories = categorizeErrors(errors);
	const suggestedFixes: string[] = [];
	let canAutoRecover = true; // Start with true, set to false if any category can't auto-recover

	// Analyze each category and provide specific suggestions
	for (const [category, categoryErrors] of categories.entries()) {
		switch (category) {
			case "module_resolution":
				suggestedFixes.push(...diagnoseModuleResolutionErrors(categoryErrors));
				// Can often auto-fix import paths
				break;

			case "import_error":
				suggestedFixes.push(...diagnoseImportErrors(categoryErrors));
				// Can often auto-fix import statements
				break;

			case "type_error":
				suggestedFixes.push(...diagnoseTypeErrors(categoryErrors));
				canAutoRecover = false; // Type errors usually need manual intervention
				break;

			case "property_error":
				suggestedFixes.push(...diagnosePropertyErrors(categoryErrors));
				canAutoRecover = false; // Property errors need manual fixes
				break;

			case "jsx_error":
				suggestedFixes.push(...diagnoseJsxErrors(categoryErrors));
				canAutoRecover = false; // JSX errors need manual fixes
				break;

			case "syntax_error":
				suggestedFixes.push(...diagnoseSyntaxErrors(categoryErrors));
				canAutoRecover = false; // Syntax errors need manual fixes
				break;

			default:
				suggestedFixes.push(
					`Found ${categoryErrors.length} ${category} error(s) - manual review required`,
				);
				canAutoRecover = false;
		}
	}

	// Create error summary
	const errorSummary = createErrorSummary(categories);

	return {
		canAutoRecover,
		suggestedFixes,
		errorSummary,
	};
}

/**
 * Diagnoses module resolution errors (TS27xx codes)
 */
function diagnoseModuleResolutionErrors(errors: BuildError[]): string[] {
	const fixes: string[] = [];

	for (const error of errors) {
		if (error.code === "TS2792" || error.code === "TS2307") {
			// Cannot find module
			const moduleMatch = error.message.match(/['"]([^'"]+)['"]/);
			if (moduleMatch) {
				const moduleName = moduleMatch[1];

				if (moduleName.startsWith(".")) {
					fixes.push(
						`Update relative import path "${moduleName}" in ${error.file}:${error.line} - file may have moved`,
					);
				} else if (moduleName.startsWith("@/")) {
					fixes.push(
						`Check path alias "${moduleName}" in ${error.file}:${error.line} - verify tsconfig paths`,
					);
				} else {
					fixes.push(
						`Install missing package "${moduleName}" or check if it exists in node_modules`,
					);
				}
			}
		}
	}

	return fixes;
}

/**
 * Diagnoses import errors (TS13xx codes)
 */
function diagnoseImportErrors(errors: BuildError[]): string[] {
	const fixes: string[] = [];

	for (const error of errors) {
		if (error.code === "TS1308") {
			fixes.push(`Fix import statement syntax in ${error.file}:${error.line}`);
		} else if (error.code === "TS1192") {
			fixes.push(
				`Module can only be default-imported in ${error.file}:${error.line} - use "import X from 'module'" instead`,
			);
		} else {
			fixes.push(`Fix import statement in ${error.file}:${error.line}: ${error.message}`);
		}
	}

	return fixes;
}

/**
 * Diagnoses type errors (TS23xx codes)
 */
function diagnoseTypeErrors(errors: BuildError[]): string[] {
	const fixes: string[] = [];

	for (const error of errors) {
		if (error.code === "TS2304") {
			// Cannot find name
			const nameMatch = error.message.match(/Cannot find name ['"]([^'"]+)['"]/);
			if (nameMatch) {
				const name = nameMatch[1];
				fixes.push(
					`Add import for "${name}" in ${error.file}:${error.line} or check if it's defined`,
				);
			}
		} else if (error.code === "TS2322") {
			// Type not assignable
			fixes.push(`Fix type mismatch in ${error.file}:${error.line} - ${error.message}`);
		} else if (error.code === "TS2345") {
			// Argument type error
			fixes.push(`Fix argument type in ${error.file}:${error.line} - ${error.message}`);
		} else {
			fixes.push(`Fix type error in ${error.file}:${error.line}: ${error.message}`);
		}
	}

	return fixes;
}

/**
 * Diagnoses property errors (TS24xx codes)
 */
function diagnosePropertyErrors(errors: BuildError[]): string[] {
	const fixes: string[] = [];

	for (const error of errors) {
		if (error.code === "TS2339") {
			// Property does not exist
			const propMatch = error.message.match(/Property ['"]([^'"]+)['"]/);
			if (propMatch) {
				const prop = propMatch[1];
				fixes.push(
					`Add property "${prop}" to type or check spelling in ${error.file}:${error.line}`,
				);
			}
		} else {
			fixes.push(`Fix property error in ${error.file}:${error.line}: ${error.message}`);
		}
	}

	return fixes;
}

/**
 * Diagnoses JSX errors (TS26xx codes)
 */
function diagnoseJsxErrors(errors: BuildError[]): string[] {
	const fixes: string[] = [];

	for (const error of errors) {
		if (error.code === "TS2607") {
			fixes.push(
				`JSX element implicitly has type 'any' in ${error.file}:${error.line} - add proper types`,
			);
		} else if (error.code === "TS2786") {
			fixes.push(
				`JSX element type does not have construct signatures in ${error.file}:${error.line}`,
			);
		} else {
			fixes.push(`Fix JSX error in ${error.file}:${error.line}: ${error.message}`);
		}
	}

	return fixes;
}

/**
 * Diagnoses syntax errors (TS18xx codes)
 */
function diagnoseSyntaxErrors(errors: BuildError[]): string[] {
	const fixes: string[] = [];

	for (const error of errors) {
		fixes.push(`Fix syntax error in ${error.file}:${error.line}: ${error.message}`);
	}

	return fixes;
}

/**
 * Creates a summary of errors by category
 */
function createErrorSummary(categories: Map<string, BuildError[]>): string {
	const parts: string[] = [];

	for (const [category, errors] of categories.entries()) {
		const count = errors.length;
		const label = category.replace("_", " ");
		parts.push(`${count} ${label} error${count !== 1 ? "s" : ""}`);
	}

	return `Found ${parts.join(", ")}`;
}
