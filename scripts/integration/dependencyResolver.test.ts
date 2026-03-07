// @ts-nocheck
/**
 * Tests for Dependency Resolver
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	checkExternalDependency,
	classifyDependency,
	getExternalDependencies,
	getInternalDependencies,
	getUnresolvedDependencies,
	resolveDependencies,
	resolveInternalModule,
} from "./dependencyResolver";
import type { Dependency } from "./types";

describe("dependencyResolver", () => {
	const testDir = join(__dirname, "__test_dependency_resolver__");

	beforeEach(() => {
		// Create test directory structure
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
		mkdirSync(testDir, { recursive: true });

		// Create a mock project structure
		mkdirSync(join(testDir, "src"), { recursive: true });
		mkdirSync(join(testDir, "src", "utils"), { recursive: true });
		mkdirSync(join(testDir, "src", "types"), { recursive: true });
		mkdirSync(join(testDir, "node_modules"), { recursive: true });
		mkdirSync(join(testDir, "node_modules", "react"), { recursive: true });
		mkdirSync(join(testDir, "node_modules", "@types"), { recursive: true });
		mkdirSync(join(testDir, "node_modules", "@types", "node"), {
			recursive: true,
		});

		// Create some test files
		writeFileSync(join(testDir, "src", "utils", "helper.ts"), "export const helper = () => {};");
		writeFileSync(join(testDir, "src", "types", "index.ts"), "export type MyType = string;");
		writeFileSync(join(testDir, "src", "component.tsx"), "export const Component = () => {};");
	});

	afterEach(() => {
		// Clean up test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("classifyDependency", () => {
		it("should classify relative imports as internal", () => {
			expect(classifyDependency("./utils")).toBe(false);
			expect(classifyDependency("../types")).toBe(false);
			expect(classifyDependency("./component")).toBe(false);
		});

		it("should classify absolute imports as internal", () => {
			expect(classifyDependency("/src/utils")).toBe(false);
		});

		it("should classify package names as external", () => {
			expect(classifyDependency("react")).toBe(true);
			expect(classifyDependency("lodash")).toBe(true);
			expect(classifyDependency("@types/node")).toBe(true);
		});
	});

	describe("checkExternalDependency", () => {
		it("should return true for packages that exist in node_modules", () => {
			expect(checkExternalDependency("react", testDir)).toBe(true);
			expect(checkExternalDependency("@types/node", testDir)).toBe(true);
		});

		it("should return false for packages that do not exist", () => {
			expect(checkExternalDependency("nonexistent-package", testDir)).toBe(false);
			expect(checkExternalDependency("@types/nonexistent", testDir)).toBe(false);
		});

		it("should handle scoped packages correctly", () => {
			expect(checkExternalDependency("@types/node", testDir)).toBe(true);
			expect(checkExternalDependency("@types/node/fs", testDir)).toBe(true);
		});
	});

	describe("resolveInternalModule", () => {
		const currentFile = join(testDir, "src", "component.tsx");

		it("should resolve relative imports with .ts extension", () => {
			const resolved = resolveInternalModule("./utils/helper", currentFile, testDir);
			expect(resolved).toBe(join(testDir, "src", "utils", "helper.ts"));
		});

		it("should resolve relative imports with index file", () => {
			const resolved = resolveInternalModule("./types", currentFile, testDir);
			expect(resolved).toBe(join(testDir, "src", "types", "index.ts"));
		});

		it("should return null for non-existent modules", () => {
			const resolved = resolveInternalModule("./nonexistent", currentFile, testDir);
			expect(resolved).toBe(null);
		});

		it("should handle imports with explicit extensions", () => {
			const resolved = resolveInternalModule("./utils/helper.ts", currentFile, testDir);
			expect(resolved).toBe(join(testDir, "src", "utils", "helper.ts"));
		});

		it("should try multiple extensions", () => {
			// Create a .tsx file
			writeFileSync(join(testDir, "src", "another.tsx"), "export const Another = () => {};");
			const resolved = resolveInternalModule("./another", currentFile, testDir);
			expect(resolved).toBe(join(testDir, "src", "another.tsx"));
		});
	});

	describe("resolveDependencies", () => {
		const currentFile = join(testDir, "src", "component.tsx");

		it("should resolve external dependencies", () => {
			const deps: Dependency[] = [
				{ importPath: "react", isExternal: true, isResolved: false },
				{ importPath: "nonexistent", isExternal: true, isResolved: false },
			];

			const resolved = resolveDependencies(deps, currentFile, testDir);

			expect(resolved[0].isResolved).toBe(true);
			expect(resolved[1].isResolved).toBe(false);
		});

		it("should resolve internal dependencies", () => {
			const deps: Dependency[] = [
				{ importPath: "./utils/helper", isExternal: false, isResolved: false },
				{ importPath: "./nonexistent", isExternal: false, isResolved: false },
			];

			const resolved = resolveDependencies(deps, currentFile, testDir);

			expect(resolved[0].isResolved).toBe(true);
			expect(resolved[0].sourceFile).toBe(join(testDir, "src", "utils", "helper.ts"));
			expect(resolved[1].isResolved).toBe(false);
			expect(resolved[1].sourceFile).toBeUndefined();
		});

		it("should handle mixed dependencies", () => {
			const deps: Dependency[] = [
				{ importPath: "react", isExternal: true, isResolved: false },
				{ importPath: "./utils/helper", isExternal: false, isResolved: false },
				{ importPath: "nonexistent", isExternal: true, isResolved: false },
				{ importPath: "./missing", isExternal: false, isResolved: false },
			];

			const resolved = resolveDependencies(deps, currentFile, testDir);

			expect(resolved[0].isResolved).toBe(true);
			expect(resolved[1].isResolved).toBe(true);
			expect(resolved[2].isResolved).toBe(false);
			expect(resolved[3].isResolved).toBe(false);
		});
	});

	describe("getUnresolvedDependencies", () => {
		it("should filter unresolved dependencies", () => {
			const deps: Dependency[] = [
				{ importPath: "react", isExternal: true, isResolved: true },
				{ importPath: "missing", isExternal: true, isResolved: false },
				{ importPath: "./helper", isExternal: false, isResolved: true },
				{ importPath: "./missing", isExternal: false, isResolved: false },
			];

			const unresolved = getUnresolvedDependencies(deps);

			expect(unresolved).toHaveLength(2);
			expect(unresolved[0].importPath).toBe("missing");
			expect(unresolved[1].importPath).toBe("./missing");
		});
	});

	describe("getExternalDependencies", () => {
		it("should filter external dependencies", () => {
			const deps: Dependency[] = [
				{ importPath: "react", isExternal: true, isResolved: true },
				{ importPath: "./helper", isExternal: false, isResolved: true },
				{ importPath: "lodash", isExternal: true, isResolved: false },
			];

			const external = getExternalDependencies(deps);

			expect(external).toHaveLength(2);
			expect(external[0].importPath).toBe("react");
			expect(external[1].importPath).toBe("lodash");
		});
	});

	describe("getInternalDependencies", () => {
		it("should filter internal dependencies", () => {
			const deps: Dependency[] = [
				{ importPath: "react", isExternal: true, isResolved: true },
				{ importPath: "./helper", isExternal: false, isResolved: true },
				{ importPath: "../types", isExternal: false, isResolved: false },
			];

			const internal = getInternalDependencies(deps);

			expect(internal).toHaveLength(2);
			expect(internal[0].importPath).toBe("./helper");
			expect(internal[1].importPath).toBe("../types");
		});
	});

	describe("edge cases", () => {
		it("should handle empty dependency arrays", () => {
			const currentFile = join(testDir, "src", "component.tsx");
			const resolved = resolveDependencies([], currentFile, testDir);
			expect(resolved).toEqual([]);
		});

		it("should handle dependencies with deep paths", () => {
			const currentFile = join(testDir, "src", "component.tsx");
			const deps: Dependency[] = [
				{
					importPath: "react/jsx-runtime",
					isExternal: true,
					isResolved: false,
				},
			];

			const resolved = resolveDependencies(deps, currentFile, testDir);
			expect(resolved[0].isResolved).toBe(true);
		});

		it("should handle parent directory imports", () => {
			const currentFile = join(testDir, "src", "utils", "helper.ts");
			writeFileSync(join(testDir, "src", "config.ts"), "export const config = {};");

			const deps: Dependency[] = [
				{ importPath: "../config", isExternal: false, isResolved: false },
			];

			const resolved = resolveDependencies(deps, currentFile, testDir);
			expect(resolved[0].isResolved).toBe(true);
			expect(resolved[0].sourceFile).toBe(join(testDir, "src", "config.ts"));
		});
	});
});
