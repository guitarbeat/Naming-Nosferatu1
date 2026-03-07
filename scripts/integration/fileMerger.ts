// @ts-nocheck
/**
 * File Merger - Merges reference files with existing files
 *
 * Requirements: 3.2, 3.3, 3.4
 */

import * as ts from "typescript";
import type { FileComparison } from "./fileComparator";
import type { Conflict, Export, MergeStrategy } from "./types";

/**
 * Result of a merge operation
 */
interface MergeResult {
	mergedContent: string;
	conflicts: Conflict[];
	addedExports: Export[];
	preservedExports: Export[];
}

/**
 * Merges a reference file with an existing file based on the provided strategy
 *
 * @param comparison - FileComparison result from comparing the two files
 * @param strategy - MergeStrategy defining how to handle the merge
 * @returns MergeResult containing the merged content and metadata
 *
 * Requirements: 3.2, 3.3, 3.4
 */
export function mergeFiles(comparison: FileComparison, strategy: MergeStrategy): MergeResult {
	const { existingContent, referenceContent, newExports, conflicts } = comparison;

	// If there are conflicts and strategy requires user input, return early
	if (conflicts.length > 0 && strategy.requestUserInput) {
		return {
			mergedContent: existingContent,
			conflicts,
			addedExports: [],
			preservedExports: comparison.existingOnlyExports.concat(comparison.commonExports),
		};
	}

	// Parse both files to get their AST
	const existingSourceFile = ts.createSourceFile(
		"existing.ts",
		existingContent,
		ts.ScriptTarget.Latest,
		true,
	);

	const referenceSourceFile = ts.createSourceFile(
		"reference.ts",
		referenceContent,
		ts.ScriptTarget.Latest,
		true,
	);

	// Extract imports from both files
	const existingImports = extractImports(existingSourceFile);
	const referenceImports = extractImports(referenceSourceFile);

	// Merge imports (deduplicate and combine)
	const mergedImports = mergeImports(existingImports, referenceImports);

	// Start building the merged content
	const parts: string[] = [];

	// Add merged imports
	parts.push(mergedImports.join("\n"));
	if (mergedImports.length > 0) {
		parts.push(""); // Empty line after imports
	}

	// Add existing file content (excluding imports)
	const existingWithoutImports = removeImports(existingContent);
	parts.push(existingWithoutImports.trim());

	// Add new exports from reference file if strategy allows
	const addedExports: Export[] = [];
	if (strategy.addNewExports && newExports.length > 0) {
		parts.push(""); // Empty line before new exports
		parts.push("// ============================================================================");
		parts.push("// Integrated from reference file");
		parts.push("// ============================================================================");
		parts.push("");

		for (const exp of newExports) {
			const exportCode = extractExportFromFile(referenceSourceFile, referenceContent, exp);
			if (exportCode) {
				parts.push(exportCode);
				parts.push(""); // Empty line between exports
				addedExports.push(exp);
			}
		}
	}

	const mergedContent = `${parts.join("\n").trim()}\n`;

	return {
		mergedContent,
		conflicts: strategy.requestUserInput ? conflicts : [],
		addedExports,
		preservedExports: comparison.existingOnlyExports.concat(comparison.commonExports),
	};
}

/**
 * Extracts import statements from a source file
 */
function extractImports(sourceFile: ts.SourceFile): string[] {
	const imports: string[] = [];

	function visit(node: ts.Node) {
		if (ts.isImportDeclaration(node)) {
			// Get the full text of the import statement
			imports.push(node.getFullText(sourceFile).trim());
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return imports;
}

/**
 * Merges two sets of imports, removing duplicates
 */
function mergeImports(existing: string[], reference: string[]): string[] {
	const importSet = new Set<string>();

	// Add all existing imports
	for (const imp of existing) {
		importSet.add(imp);
	}

	// Add reference imports that don't already exist
	for (const imp of reference) {
		importSet.add(imp);
	}

	// Sort imports for consistency
	return Array.from(importSet).sort();
}

/**
 * Removes import statements from file content
 */
function removeImports(content: string): string {
	const sourceFile = ts.createSourceFile("temp.ts", content, ts.ScriptTarget.Latest, true);

	const lines = content.split("\n");
	const linesToRemove = new Set<number>();

	function visit(node: ts.Node) {
		if (ts.isImportDeclaration(node)) {
			const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
			const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

			for (let i = startLine; i <= endLine; i++) {
				linesToRemove.add(i);
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	// Filter out import lines
	const filteredLines = lines.filter((_, index) => !linesToRemove.has(index));

	// Remove leading empty lines
	while (filteredLines.length > 0 && filteredLines[0].trim() === "") {
		filteredLines.shift();
	}

	return filteredLines.join("\n");
}

/**
 * Extracts the code for a specific export from a source file
 */
function extractExportFromFile(
	sourceFile: ts.SourceFile,
	content: string,
	exp: Export,
): string | null {
	const lines = content.split("\n");
	let foundNode: ts.Node | undefined;

	function visit(node: ts.Node) {
		if (foundNode) {
			return; // Already found
		}

		const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
		const hasExportModifier = modifiers?.some(
			(m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword,
		);
		const hasDefaultModifier = modifiers?.some(
			(m: ts.Modifier) => m.kind === ts.SyntaxKind.DefaultKeyword,
		);

		if (hasExportModifier) {
			// Check if this is the export we're looking for
			if (exp.isDefault && hasDefaultModifier) {
				foundNode = node;
				return;
			}

			// Check named exports
			if (!exp.isDefault) {
				if (ts.isFunctionDeclaration(node) && node.name?.text === exp.name) {
					foundNode = node;
					return;
				}
				if (ts.isClassDeclaration(node) && node.name?.text === exp.name) {
					foundNode = node;
					return;
				}
				if (ts.isTypeAliasDeclaration(node) && node.name.text === exp.name) {
					foundNode = node;
					return;
				}
				if (ts.isInterfaceDeclaration(node) && node.name.text === exp.name) {
					foundNode = node;
					return;
				}
				if (ts.isVariableStatement(node)) {
					for (const decl of node.declarationList.declarations) {
						if (ts.isIdentifier(decl.name) && decl.name.text === exp.name) {
							foundNode = node;
							return;
						}
					}
				}
			}
		}

		// Check for export default assignments
		if (ts.isExportAssignment(node) && !node.isExportEquals && exp.isDefault) {
			foundNode = node;
			return;
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	if (!foundNode) {
		return null;
	}

	// Get the start and end positions
	const start = foundNode.getStart(sourceFile, false);
	const end = foundNode.getEnd();

	// Get line numbers
	const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(start);
	const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(end);

	// Extract the lines
	const exportLines = lines.slice(startLine, endLine + 1);

	return exportLines.join("\n");
}

/**
 * Checks if a merge can be performed without conflicts
 *
 * @param comparison - FileComparison result
 * @returns true if merge can proceed without user input, false otherwise
 */
export function canMergeWithoutConflicts(comparison: FileComparison): boolean {
	return comparison.conflicts.length === 0;
}

/**
 * Creates a default merge strategy
 *
 * @param requestUserInputOnConflicts - Whether to request user input when conflicts are detected
 * @returns Default MergeStrategy
 */
export function createDefaultMergeStrategy(
	requestUserInputOnConflicts: boolean = true,
): MergeStrategy {
	return {
		preserveExisting: true,
		addNewExports: true,
		updateImports: true,
		requestUserInput: requestUserInputOnConflicts,
	};
}
