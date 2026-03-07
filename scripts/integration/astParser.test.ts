// @ts-nocheck
/**
 * Tests for AST Parser
 *
 * Tests the TypeScript Compiler API-based parser for extracting
 * imports, exports, and file structure information.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	extractExports,
	extractImports,
	hasJSXContent,
	importsToDependencies,
	parseFile,
} from "./astParser";

// Test directory for temporary files
const TEST_DIR = join(process.cwd(), "test-temp-ast");

// Setup and cleanup
function setupTestDir() {
	try {
		mkdirSync(TEST_DIR, { recursive: true });
	} catch (_e) {
		// Directory might already exist
	}
}

function cleanupTestDir() {
	try {
		rmSync(TEST_DIR, { recursive: true, force: true });
	} catch (_e) {
		// Directory might not exist
	}
}

function createTestFile(filename: string, content: string): string {
	setupTestDir();
	const filePath = join(TEST_DIR, filename);
	writeFileSync(filePath, content, "utf-8");
	return filePath;
}

describe("AST Parser", () => {
	describe("parseFile", () => {
		it("should parse a simple file with imports and exports", () => {
			const content = `
import React from 'react';
import { useState } from 'react';

export function MyComponent() {
  return <div>Hello</div>;
}

export const myConst = 42;
`;
			const filePath = createTestFile("simple.tsx", content);

			const result = parseFile(filePath);

			expect(result.imports).toContain("react");
			expect(result.exports).toHaveLength(2);
			expect(result.exports.some((e) => e.name === "MyComponent" && e.type === "function")).toBe(
				true,
			);
			expect(result.exports.some((e) => e.name === "myConst" && e.type === "const")).toBe(true);
			expect(result.hasJSX).toBe(true);

			cleanupTestDir();
		});

		it("should extract relative imports", () => {
			const content = `
import { helper } from './utils/helper';
import type { MyType } from '../types';
import config from '../../config';
`;
			const filePath = createTestFile("relative-imports.ts", content);

			const result = parseFile(filePath);

			expect(result.imports).toContain("./utils/helper");
			expect(result.imports).toContain("../types");
			expect(result.imports).toContain("../../config");
			expect(result.imports).toHaveLength(3);

			cleanupTestDir();
		});

		it("should extract external package imports", () => {
			const content = `
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
`;
			const filePath = createTestFile("external-imports.ts", content);

			const result = parseFile(filePath);

			expect(result.imports).toContain("react");
			expect(result.imports).toContain("@tanstack/react-query");
			expect(result.imports).toContain("axios");
			expect(result.imports).toHaveLength(3);

			cleanupTestDir();
		});

		it("should extract function exports", () => {
			const content = `
export function namedFunction() {
  return 'hello';
}

export const arrowFunction = () => {
  return 'world';
};

export default function defaultFunction() {
  return 'default';
}
`;
			const filePath = createTestFile("function-exports.ts", content);

			const result = parseFile(filePath);

			expect(
				result.exports.some(
					(e) => e.name === "namedFunction" && e.type === "function" && !e.isDefault,
				),
			).toBe(true);
			expect(
				result.exports.some(
					(e) => e.name === "arrowFunction" && e.type === "const" && !e.isDefault,
				),
			).toBe(true);
			expect(
				result.exports.some(
					(e) => e.name === "defaultFunction" && e.type === "function" && e.isDefault,
				),
			).toBe(true);

			cleanupTestDir();
		});

		it("should extract class exports", () => {
			const content = `
export class MyClass {
  constructor() {}
}

export default class DefaultClass {
  method() {}
}
`;
			const filePath = createTestFile("class-exports.ts", content);

			const result = parseFile(filePath);

			expect(
				result.exports.some((e) => e.name === "MyClass" && e.type === "class" && !e.isDefault),
			).toBe(true);
			expect(
				result.exports.some((e) => e.name === "DefaultClass" && e.type === "class" && e.isDefault),
			).toBe(true);

			cleanupTestDir();
		});

		it("should extract type and interface exports", () => {
			const content = `
export type MyType = {
  id: number;
  name: string;
};

export interface MyInterface {
  value: string;
}
`;
			const filePath = createTestFile("type-exports.ts", content);

			const result = parseFile(filePath);

			expect(result.exports.some((e) => e.name === "MyType" && e.type === "type")).toBe(true);
			expect(result.exports.some((e) => e.name === "MyInterface" && e.type === "interface")).toBe(
				true,
			);

			cleanupTestDir();
		});

		it("should detect JSX in TSX files", () => {
			const content = `
import React from 'react';

export function Component() {
  return (
    <div>
      <h1>Title</h1>
      <p>Content</p>
    </div>
  );
}
`;
			const filePath = createTestFile("jsx-component.tsx", content);

			const result = parseFile(filePath);

			expect(result.hasJSX).toBe(true);

			cleanupTestDir();
		});

		it("should not detect JSX in regular TS files", () => {
			const content = `
export function helper(x: number): number {
  return x * 2;
}
`;
			const filePath = createTestFile("no-jsx.ts", content);

			const result = parseFile(filePath);

			expect(result.hasJSX).toBe(false);

			cleanupTestDir();
		});

		it("should handle files with no imports or exports", () => {
			const content = `
const internal = 42;

function helper() {
  return internal;
}
`;
			const filePath = createTestFile("no-exports.ts", content);

			const result = parseFile(filePath);

			expect(result.imports).toHaveLength(0);
			expect(result.exports).toHaveLength(0);
			expect(result.hasJSX).toBe(false);

			cleanupTestDir();
		});

		it("should handle re-exports", () => {
			const content = `
export { foo, bar } from './other-module';
export * from './another-module';
`;
			const filePath = createTestFile("re-exports.ts", content);

			const result = parseFile(filePath);

			expect(result.imports).toContain("./other-module");
			expect(result.imports).toContain("./another-module");

			cleanupTestDir();
		});
	});

	describe("extractImports", () => {
		it("should extract all import paths", () => {
			const content = `
import React from 'react';
import { helper } from './utils';
import type { Type } from '../types';
`;
			const filePath = createTestFile("extract-imports.ts", content);

			const imports = extractImports(filePath);

			expect(imports).toContain("react");
			expect(imports).toContain("./utils");
			expect(imports).toContain("../types");
			expect(imports).toHaveLength(3);

			cleanupTestDir();
		});
	});

	describe("extractExports", () => {
		it("should extract all exports", () => {
			const content = `
export function func() {}
export const value = 42;
export type MyType = string;
`;
			const filePath = createTestFile("extract-exports.ts", content);

			const exports = extractExports(filePath);

			expect(exports).toHaveLength(3);
			expect(exports.some((e) => e.name === "func")).toBe(true);
			expect(exports.some((e) => e.name === "value")).toBe(true);
			expect(exports.some((e) => e.name === "MyType")).toBe(true);

			cleanupTestDir();
		});
	});

	describe("hasJSXContent", () => {
		it("should return true for files with JSX", () => {
			const content = `
export function Component() {
  return <div>Hello</div>;
}
`;
			const filePath = createTestFile("has-jsx.tsx", content);

			expect(hasJSXContent(filePath)).toBe(true);

			cleanupTestDir();
		});

		it("should return false for files without JSX", () => {
			const content = `
export function helper() {
  return 42;
}
`;
			const filePath = createTestFile("no-jsx.ts", content);

			expect(hasJSXContent(filePath)).toBe(false);

			cleanupTestDir();
		});
	});

	describe("importsToDependencies", () => {
		it("should classify external vs internal imports", () => {
			const imports = [
				"react",
				"@tanstack/react-query",
				"./utils/helper",
				"../types",
				"../../config",
			];

			const deps = importsToDependencies(imports);

			expect(deps).toHaveLength(5);

			// External packages
			expect(deps.find((d) => d.importPath === "react")?.isExternal).toBe(true);
			expect(deps.find((d) => d.importPath === "@tanstack/react-query")?.isExternal).toBe(true);

			// Internal modules
			expect(deps.find((d) => d.importPath === "./utils/helper")?.isExternal).toBe(false);
			expect(deps.find((d) => d.importPath === "../types")?.isExternal).toBe(false);
			expect(deps.find((d) => d.importPath === "../../config")?.isExternal).toBe(false);

			// All should start as unresolved
			deps.forEach((dep) => {
				expect(dep.isResolved).toBe(false);
			});
		});
	});
});
