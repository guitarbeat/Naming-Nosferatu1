// @ts-nocheck
/**
 * AST Parser for TypeScript Files
 *
 * Uses the TypeScript Compiler API to parse files and extract:
 * - Import statements and their paths
 * - Export declarations (functions, classes, types, interfaces)
 * - File structure information
 *
 * Validates: Requirements 1.2
 */

import { readFileSync } from "node:fs";
import * as ts from "typescript";
import type { Dependency, Export } from "./types";

/**
 * Parsed file information extracted from AST
 */
interface ParsedFile {
	imports: string[];
	exports: Export[];
	hasJSX: boolean;
	sourceFile: ts.SourceFile;
}

/**
 * Parse a TypeScript/JavaScript file and extract imports, exports, and structure
 *
 * @param filePath - Path to the file to parse
 * @returns Parsed file information including imports, exports, and JSX detection
 * @throws Error if file cannot be read or parsed
 */
export function parseFile(filePath: string): ParsedFile {
	// Read file content
	const content = readFileSync(filePath, "utf-8");

	// Create source file using TypeScript compiler API
	const sourceFile = ts.createSourceFile(
		filePath,
		content,
		ts.ScriptTarget.Latest,
		true, // setParentNodes
	);

	const imports: string[] = [];
	const exports: Export[] = [];
	let hasJSX = false;

	// Visit each node in the AST
	function visit(node: ts.Node) {
		// Extract import declarations
		if (ts.isImportDeclaration(node)) {
			const moduleSpecifier = node.moduleSpecifier;
			if (ts.isStringLiteral(moduleSpecifier)) {
				imports.push(moduleSpecifier.text);
			}
		}

		// Extract export declarations
		if (ts.isExportDeclaration(node)) {
			// Handle: export { foo, bar } from './module'
			if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
				imports.push(node.moduleSpecifier.text);
			}
		}

		// Check if this is a default export
		const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
		const hasDefaultModifier = modifiers?.some(
			(m: ts.Modifier) => m.kind === ts.SyntaxKind.DefaultKeyword,
		);
		const hasExportModifier = modifiers?.some(
			(m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword,
		);

		// Extract named and default exports with export keyword
		if (hasExportModifier) {
			extractExport(node, exports, hasDefaultModifier || false);
		}

		// Extract default exports using export assignment (export default expression)
		if (ts.isExportAssignment(node)) {
			if (!node.isExportEquals) {
				// export default ...
				exports.push({
					name: "default",
					type: getExportType(node.expression),
					isDefault: true,
				});
			}
		}

		// Detect JSX
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
			hasJSX = true;
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	return {
		imports,
		exports,
		hasJSX,
		sourceFile,
	};
}

/**
 * Extract export information from a node
 */
function extractExport(node: ts.Node, exports: Export[], isDefault: boolean): void {
	if (ts.isFunctionDeclaration(node) && node.name) {
		exports.push({
			name: node.name.text,
			type: "function",
			isDefault,
		});
	} else if (ts.isClassDeclaration(node) && node.name) {
		exports.push({
			name: node.name.text,
			type: "class",
			isDefault,
		});
	} else if (ts.isVariableStatement(node)) {
		node.declarationList.declarations.forEach((decl) => {
			if (ts.isIdentifier(decl.name)) {
				exports.push({
					name: decl.name.text,
					type: "const",
					isDefault,
				});
			}
		});
	} else if (ts.isTypeAliasDeclaration(node)) {
		exports.push({
			name: node.name.text,
			type: "type",
			isDefault,
		});
	} else if (ts.isInterfaceDeclaration(node)) {
		exports.push({
			name: node.name.text,
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
 * Extract all import paths from a file
 *
 * @param filePath - Path to the file to analyze
 * @returns Array of import paths found in the file
 */
export function extractImports(filePath: string): string[] {
	const parsed = parseFile(filePath);
	return parsed.imports;
}

/**
 * Extract all exports from a file
 *
 * @param filePath - Path to the file to analyze
 * @returns Array of export information
 */
export function extractExports(filePath: string): Export[] {
	const parsed = parseFile(filePath);
	return parsed.exports;
}

/**
 * Check if a file contains JSX
 *
 * @param filePath - Path to the file to check
 * @returns True if the file contains JSX elements
 */
export function hasJSXContent(filePath: string): boolean {
	const parsed = parseFile(filePath);
	return parsed.hasJSX;
}

/**
 * Convert import paths to dependency objects
 *
 * @param imports - Array of import paths
 * @returns Array of dependency objects with classification
 */
export function importsToDependencies(imports: string[]): Dependency[] {
	return imports.map((importPath) => {
		// External packages don't start with . or /
		const isExternal = !importPath.startsWith(".") && !importPath.startsWith("/");

		return {
			importPath,
			isExternal,
			isResolved: false, // Will be determined by dependency resolver
			sourceFile: undefined,
		};
	});
}
