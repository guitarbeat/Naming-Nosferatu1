// @ts-nocheck
/**
 * Tests for Dependency Graph Builder
 */

import { describe, expect, it } from "vitest";
import {
	addEdge,
	addNode,
	buildDependencyGraph,
	detectCircularDependencies,
	getDependencies,
	getDependents,
	getIntegrationOrder,
	getNodesByStatus,
	getReadyFiles,
	hasCircularDependencies,
	hasUnresolvedDependencies,
	topologicalSort,
	updateNodeStatus,
} from "./dependencyGraphBuilder";
import { type DependencyGraph, type FileAnalysis, FileType, IntegrationStatus } from "./types";

describe("dependencyGraphBuilder", () => {
	// Helper function to create a mock file analysis
	const createAnalysis = (
		filePath: string,
		dependencies: Array<{
			importPath: string;
			isExternal: boolean;
			sourceFile?: string;
		}>,
	): FileAnalysis => ({
		filePath,
		fileName: filePath.split("/").pop() || "",
		fileType: FileType.UTILITY,
		targetLocation: "src/utils",
		dependencies: dependencies.map((dep) => ({
			...dep,
			isResolved: true,
		})),
		exports: [],
		hasExistingFile: false,
	});

	describe("buildDependencyGraph", () => {
		it("should create nodes for all files", () => {
			const analyses = [
				createAnalysis("file1.ts", []),
				createAnalysis("file2.ts", []),
				createAnalysis("file3.ts", []),
			];

			const graph = buildDependencyGraph(analyses);

			expect(graph.nodes.size).toBe(3);
			expect(graph.nodes.has("file1.ts")).toBe(true);
			expect(graph.nodes.has("file2.ts")).toBe(true);
			expect(graph.nodes.has("file3.ts")).toBe(true);
		});

		it("should initialize all nodes with PENDING status", () => {
			const analyses = [createAnalysis("file1.ts", []), createAnalysis("file2.ts", [])];

			const graph = buildDependencyGraph(analyses);

			for (const node of graph.nodes.values()) {
				expect(node.status).toBe(IntegrationStatus.PENDING);
			}
		});

		it("should create edges for internal dependencies", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);

			const file1Deps = graph.edges.get("file1.ts");
			expect(file1Deps).toEqual(["file2.ts"]);
		});

		it("should ignore external dependencies when building edges", () => {
			const analyses = [createAnalysis("file1.ts", [{ importPath: "react", isExternal: true }])];

			const graph = buildDependencyGraph(analyses);

			const file1Deps = graph.edges.get("file1.ts");
			expect(file1Deps).toEqual([]);
		});

		it("should handle multiple dependencies", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file2.ts", []),
				createAnalysis("file3.ts", []),
			];

			const graph = buildDependencyGraph(analyses);

			const file1Deps = graph.edges.get("file1.ts");
			expect(file1Deps).toContain("file2.ts");
			expect(file1Deps).toContain("file3.ts");
			expect(file1Deps?.length).toBe(2);
		});

		it("should handle dependency chains", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file3.ts", []),
			];

			const graph = buildDependencyGraph(analyses);

			expect(graph.edges.get("file1.ts")).toEqual(["file2.ts"]);
			expect(graph.edges.get("file2.ts")).toEqual(["file3.ts"]);
			expect(graph.edges.get("file3.ts")).toEqual([]);
		});

		it("should ignore dependencies not in the graph", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{
						importPath: "./external",
						isExternal: false,
						sourceFile: "external.ts",
					},
				]),
			];

			const graph = buildDependencyGraph(analyses);

			const file1Deps = graph.edges.get("file1.ts");
			expect(file1Deps).toEqual([]);
		});

		it("should handle empty analysis array", () => {
			const graph = buildDependencyGraph([]);

			expect(graph.nodes.size).toBe(0);
			expect(graph.edges.size).toBe(0);
		});
	});

	describe("addNode", () => {
		it("should add a node to the graph", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map(),
			};

			const analysis = createAnalysis("file1.ts", []);
			addNode(graph, analysis);

			expect(graph.nodes.has("file1.ts")).toBe(true);
			expect(graph.nodes.get("file1.ts")?.status).toBe(IntegrationStatus.PENDING);
		});

		it("should initialize edges for the node", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map(),
			};

			const analysis = createAnalysis("file1.ts", []);
			addNode(graph, analysis);

			expect(graph.edges.has("file1.ts")).toBe(true);
			expect(graph.edges.get("file1.ts")).toEqual([]);
		});
	});

	describe("addEdge", () => {
		it("should add an edge between two nodes", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map([["file1.ts", []]]),
			};

			addEdge(graph, "file1.ts", "file2.ts");

			expect(graph.edges.get("file1.ts")).toEqual(["file2.ts"]);
		});

		it("should not add duplicate edges", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map([["file1.ts", ["file2.ts"]]]),
			};

			addEdge(graph, "file1.ts", "file2.ts");

			expect(graph.edges.get("file1.ts")).toEqual(["file2.ts"]);
		});

		it("should create edges array if not present", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map(),
			};

			addEdge(graph, "file1.ts", "file2.ts");

			expect(graph.edges.get("file1.ts")).toEqual(["file2.ts"]);
		});
	});

	describe("getDependencies", () => {
		it("should return dependencies for a file", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map([["file1.ts", ["file2.ts", "file3.ts"]]]),
			};

			const deps = getDependencies(graph, "file1.ts");

			expect(deps).toEqual(["file2.ts", "file3.ts"]);
		});

		it("should return empty array for file with no dependencies", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map([["file1.ts", []]]),
			};

			const deps = getDependencies(graph, "file1.ts");

			expect(deps).toEqual([]);
		});

		it("should return empty array for non-existent file", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map(),
			};

			const deps = getDependencies(graph, "nonexistent.ts");

			expect(deps).toEqual([]);
		});
	});

	describe("getDependents", () => {
		it("should return files that depend on the given file", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map([
					["file1.ts", ["file3.ts"]],
					["file2.ts", ["file3.ts"]],
				]),
			};

			const dependents = getDependents(graph, "file3.ts");

			expect(dependents).toContain("file1.ts");
			expect(dependents).toContain("file2.ts");
			expect(dependents.length).toBe(2);
		});

		it("should return empty array for file with no dependents", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map([["file1.ts", ["file2.ts"]]]),
			};

			const dependents = getDependents(graph, "file1.ts");

			expect(dependents).toEqual([]);
		});
	});

	describe("updateNodeStatus", () => {
		it("should update the status of a node", () => {
			const analysis = createAnalysis("file1.ts", []);
			const graph: DependencyGraph = {
				nodes: new Map([
					[
						"file1.ts",
						{
							filePath: "file1.ts",
							analysis,
							status: IntegrationStatus.PENDING,
						},
					],
				]),
				edges: new Map(),
			};

			updateNodeStatus(graph, "file1.ts", IntegrationStatus.COMPLETED);

			expect(graph.nodes.get("file1.ts")?.status).toBe(IntegrationStatus.COMPLETED);
		});

		it("should do nothing for non-existent node", () => {
			const graph: DependencyGraph = {
				nodes: new Map(),
				edges: new Map(),
			};

			// Should not throw
			updateNodeStatus(graph, "nonexistent.ts", IntegrationStatus.COMPLETED);
		});
	});

	describe("getNodesByStatus", () => {
		it("should return all nodes with the given status", () => {
			const analyses = [
				createAnalysis("file1.ts", []),
				createAnalysis("file2.ts", []),
				createAnalysis("file3.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			updateNodeStatus(graph, "file1.ts", IntegrationStatus.COMPLETED);
			updateNodeStatus(graph, "file2.ts", IntegrationStatus.COMPLETED);

			const pending = getNodesByStatus(graph, IntegrationStatus.PENDING);
			const completed = getNodesByStatus(graph, IntegrationStatus.COMPLETED);

			expect(pending).toEqual(["file3.ts"]);
			expect(completed).toContain("file1.ts");
			expect(completed).toContain("file2.ts");
			expect(completed.length).toBe(2);
		});

		it("should return empty array when no nodes match", () => {
			const graph = buildDependencyGraph([]);

			const result = getNodesByStatus(graph, IntegrationStatus.COMPLETED);

			expect(result).toEqual([]);
		});
	});

	describe("hasUnresolvedDependencies", () => {
		it("should return false when all dependencies are completed", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			updateNodeStatus(graph, "file2.ts", IntegrationStatus.COMPLETED);

			expect(hasUnresolvedDependencies(graph, "file1.ts")).toBe(false);
		});

		it("should return true when some dependencies are not completed", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);

			expect(hasUnresolvedDependencies(graph, "file1.ts")).toBe(true);
		});

		it("should return false when file has no dependencies", () => {
			const analyses = [createAnalysis("file1.ts", [])];

			const graph = buildDependencyGraph(analyses);

			expect(hasUnresolvedDependencies(graph, "file1.ts")).toBe(false);
		});

		it("should return true when dependency node does not exist", () => {
			const graph: DependencyGraph = {
				nodes: new Map([
					[
						"file1.ts",
						{
							filePath: "file1.ts",
							analysis: createAnalysis("file1.ts", []),
							status: IntegrationStatus.PENDING,
						},
					],
				]),
				edges: new Map([["file1.ts", ["nonexistent.ts"]]]),
			};

			expect(hasUnresolvedDependencies(graph, "file1.ts")).toBe(true);
		});
	});

	describe("getReadyFiles", () => {
		it("should return files with no dependencies", () => {
			const analyses = [
				createAnalysis("file1.ts", []),
				createAnalysis("file2.ts", []),
				createAnalysis("file3.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const ready = getReadyFiles(graph);

			expect(ready).toContain("file1.ts");
			expect(ready).toContain("file2.ts");
			expect(ready).not.toContain("file3.ts");
		});

		it("should return files whose dependencies are completed", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			updateNodeStatus(graph, "file2.ts", IntegrationStatus.COMPLETED);

			const ready = getReadyFiles(graph);

			expect(ready).toEqual(["file1.ts"]);
		});

		it("should not return files that are already completed", () => {
			const analyses = [createAnalysis("file1.ts", []), createAnalysis("file2.ts", [])];

			const graph = buildDependencyGraph(analyses);
			updateNodeStatus(graph, "file1.ts", IntegrationStatus.COMPLETED);

			const ready = getReadyFiles(graph);

			expect(ready).toEqual(["file2.ts"]);
		});

		it("should return empty array when no files are ready", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const ready = getReadyFiles(graph);

			expect(ready).toEqual([]);
		});
	});

	describe("complex scenarios", () => {
		it("should handle diamond dependency pattern", () => {
			//     file1
			//    /     \
			// file2   file3
			//    \     /
			//     file4
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file3.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file4.ts", []),
			];

			const graph = buildDependencyGraph(analyses);

			// file4 should be ready first
			let ready = getReadyFiles(graph);
			expect(ready).toEqual(["file4.ts"]);

			// After file4 is completed, file2 and file3 should be ready
			updateNodeStatus(graph, "file4.ts", IntegrationStatus.COMPLETED);
			ready = getReadyFiles(graph);
			expect(ready).toContain("file2.ts");
			expect(ready).toContain("file3.ts");
			expect(ready.length).toBe(2);

			// After file2 and file3 are completed, file1 should be ready
			updateNodeStatus(graph, "file2.ts", IntegrationStatus.COMPLETED);
			updateNodeStatus(graph, "file3.ts", IntegrationStatus.COMPLETED);
			ready = getReadyFiles(graph);
			expect(ready).toEqual(["file1.ts"]);
		});

		it("should handle mixed external and internal dependencies", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "react", isExternal: true },
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [{ importPath: "lodash", isExternal: true }]),
			];

			const graph = buildDependencyGraph(analyses);

			// file2 should be ready (external deps don't block)
			let ready = getReadyFiles(graph);
			expect(ready).toEqual(["file2.ts"]);

			// After file2 is completed, file1 should be ready
			updateNodeStatus(graph, "file2.ts", IntegrationStatus.COMPLETED);
			ready = getReadyFiles(graph);
			expect(ready).toEqual(["file1.ts"]);
		});
	});

	describe("topologicalSort", () => {
		it("should sort files with no dependencies alphabetically", () => {
			const analyses = [
				createAnalysis("zebra.ts", []),
				createAnalysis("apple.ts", []),
				createAnalysis("banana.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);

			expect(sorted).toEqual(["apple.ts", "banana.ts", "zebra.ts"]);
		});

		it("should place dependencies before dependents", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);

			expect(sorted).toEqual(["file2.ts", "file1.ts"]);
		});

		it("should handle dependency chains", () => {
			// file1 -> file2 -> file3
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file3.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);

			expect(sorted).toEqual(["file3.ts", "file2.ts", "file1.ts"]);
		});

		it("should handle diamond dependency pattern", () => {
			//     file1
			//    /     \
			// file2   file3
			//    \     /
			//     file4
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file3.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file4.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);

			// file4 must come first
			expect(sorted[0]).toBe("file4.ts");

			// file2 and file3 must come before file1
			const file2Index = sorted.indexOf("file2.ts");
			const file3Index = sorted.indexOf("file3.ts");
			const file1Index = sorted.indexOf("file1.ts");

			expect(file2Index).toBeLessThan(file1Index);
			expect(file3Index).toBeLessThan(file1Index);

			// file1 must be last
			expect(sorted[3]).toBe("file1.ts");
		});

		it("should sort independent branches alphabetically", () => {
			// Two independent chains:
			// zebra.ts -> yankee.ts
			// bravo.ts -> alpha.ts
			const analyses = [
				createAnalysis("zebra.ts", [
					{
						importPath: "./yankee",
						isExternal: false,
						sourceFile: "yankee.ts",
					},
				]),
				createAnalysis("yankee.ts", []),
				createAnalysis("bravo.ts", [
					{ importPath: "./alpha", isExternal: false, sourceFile: "alpha.ts" },
				]),
				createAnalysis("alpha.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);

			// Dependencies should come before dependents
			const alphaIndex = sorted.indexOf("alpha.ts");
			const bravoIndex = sorted.indexOf("bravo.ts");
			const yankeeIndex = sorted.indexOf("yankee.ts");
			const zebraIndex = sorted.indexOf("zebra.ts");

			expect(alphaIndex).toBeLessThan(bravoIndex);
			expect(yankeeIndex).toBeLessThan(zebraIndex);

			// Independent files at the same level should be alphabetically ordered
			// alpha and yankee are both dependencies (no deps themselves)
			expect(alphaIndex).toBeLessThan(yankeeIndex);

			// bravo and zebra are both dependents
			expect(bravoIndex).toBeLessThan(zebraIndex);
		});

		it("should throw error on circular dependencies", () => {
			// file1 -> file2 -> file1 (circular)
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);

			expect(() => topologicalSort(graph)).toThrow("Circular dependency detected");
		});

		it("should throw error on complex circular dependencies", () => {
			// file1 -> file2 -> file3 -> file1 (circular)
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file3.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);

			expect(() => topologicalSort(graph)).toThrow("Circular dependency detected");
		});

		it("should handle empty graph", () => {
			const graph = buildDependencyGraph([]);
			const sorted = topologicalSort(graph);

			expect(sorted).toEqual([]);
		});

		it("should handle single file with no dependencies", () => {
			const analyses = [createAnalysis("file1.ts", [])];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);

			expect(sorted).toEqual(["file1.ts"]);
		});

		it("should handle multiple files with mixed dependencies and independent files", () => {
			// independent1.ts (no deps)
			// file1.ts -> file2.ts
			// independent2.ts (no deps)
			const analyses = [
				createAnalysis("independent1.ts", []),
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("independent2.ts", []),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);

			// file2 must come before file1
			const file2Index = sorted.indexOf("file2.ts");
			const file1Index = sorted.indexOf("file1.ts");
			expect(file2Index).toBeLessThan(file1Index);

			// Independent files should be in alphabetical order relative to each other
			const ind1Index = sorted.indexOf("independent1.ts");
			const ind2Index = sorted.indexOf("independent2.ts");
			expect(ind1Index).toBeLessThan(ind2Index);
		});
	});

	describe("getIntegrationOrder", () => {
		it("should return the same result as topologicalSort", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const sorted = topologicalSort(graph);
			const integrationOrder = getIntegrationOrder(graph);

			expect(integrationOrder).toEqual(sorted);
		});
	});

	describe("detectCircularDependencies", () => {
		it("should return empty array when no circular dependencies exist", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles).toEqual([]);
		});

		it("should detect simple circular dependency (A -> B -> A)", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles.length).toBe(1);
			expect(cycles[0].cycle).toContain("file1.ts");
			expect(cycles[0].cycle).toContain("file2.ts");
			expect(cycles[0].description).toContain("Circular dependency detected");
		});

		it("should detect circular dependency in a chain (A -> B -> C -> A)", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file3.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles.length).toBe(1);
			expect(cycles[0].cycle).toContain("file1.ts");
			expect(cycles[0].cycle).toContain("file2.ts");
			expect(cycles[0].cycle).toContain("file3.ts");
		});

		it("should detect self-referencing file (A -> A)", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles.length).toBe(1);
			expect(cycles[0].cycle).toContain("file1.ts");
			expect(cycles[0].description).toContain("file1.ts");
		});

		it("should detect multiple independent circular dependencies", () => {
			// Cycle 1: file1 -> file2 -> file1
			// Cycle 2: file3 -> file4 -> file3
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
				createAnalysis("file3.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file4.ts", [
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles.length).toBe(2);
		});

		it("should not report the same cycle multiple times", () => {
			// file1 -> file2 -> file3 -> file1
			// This creates one cycle, but could be detected from multiple entry points
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file3.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			// Should only report the cycle once
			expect(cycles.length).toBe(1);
		});

		it("should handle graph with both circular and non-circular dependencies", () => {
			// file1 -> file2 (no cycle)
			// file3 -> file4 -> file3 (cycle)
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
				createAnalysis("file3.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file4.ts", [
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles.length).toBe(1);
			expect(cycles[0].cycle).toContain("file3.ts");
			expect(cycles[0].cycle).toContain("file4.ts");
		});

		it("should handle empty graph", () => {
			const graph = buildDependencyGraph([]);
			const cycles = detectCircularDependencies(graph);

			expect(cycles).toEqual([]);
		});

		it("should handle graph with no dependencies", () => {
			const analyses = [
				createAnalysis("file1.ts", []),
				createAnalysis("file2.ts", []),
				createAnalysis("file3.ts", []),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles).toEqual([]);
		});

		it("should provide descriptive cycle information", () => {
			const analyses = [
				createAnalysis("fileA.ts", [
					{ importPath: "./fileB", isExternal: false, sourceFile: "fileB.ts" },
				]),
				createAnalysis("fileB.ts", [
					{ importPath: "./fileC", isExternal: false, sourceFile: "fileC.ts" },
				]),
				createAnalysis("fileC.ts", [
					{ importPath: "./fileA", isExternal: false, sourceFile: "fileA.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles.length).toBe(1);
			expect(cycles[0].description).toContain("Circular dependency detected");
			expect(cycles[0].description).toContain("fileA.ts");
			expect(cycles[0].description).toContain("fileB.ts");
			expect(cycles[0].description).toContain("fileC.ts");
			expect(cycles[0].description).toContain("→");
		});

		it("should detect circular dependency in complex diamond pattern with cycle", () => {
			//     file1
			//    /     \
			// file2   file3
			//    \     /
			//     file4
			//       |
			//     file1 (creates cycle)
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
					{ importPath: "./file3", isExternal: false, sourceFile: "file3.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file3.ts", [
					{ importPath: "./file4", isExternal: false, sourceFile: "file4.ts" },
				]),
				createAnalysis("file4.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);
			const cycles = detectCircularDependencies(graph);

			expect(cycles.length).toBeGreaterThan(0);
			// The cycle should involve file1 and file4 at minimum
			const cycle = cycles[0];
			expect(cycle.cycle).toContain("file1.ts");
			expect(cycle.cycle).toContain("file4.ts");
		});
	});

	describe("hasCircularDependencies", () => {
		it("should return false when no circular dependencies exist", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", []),
			];

			const graph = buildDependencyGraph(analyses);

			expect(hasCircularDependencies(graph)).toBe(false);
		});

		it("should return true when circular dependencies exist", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file2", isExternal: false, sourceFile: "file2.ts" },
				]),
				createAnalysis("file2.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);

			expect(hasCircularDependencies(graph)).toBe(true);
		});

		it("should return false for empty graph", () => {
			const graph = buildDependencyGraph([]);

			expect(hasCircularDependencies(graph)).toBe(false);
		});

		it("should return true for self-referencing file", () => {
			const analyses = [
				createAnalysis("file1.ts", [
					{ importPath: "./file1", isExternal: false, sourceFile: "file1.ts" },
				]),
			];

			const graph = buildDependencyGraph(analyses);

			expect(hasCircularDependencies(graph)).toBe(true);
		});
	});
});
