// @ts-nocheck
/**
 * File Type Classifier
 *
 * Determines the type of a TypeScript/JavaScript file based on:
 * - File naming conventions (e.g., files starting with "use" are hooks)
 * - File content (JSX presence, exports)
 * - File extension (.tsx, .ts, .jsx, .js)
 *
 * Validates: Requirements 1.1
 */

import { basename, extname } from "node:path";
import { parseFile } from "./astParser";
import { type Export, FileType } from "./types";

/**
 * Classify a file based on its path, content, and exports
 *
 * Classification rules:
 * 1. Files starting with "use" and exporting functions are HOOK
 * 2. TSX/JSX files with JSX content and component exports are COMPONENT
 * 3. Files with only type/interface exports are TYPE
 * 4. Files in service-related patterns are SERVICE
 * 5. Files with utility functions are UTILITY
 * 6. Everything else is UNKNOWN
 *
 * @param filePath - Path to the file to classify
 * @returns The determined file type
 */
export function classifyFile(filePath: string): FileType {
	const fileName = basename(filePath);
	const fileExt = extname(filePath);

	// Parse the file to get exports and JSX information
	const parsed = parseFile(filePath);

	// Rule 1: Custom hooks - files starting with "use" that export functions
	if (isCustomHook(fileName, parsed.exports)) {
		return FileType.HOOK;
	}

	// Rule 2: React components - TSX/JSX files with JSX content and component-like exports
	if (isReactComponent(fileExt, parsed.hasJSX, parsed.exports)) {
		return FileType.COMPONENT;
	}

	// Rule 3: Type definitions - files with only type/interface exports
	if (isTypeDefinition(parsed.exports)) {
		return FileType.TYPE;
	}

	// Rule 4: Services - files with service-related naming or patterns
	if (isService(fileName, parsed.exports)) {
		return FileType.SERVICE;
	}

	// Rule 5: Utilities - files with utility functions
	if (isUtility(parsed.exports)) {
		return FileType.UTILITY;
	}

	// Default: Unknown
	return FileType.UNKNOWN;
}

/**
 * Check if a file is a custom hook
 *
 * Custom hooks:
 * - Start with "use" (case-sensitive)
 * - Export at least one function
 *
 * @param fileName - Name of the file
 * @param exports - Exports from the file
 * @returns True if the file is a custom hook
 */
function isCustomHook(fileName: string, exports: Export[]): boolean {
	// Remove extension and check if it starts with "use"
	const nameWithoutExt = fileName.replace(/\.(tsx?|jsx?)$/, "");

	if (!nameWithoutExt.startsWith("use")) {
		return false;
	}

	// Must export at least one function
	const hasFunctionExport = exports.some((exp) => exp.type === "function" || exp.type === "const");

	return hasFunctionExport;
}

/**
 * Check if a file is a React component
 *
 * React components:
 * - Have .tsx or .jsx extension
 * - Contain JSX elements
 * - Export at least one function or class (the component)
 *
 * @param fileExt - File extension
 * @param hasJSX - Whether the file contains JSX
 * @param exports - Exports from the file
 * @returns True if the file is a React component
 */
function isReactComponent(fileExt: string, hasJSX: boolean, exports: Export[]): boolean {
	// Must be a TSX or JSX file
	if (fileExt !== ".tsx" && fileExt !== ".jsx") {
		return false;
	}

	// Must contain JSX
	if (!hasJSX) {
		return false;
	}

	// Must export at least one function or class (the component)
	const hasComponentExport = exports.some(
		(exp) => exp.type === "function" || exp.type === "class" || exp.type === "const",
	);

	return hasComponentExport;
}

/**
 * Check if a file is a type definition file
 *
 * Type definition files:
 * - Export ONLY types and interfaces
 * - Have at least one export
 *
 * @param exports - Exports from the file
 * @returns True if the file contains only type definitions
 */
function isTypeDefinition(exports: Export[]): boolean {
	if (exports.length === 0) {
		return false;
	}

	// All exports must be types or interfaces
	return exports.every((exp) => exp.type === "type" || exp.type === "interface");
}

/**
 * Check if a file is a service
 *
 * Services:
 * - Have "service" or "api" in the filename
 * - Export classes or functions that represent services
 *
 * @param fileName - Name of the file
 * @param exports - Exports from the file
 * @returns True if the file is a service
 */
function isService(fileName: string, exports: Export[]): boolean {
	const lowerFileName = fileName.toLowerCase();

	// Check for service-related naming
	const hasServiceNaming =
		lowerFileName.includes("service") ||
		lowerFileName.includes("api") ||
		lowerFileName.includes("client");

	if (!hasServiceNaming) {
		return false;
	}

	// Must have at least one export
	return exports.length > 0;
}

/**
 * Check if a file is a utility
 *
 * Utilities:
 * - Export functions or constants
 * - Not a hook, component, service, or type definition
 *
 * @param exports - Exports from the file
 * @returns True if the file is a utility
 */
function isUtility(exports: Export[]): boolean {
	if (exports.length === 0) {
		return false;
	}

	// Must have at least one function or const export
	const hasUtilityExport = exports.some(
		(exp) => exp.type === "function" || exp.type === "const" || exp.type === "class",
	);

	return hasUtilityExport;
}
