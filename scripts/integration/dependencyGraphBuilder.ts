// @ts-nocheck
/**
 * Dependency Graph Builder
 *
 * Builds a dependency graph from file analyses to determine integration order.
 *
 * Validates: Requirements 8.1
 */

import {
	type CircularDependency,
	type DependencyGraph,
	type FileAnalysis,
	type FileNode,
	IntegrationStatus,
} from "./types";

/**
 * Build a dependency graph from file analyses
 *
 * @param analyses - Array of file analyses
 * @returns Dependency graph with nodes and edges
 */
export function buildDependencyGraph(analyses: FileAnalysis[]): DependencyGraph {
	const nodes = new Map<string, FileNode>();
	const edges = new Map<string, string[]>();

	// Create nodes for each file
	for (const analysis of analyses) {
		nodes.set(analysis.filePath, {
			filePath: analysis.filePath,
			analysis,
			status: IntegrationStatus.PENDING,
		});
	}

	// Build edges based on dependencies
	for (const analysis of analyses) {
		const dependencies: string[] = [];

		// Check each dependency to see if it references another file in the graph
		for (const dep of analysis.dependencies) {
			if (!dep.isExternal && dep.sourceFile) {
				// This is an internal dependency - check if it's in our graph
				if (nodes.has(dep.sourceFile)) {
					dependencies.push(dep.sourceFile);
				}
			}
		}

		edges.set(analysis.filePath, dependencies);
	}

	return { nodes, edges };
}

/**
 * Add a node to the dependency graph
 *
 * @param graph - The dependency graph
 * @param analysis - File analysis to add
 */
export function addNode(graph: DependencyGraph, analysis: FileAnalysis): void {
	const node: FileNode = {
		filePath: analysis.filePath,
		analysis,
		status: IntegrationStatus.PENDING,
	};

	graph.nodes.set(analysis.filePath, node);

	// Initialize edges if not present
	if (!graph.edges.has(analysis.filePath)) {
		graph.edges.set(analysis.filePath, []);
	}
}

/**
 * Add an edge to the dependency graph
 *
 * @param graph - The dependency graph
 * @param from - Source file path
 * @param to - Dependency file path
 */
export function addEdge(graph: DependencyGraph, from: string, to: string): void {
	const dependencies = graph.edges.get(from) || [];
	if (!dependencies.includes(to)) {
		dependencies.push(to);
		graph.edges.set(from, dependencies);
	}
}

/**
 * Get all dependencies for a file
 *
 * @param graph - The dependency graph
 * @param filePath - Path to the file
 * @returns Array of dependency file paths
 */
export function getDependencies(graph: DependencyGraph, filePath: string): string[] {
	return graph.edges.get(filePath) || [];
}

/**
 * Get all dependents (files that depend on this file)
 *
 * @param graph - The dependency graph
 * @param filePath - Path to the file
 * @returns Array of dependent file paths
 */
export function getDependents(graph: DependencyGraph, filePath: string): string[] {
	const dependents: string[] = [];

	for (const [source, deps] of graph.edges.entries()) {
		if (deps.includes(filePath)) {
			dependents.push(source);
		}
	}

	return dependents;
}

/**
 * Update the status of a node in the graph
 *
 * @param graph - The dependency graph
 * @param filePath - Path to the file
 * @param status - New status
 */
export function updateNodeStatus(
	graph: DependencyGraph,
	filePath: string,
	status: IntegrationStatus,
): void {
	const node = graph.nodes.get(filePath);
	if (node) {
		node.status = status;
	}
}

/**
 * Get all nodes with a specific status
 *
 * @param graph - The dependency graph
 * @param status - Status to filter by
 * @returns Array of file paths with the given status
 */
export function getNodesByStatus(graph: DependencyGraph, status: IntegrationStatus): string[] {
	const result: string[] = [];

	for (const [filePath, node] of graph.nodes.entries()) {
		if (node.status === status) {
			result.push(filePath);
		}
	}

	return result;
}

/**
 * Check if a file has any unresolved dependencies
 *
 * @param graph - The dependency graph
 * @param filePath - Path to the file
 * @returns True if all dependencies are completed
 */
export function hasUnresolvedDependencies(graph: DependencyGraph, filePath: string): boolean {
	const dependencies = getDependencies(graph, filePath);

	for (const dep of dependencies) {
		const node = graph.nodes.get(dep);
		if (!node || node.status !== IntegrationStatus.COMPLETED) {
			return true;
		}
	}

	return false;
}

/**
 * Get all files that are ready to be processed (no unresolved dependencies)
 *
 * @param graph - The dependency graph
 * @returns Array of file paths ready for processing
 */
export function getReadyFiles(graph: DependencyGraph): string[] {
	const ready: string[] = [];

	for (const filePath of getNodesByStatus(graph, IntegrationStatus.PENDING)) {
		if (!hasUnresolvedDependencies(graph, filePath)) {
			ready.push(filePath);
		}
	}

	return ready;
}

/**
 * Perform topological sort on the dependency graph
 *
 * Returns files in an order where dependencies come before dependents.
 * Files with no dependencies between them are sorted alphabetically.
 *
 * @param graph - The dependency graph
 * @returns Array of file paths in topological order
 * @throws Error if circular dependencies are detected
 *
 * Validates: Requirements 7.4, 8.2, 8.4
 */
export function topologicalSort(graph: DependencyGraph): string[] {
	const result: string[] = [];
	const visited = new Set<string>();
	const visiting = new Set<string>();

	// Get all nodes sorted alphabetically for consistent ordering of independent files
	const allNodes = Array.from(graph.nodes.keys()).sort();

	/**
	 * Depth-first search to visit nodes in topological order
	 */
	function visit(filePath: string): void {
		// Check for circular dependency
		if (visiting.has(filePath)) {
			throw new Error(`Circular dependency detected involving: ${filePath}`);
		}

		// Skip if already visited
		if (visited.has(filePath)) {
			return;
		}

		// Mark as currently visiting
		visiting.add(filePath);

		// Visit all dependencies first (sorted alphabetically for consistency)
		const dependencies = getDependencies(graph, filePath).sort();
		for (const dep of dependencies) {
			visit(dep);
		}

		// Mark as visited and remove from visiting set
		visiting.delete(filePath);
		visited.add(filePath);

		// Add to result after all dependencies are processed
		result.push(filePath);
	}

	// Visit all nodes in alphabetical order
	// This ensures independent files are processed alphabetically
	for (const filePath of allNodes) {
		if (!visited.has(filePath)) {
			visit(filePath);
		}
	}

	return result;
}

/**
 * Get integration order for files in the graph
 *
 * This is an alias for topologicalSort with a more descriptive name
 * for the integration context.
 *
 * @param graph - The dependency graph
 * @returns Array of file paths in integration order
 * @throws Error if circular dependencies are detected
 */
export function getIntegrationOrder(graph: DependencyGraph): string[] {
	return topologicalSort(graph);
}

/**
 * Detect circular dependencies in the dependency graph
 *
 * Uses depth-first search to find cycles in the dependency graph.
 * Returns all detected cycles with detailed information.
 *
 * @param graph - The dependency graph
 * @returns Array of circular dependencies found, empty if none
 *
 * Validates: Requirements 8.3
 */
export function detectCircularDependencies(graph: DependencyGraph): CircularDependency[] {
	const cycles: CircularDependency[] = [];
	const visited = new Set<string>();
	const recursionStack = new Set<string>();
	const pathStack: string[] = [];

	/**
	 * Depth-first search to detect cycles
	 *
	 * @param filePath - Current file being visited
	 * @returns True if a cycle is detected from this node
	 */
	function detectCycle(filePath: string): boolean {
		// Mark as visited and add to recursion stack
		visited.add(filePath);
		recursionStack.add(filePath);
		pathStack.push(filePath);

		// Visit all dependencies
		const dependencies = getDependencies(graph, filePath);
		for (const dep of dependencies) {
			// If dependency is not visited, recurse
			if (!visited.has(dep)) {
				if (detectCycle(dep)) {
					return true;
				}
			}
			// If dependency is in recursion stack, we found a cycle
			else if (recursionStack.has(dep)) {
				// Extract the cycle from the path stack
				const cycleStartIndex = pathStack.indexOf(dep);
				const cycle = pathStack.slice(cycleStartIndex);
				cycle.push(dep); // Complete the cycle

				// Create a description of the cycle
				const cycleDescription = cycle
					.map((file, index) => {
						if (index === cycle.length - 1) {
							return file;
						}
						return `${file} → `;
					})
					.join("");

				// Add to cycles if not already detected
				const cycleKey = [...cycle].sort().join("|");
				const isDuplicate = cycles.some((c) => [...c.cycle].sort().join("|") === cycleKey);

				if (!isDuplicate) {
					cycles.push({
						cycle,
						description: `Circular dependency detected: ${cycleDescription}`,
					});
				}

				return true;
			}
		}

		// Remove from recursion stack and path stack
		recursionStack.delete(filePath);
		pathStack.pop();

		return false;
	}

	// Check all nodes for cycles
	for (const filePath of graph.nodes.keys()) {
		if (!visited.has(filePath)) {
			detectCycle(filePath);
		}
	}

	return cycles;
}

/**
 * Check if the dependency graph has any circular dependencies
 *
 * @param graph - The dependency graph
 * @returns True if circular dependencies exist
 *
 * Validates: Requirements 8.3
 */
export function hasCircularDependencies(graph: DependencyGraph): boolean {
	return detectCircularDependencies(graph).length > 0;
}
