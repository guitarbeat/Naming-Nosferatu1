// @ts-nocheck
/**
 * Target Location Resolver
 *
 * Maps file types to target directories within the src/ structure.
 * Handles special cases like distinguishing between layout and feature components.
 *
 * Validates: Requirements 1.3, 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { basename } from "node:path";
import { parseFile } from "./astParser";
import { FileType } from "./types";

/**
 * Determine the target location for a file based on its type and characteristics
 *
 * Mapping rules:
 * - HOOK -> src/hooks/
 * - SERVICE -> src/services/
 * - UTILITY -> src/utils/
 * - TYPE -> src/types/
 * - COMPONENT -> src/layout/ or src/features/ (based on component characteristics)
 * - UNKNOWN -> null (requires manual classification)
 *
 * @param filePath - Path to the file
 * @param fileType - The classified file type
 * @returns Target directory path or null if cannot be determined
 */
export function resolveTargetLocation(filePath: string, fileType: FileType): string | null {
	const fileName = basename(filePath);

	switch (fileType) {
		case FileType.HOOK:
			return "src/hooks/";

		case FileType.SERVICE:
			return "src/services/";

		case FileType.UTILITY:
			return "src/utils/";

		case FileType.TYPE:
			return "src/types/";

		case FileType.COMPONENT:
			// Special case: determine if component belongs in layout or features
			return resolveComponentLocation(filePath, fileName);

		case FileType.UNKNOWN:
			return null;

		default:
			return null;
	}
}

/**
 * Determine if a component belongs in layout or features directory
 *
 * Layout components are typically:
 * - Named with "Layout" in the name (e.g., AppLayout, MainLayout)
 * - Named as common UI structure elements (Header, Footer, Sidebar, Nav)
 * - Wrapper or container components
 *
 * Feature components are:
 * - Domain-specific components (UserProfile, TaskList, etc.)
 * - Everything else that doesn't fit layout criteria
 *
 * @param filePath - Path to the component file
 * @param fileName - Name of the component file
 * @returns Target directory for the component
 */
function resolveComponentLocation(filePath: string, fileName: string): string {
	const nameWithoutExt = fileName.replace(/\.(tsx?|jsx?)$/, "");
	const lowerName = nameWithoutExt.toLowerCase();

	// Check for layout-related naming patterns
	const layoutPatterns = [
		"layout",
		"header",
		"footer",
		"sidebar",
		"nav",
		"navigation",
		"menu",
		"wrapper",
		"container",
		"shell",
		"frame",
	];

	const isLayoutComponent = layoutPatterns.some((pattern) => lowerName.includes(pattern));

	if (isLayoutComponent) {
		return "src/layout/";
	}

	// Check for common layout component patterns by analyzing exports
	// Layout components often have generic names or are used as wrappers
	try {
		const _parsed = parseFile(filePath);

		// If the component has a generic single-word name, it might be layout
		const hasGenericName = /^[A-Z][a-z]+$/.test(nameWithoutExt);

		// Common layout component names
		const commonLayoutNames = ["App", "Main", "Root", "Page", "View", "Screen"];

		if (hasGenericName && commonLayoutNames.includes(nameWithoutExt)) {
			return "src/layout/";
		}
	} catch (_error) {
		// If parsing fails, fall back to features
		// This is safe because features is the default for components
	}

	// Default to features for domain-specific components
	return "src/features/";
}

/**
 * Get the full target path for a file (directory + filename)
 *
 * @param filePath - Original file path
 * @param fileType - The classified file type
 * @returns Full target path or null if cannot be determined
 */
export function getFullTargetPath(filePath: string, fileType: FileType): string | null {
	const targetDir = resolveTargetLocation(filePath, fileType);

	if (!targetDir) {
		return null;
	}

	const fileName = basename(filePath);
	return targetDir + fileName;
}
