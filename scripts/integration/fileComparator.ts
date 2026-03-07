// @ts-nocheck
/**
 * File Comparator - Compares reference and existing files to identify differences and conflicts
 *
 * Requirements: 3.1
 */

import * as ts from "typescript";
import type { Conflict, Export } from "./types";

/**
 * Represents a comparison between a reference file and an existing file
 */
export interface FileComparison {
	hasConflicts: boolean;
	conflicts: Conflict[];
	newExports: Export[]; // Exports in reference that don't exist in existing
	commonExports: Export[]; // Exports that exist in both files
	existingOnlyExports: Export[]; // Exports only in existing file
	referenceContent: string;
	existingContent: string;
}

/**
 * Parse file content to extract exports using TypeScript Compiler API
 */
function parseFileContent(filePath: string, content: string): Export[] {
	const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

	const exports: Export[] = [];

	function visit(node: ts.Node) {
		const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
		const hasDefaultModifier = modifiers?.some(
			(m: ts.Modifier) => m.kind === ts.SyntaxKind.DefaultKeyword,
		);
		const hasExportModifier = modifiers?.some(
			(m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword,
		);

		if (hasExportModifier) {
			extractExport(node, exports, hasDefaultModifier || false);
		}

		if (ts.isExportAssignment(node) && !node.isExportEquals) {
			exports.push({
				name: "default",
				type: getExportType(node.expression),
				isDefault: true,
			});
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return exports;
}

/**
 * Extract export information from a node
 */
function extractExport(node: ts.Node, exports: Export[], isDefault: boolean): void {
	if (ts.isFunctionDeclaration(node) && node.name) {
		exports.push({
			name: isDefault ? "default" : node.name.text,
			type: "function",
			isDefault,
		});
	} else if (ts.isClassDeclaration(node) && node.name) {
		exports.push({
			name: isDefault ? "default" : node.name.text,
			type: "class",
			isDefault,
		});
	} else if (ts.isVariableStatement(node)) {
		node.declarationList.declarations.forEach((decl) => {
			if (ts.isIdentifier(decl.name)) {
				exports.push({
					name: isDefault ? "default" : decl.name.text,
					type: "const",
					isDefault,
				});
			}
		});
	} else if (ts.isTypeAliasDeclaration(node)) {
		exports.push({
			name: isDefault ? "default" : node.name.text,
			type: "type",
			isDefault,
		});
	} else if (ts.isInterfaceDeclaration(node)) {
		exports.push({
			name: isDefault ? "default" : node.name.text,
			type: "interface",
			isDefault,
		});
	}
}

/**
 * Determine the type of an export expression
 */
function getExportType(expression: ts.Expression): Export["type"] {
	if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
		return "function";
	}
	if (ts.isClassExpression(expression)) {
		return "class";
	}
	return "const";
}

/**
 * Compares a reference file with an existing file to identify differences and conflicts
 *
 * @param referenceFilePath - Path to the reference file
 * @param existingFilePath - Path to the existing file
 * @param referenceContent - Content of the reference file
 * @param existingContent - Content of the existing file
 * @returns FileComparison object containing detailed comparison results
 *
 * Requirements: 3.1
 */
export function compareFiles(
	referenceFilePath: string,
	existingFilePath: string,
	referenceContent: string,
	existingContent: string,
): FileComparison {
	// Parse both files to extract exports
	const referenceExports = parseFileContent(referenceFilePath, referenceContent);
	const existingExports = parseFileContent(existingFilePath, existingContent);

	// Create maps for quick lookup
	const existingExportMap = new Map<string, Export>();
	for (const exp of existingExports) {
		existingExportMap.set(exp.name, exp);
	}

	const referenceExportMap = new Map<string, Export>();
	for (const exp of referenceExports) {
		referenceExportMap.set(exp.name, exp);
	}

	// Categorize exports
	const newExports: Export[] = [];
	const commonExports: Export[] = [];
	const conflicts: Conflict[] = [];

	// Check each reference export
	for (const refExport of referenceExports) {
		const existingExport = existingExportMap.get(refExport.name);

		if (existingExport) {
			// Export exists in both files
			commonExports.push(refExport);

			// Check for conflicts (different types or both are default exports)
			if (refExport.type !== existingExport.type) {
				conflicts.push({
					type: "incompatible_types",
					description: `Export "${refExport.name}" has different types: reference is ${refExport.type}, existing is ${existingExport.type}`,
					referenceCode: extractExportCode(referenceContent, refExport),
					existingCode: extractExportCode(existingContent, existingExport),
				});
			} else if (refExport.isDefault && existingExport.isDefault) {
				// Both have default exports - this is a potential conflict
				const refCode = extractExportCode(referenceContent, refExport);
				const existingCode = extractExportCode(existingContent, existingExport);

				// Only flag as conflict if the code is different
				if (refCode.trim() !== existingCode.trim()) {
					conflicts.push({
						type: "duplicate_export",
						description: "Both files have different default exports",
						referenceCode: refCode,
						existingCode: existingCode,
					});
				}
			} else {
				// Check if the implementations are different
				const refCode = extractExportCode(referenceContent, refExport);
				const existingCode = extractExportCode(existingContent, existingExport);

				if (refCode.trim() !== existingCode.trim()) {
					conflicts.push({
						type: "duplicate_export",
						description: `Export "${refExport.name}" exists in both files with different implementations`,
						referenceCode: refCode,
						existingCode: existingCode,
					});
				}
			}
		} else {
			// Export only exists in reference file
			newExports.push(refExport);
		}
	}

	// Find exports only in existing file
	const existingOnlyExports: Export[] = [];
	for (const existingExport of existingExports) {
		if (!referenceExportMap.has(existingExport.name)) {
			existingOnlyExports.push(existingExport);
		}
	}

	return {
		hasConflicts: conflicts.length > 0,
		conflicts,
		newExports,
		commonExports,
		existingOnlyExports,
		referenceContent,
		existingContent,
	};
}

/**
 * Extracts the code for a specific export from file content
 *
 * This is a simplified implementation that attempts to extract the export code.
 * For a production system, this would use AST to precisely extract the code.
 *
 * @param content - File content
 * @param exp - Export to extract
 * @returns Code snippet for the export
 */
function extractExportCode(content: string, exp: Export): string {
	// Split content into lines
	const lines = content.split("\n");

	// Search for the export
	const exportPattern = exp.isDefault
		? /export\s+default/
		: new RegExp(
				`export\\s+(?:const|let|var|function|class|interface|type)\\s+${escapeRegex(exp.name)}\\b`,
			);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (exportPattern.test(line)) {
			// Found the export, now extract the full declaration
			return extractDeclaration(lines, i, exp);
		}
	}

	// If not found with export keyword, look for the declaration itself (only for named exports)
	if (!exp.isDefault) {
		const declarationPattern = new RegExp(
			`^(?:const|let|var|function|class|interface|type)\\s+${escapeRegex(exp.name)}\\b`,
		);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (declarationPattern.test(line.trim())) {
				return extractDeclaration(lines, i, exp);
			}
		}
	}

	return `// Could not extract code for ${exp.name}`;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts a complete declaration starting from a given line
 *
 * @param lines - Array of file lines
 * @param startLine - Line index where declaration starts
 * @param exp - Export information
 * @returns Extracted declaration code
 */
function extractDeclaration(lines: string[], startLine: number, exp: Export): string {
	const result: string[] = [];
	let braceCount = 0;
	let parenCount = 0;
	let inDeclaration = false;

	for (let i = startLine; i < lines.length; i++) {
		const line = lines[i];
		result.push(line);

		// Count braces and parentheses
		for (const char of line) {
			if (char === "{") {
				braceCount++;
			}
			if (char === "}") {
				braceCount--;
			}
			if (char === "(") {
				parenCount++;
			}
			if (char === ")") {
				parenCount--;
			}
		}

		// Check if we've started the declaration
		if (
			line.includes("export") ||
			line.includes("function") ||
			line.includes("class") ||
			line.includes("const") ||
			line.includes("let") ||
			line.includes("var") ||
			line.includes("interface") ||
			line.includes("type")
		) {
			inDeclaration = true;
		}

		// For simple declarations (const, let, var), stop at semicolon if no braces
		if (inDeclaration && braceCount === 0 && parenCount === 0) {
			if (line.includes(";")) {
				break;
			}
			// For type/interface declarations without braces
			if ((exp.type === "type" || exp.type === "interface") && line.trim().endsWith(";")) {
				break;
			}
		}

		// For declarations with braces, stop when braces are balanced
		if (inDeclaration && braceCount === 0 && parenCount === 0 && i > startLine) {
			// Check if we've closed all braces
			if (line.includes("}")) {
				break;
			}
		}

		// Safety limit: don't extract more than 50 lines
		if (result.length > 50) {
			result.push("// ... (truncated)");
			break;
		}
	}

	return result.join("\n");
}

/**
 * Checks if two files are identical
 *
 * @param content1 - First file content
 * @param content2 - Second file content
 * @returns true if files are identical, false otherwise
 */
export function areFilesIdentical(content1: string, content2: string): boolean {
	// Normalize whitespace and compare
	const normalized1 = content1.trim().replace(/\s+/g, " ");
	const normalized2 = content2.trim().replace(/\s+/g, " ");
	return normalized1 === normalized2;
}

/**
 * Generates a summary of differences between two files
 *
 * @param comparison - FileComparison result
 * @returns Human-readable summary of differences
 */
export function generateDiffSummary(comparison: FileComparison): string {
	const parts: string[] = [];

	if (comparison.newExports.length > 0) {
		parts.push(
			`New exports (${comparison.newExports.length}): ${comparison.newExports.map((e) => e.name).join(", ")}`,
		);
	}

	if (comparison.existingOnlyExports.length > 0) {
		parts.push(
			`Existing-only exports (${comparison.existingOnlyExports.length}): ${comparison.existingOnlyExports.map((e) => e.name).join(", ")}`,
		);
	}

	if (comparison.commonExports.length > 0) {
		parts.push(
			`Common exports (${comparison.commonExports.length}): ${comparison.commonExports.map((e) => e.name).join(", ")}`,
		);
	}

	if (comparison.conflicts.length > 0) {
		parts.push(`Conflicts (${comparison.conflicts.length}):`);
		for (const conflict of comparison.conflicts) {
			parts.push(`  - ${conflict.type}: ${conflict.description}`);
		}
	}

	return parts.join("\n");
}
