// @ts-nocheck
/**
 * Dependency Resolver
 *
 * Checks if imports exist in the project and classifies them as external vs internal.
 *
 * Validates: Requirements 1.4, 4.4, 7.1
 */

import { existsSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import type { Dependency } from "./types";

/**
 * Resolve dependencies for a file by checking if imports exist in the project
 *
 * @param dependencies - Array of dependencies to resolve
 * @param currentFilePath - Path to the file containing these dependencies
 * @param projectRoot - Root directory of the project
 * @returns Updated dependencies with isResolved status
 */
export function resolveDependencies(
	dependencies: Dependency[],
	currentFilePath: string,
	projectRoot: string,
): Dependency[] {
	return dependencies.map((dep) => {
		if (dep.isExternal) {
			// External packages - check if they exist in node_modules
			const isResolved = checkExternalDependency(dep.importPath, projectRoot);
			return { ...dep, isResolved };
		} else {
			// Internal modules - check if the file exists
			const resolvedPath = resolveInternalModule(dep.importPath, currentFilePath, projectRoot);
			return {
				...dep,
				isResolved: resolvedPath !== null,
				sourceFile: resolvedPath || undefined,
			};
		}
	});
}

/**
 * Check if an external package exists in node_modules
 *
 * @param packageName - Name of the package (e.g., 'react', '@types/node')
 * @param projectRoot - Root directory of the project
 * @returns True if the package exists in node_modules
 */
export function checkExternalDependency(packageName: string, projectRoot: string): boolean {
	// Extract the package name (handle scoped packages like @types/node)
	const parts = packageName.split("/");
	const pkgName = packageName.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];

	const nodeModulesPath = resolve(projectRoot, "node_modules", pkgName);
	return existsSync(nodeModulesPath);
}

/**
 * Resolve an internal module path to an actual file path
 *
 * @param importPath - Relative import path (e.g., './utils', '../types/index')
 * @param currentFilePath - Path to the file containing this import
 * @param projectRoot - Root directory of the project (reserved for future use)
 * @returns Resolved file path or null if not found
 */
export function resolveInternalModule(
	importPath: string,
	currentFilePath: string,
	_projectRoot: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): string | null {
	const currentDir = dirname(currentFilePath);

	// Try different file extensions
	const extensions = [".ts", ".tsx", ".js", ".jsx", ".d.ts"];

	// If the import already has an extension, try it directly
	if (extname(importPath)) {
		const fullPath = resolve(currentDir, importPath);
		if (existsSync(fullPath)) {
			return fullPath;
		}
		return null;
	}

	// Try with each extension
	for (const ext of extensions) {
		const fullPath = resolve(currentDir, `${importPath}${ext}`);
		if (existsSync(fullPath)) {
			return fullPath;
		}
	}

	// Try as a directory with index file
	for (const ext of extensions) {
		const indexPath = resolve(currentDir, importPath, `index${ext}`);
		if (existsSync(indexPath)) {
			return indexPath;
		}
	}

	return null;
}

/**
 * Classify a dependency as external or internal based on its import path
 *
 * @param importPath - The import path to classify
 * @returns True if the dependency is external (npm package), false if internal (project file)
 */
export function classifyDependency(importPath: string): boolean {
	// External packages don't start with . or /
	// Internal modules start with ./ or ../ or /
	return !importPath.startsWith(".") && !importPath.startsWith("/");
}

/**
 * Get all unresolved dependencies from a list
 *
 * @param dependencies - Array of dependencies to filter
 * @returns Array of unresolved dependencies
 */
export function getUnresolvedDependencies(dependencies: Dependency[]): Dependency[] {
	return dependencies.filter((dep) => !dep.isResolved);
}

/**
 * Get all external dependencies from a list
 *
 * @param dependencies - Array of dependencies to filter
 * @returns Array of external dependencies
 */
export function getExternalDependencies(dependencies: Dependency[]): Dependency[] {
	return dependencies.filter((dep) => dep.isExternal);
}

/**
 * Get all internal dependencies from a list
 *
 * @param dependencies - Array of dependencies to filter
 * @returns Array of internal dependencies
 */
export function getInternalDependencies(dependencies: Dependency[]): Dependency[] {
	return dependencies.filter((dep) => !dep.isExternal);
}
