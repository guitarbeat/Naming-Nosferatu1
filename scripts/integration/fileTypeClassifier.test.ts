// @ts-nocheck
/**
 * Tests for File Type Classifier
 *
 * Tests the classification of TypeScript/JavaScript files into:
 * - React components
 * - Custom hooks
 * - Services
 * - Utilities
 * - Type definitions
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { classifyFile } from "./fileTypeClassifier";
import { FileType } from "./types";

// Test directory for temporary files
const TEST_DIR = join(process.cwd(), "test-temp-classifier");

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

describe("File Type Classifier", () => {
	beforeEach(() => {
		setupTestDir();
	});

	afterEach(() => {
		cleanupTestDir();
	});

	describe("React Components", () => {
		it("should classify TSX file with JSX and component export as COMPONENT", () => {
			const content = `
import React from 'react';

export function MyComponent() {
  return <div>Hello World</div>;
}
`;
			const filePath = createTestFile("MyComponent.tsx", content);

			expect(classifyFile(filePath)).toBe(FileType.COMPONENT);
		});

		it("should classify TSX file with JSX and default export as COMPONENT", () => {
			const content = `
import React from 'react';

export default function Component() {
  return (
    <div>
      <h1>Title</h1>
      <p>Content</p>
    </div>
  );
}
`;
			const filePath = createTestFile("Component.tsx", content);

			expect(classifyFile(filePath)).toBe(FileType.COMPONENT);
		});

		it("should classify TSX file with JSX and arrow function component as COMPONENT", () => {
			const content = `
import React from 'react';

export const Button = () => {
  return <button>Click me</button>;
};
`;
			const filePath = createTestFile("Button.tsx", content);

			expect(classifyFile(filePath)).toBe(FileType.COMPONENT);
		});

		it("should classify TSX file with JSX and class component as COMPONENT", () => {
			const content = `
import React from 'react';

export class MyComponent extends React.Component {
  render() {
    return <div>Hello</div>;
  }
}
`;
			const filePath = createTestFile("MyComponent.tsx", content);

			expect(classifyFile(filePath)).toBe(FileType.COMPONENT);
		});

		it("should NOT classify TSX file without JSX as COMPONENT", () => {
			const content = `
export function helper() {
  return 42;
}
`;
			const filePath = createTestFile("helper.tsx", content);

			expect(classifyFile(filePath)).not.toBe(FileType.COMPONENT);
		});

		it("should NOT classify TS file with JSX-like code as COMPONENT", () => {
			const content = `
export function createJSX() {
  return "const element = <div>Hello</div>";
}
`;
			const filePath = createTestFile("helper.ts", content);

			expect(classifyFile(filePath)).not.toBe(FileType.COMPONENT);
		});

		it("should NOT classify TSX file with JSX but no exports as COMPONENT", () => {
			const content = `
import React from 'react';

function InternalComponent() {
  return <div>Internal</div>;
}
`;
			const filePath = createTestFile("internal.tsx", content);

			expect(classifyFile(filePath)).not.toBe(FileType.COMPONENT);
		});
	});

	describe("Custom Hooks", () => {
		it('should classify file starting with "use" and exporting function as HOOK', () => {
			const content = `
import { useState } from 'react';

export function useCounter() {
  const [count, setCount] = useState(0);
  return { count, setCount };
}
`;
			const filePath = createTestFile("useCounter.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.HOOK);
		});

		it('should classify file starting with "use" and exporting arrow function as HOOK', () => {
			const content = `
export const useLocalStorage = (key: string) => {
  // Hook implementation
  return [null, () => {}];
};
`;
			const filePath = createTestFile("useLocalStorage.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.HOOK);
		});

		it('should classify file starting with "use" with default export as HOOK', () => {
			const content = `
import { useEffect } from 'react';

export default function useWindowSize() {
  useEffect(() => {}, []);
  return { width: 0, height: 0 };
}
`;
			const filePath = createTestFile("useWindowSize.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.HOOK);
		});

		it('should NOT classify file starting with "use" but no function exports as HOOK', () => {
			const content = `
export type UseCounterReturn = {
  count: number;
  increment: () => void;
};
`;
			const filePath = createTestFile("useCounter.ts", content);

			expect(classifyFile(filePath)).not.toBe(FileType.HOOK);
		});

		it('should NOT classify file not starting with "use" as HOOK', () => {
			const content = `
export function counter() {
  return { count: 0 };
}
`;
			const filePath = createTestFile("counter.ts", content);

			expect(classifyFile(filePath)).not.toBe(FileType.HOOK);
		});

		it('should be case-sensitive for "use" prefix', () => {
			const content = `
export function UseCounter() {
  return { count: 0 };
}
`;
			const filePath = createTestFile("UseCounter.ts", content);

			// Should NOT be classified as HOOK because "Use" is capitalized
			expect(classifyFile(filePath)).not.toBe(FileType.HOOK);
		});
	});

	describe("Type Definitions", () => {
		it("should classify file with only type exports as TYPE", () => {
			const content = `
export type User = {
  id: number;
  name: string;
};

export type Post = {
  id: number;
  title: string;
};
`;
			const filePath = createTestFile("types.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.TYPE);
		});

		it("should classify file with only interface exports as TYPE", () => {
			const content = `
export interface IUser {
  id: number;
  name: string;
}

export interface IPost {
  id: number;
  title: string;
}
`;
			const filePath = createTestFile("interfaces.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.TYPE);
		});

		it("should classify file with mixed type and interface exports as TYPE", () => {
			const content = `
export type UserId = number;

export interface User {
  id: UserId;
  name: string;
}

export type UserRole = 'admin' | 'user';
`;
			const filePath = createTestFile("userTypes.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.TYPE);
		});

		it("should NOT classify file with types and functions as TYPE", () => {
			const content = `
export type User = {
  id: number;
  name: string;
};

export function createUser(): User {
  return { id: 1, name: 'Test' };
}
`;
			const filePath = createTestFile("user.ts", content);

			expect(classifyFile(filePath)).not.toBe(FileType.TYPE);
		});

		it("should NOT classify file with no exports as TYPE", () => {
			const content = `
type InternalType = {
  value: string;
};
`;
			const filePath = createTestFile("internal.ts", content);

			expect(classifyFile(filePath)).not.toBe(FileType.TYPE);
		});
	});

	describe("Services", () => {
		it('should classify file with "service" in name as SERVICE', () => {
			const content = `
export class UserService {
  getUser(id: number) {
    return { id, name: 'User' };
  }
}
`;
			const filePath = createTestFile("userService.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.SERVICE);
		});

		it('should classify file with "api" in name as SERVICE', () => {
			const content = `
export const api = {
  fetchUsers: () => fetch('/users'),
  fetchPosts: () => fetch('/posts')
};
`;
			const filePath = createTestFile("api.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.SERVICE);
		});

		it('should classify file with "client" in name as SERVICE', () => {
			const content = `
export class ApiClient {
  async get(url: string) {
    return fetch(url);
  }
}
`;
			const filePath = createTestFile("apiClient.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.SERVICE);
		});

		it("should be case-insensitive for service naming", () => {
			const content = `
export function fetchData() {
  return fetch('/data');
}
`;
			const filePath = createTestFile("DataService.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.SERVICE);
		});

		it("should NOT classify file with service name but no exports as SERVICE", () => {
			const content = `
class InternalService {
  doSomething() {}
}
`;
			const filePath = createTestFile("internalService.ts", content);

			expect(classifyFile(filePath)).not.toBe(FileType.SERVICE);
		});
	});

	describe("Utilities", () => {
		it("should classify file with utility functions as UTILITY", () => {
			const content = `
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(str: string): Date {
  return new Date(str);
}
`;
			const filePath = createTestFile("dateUtils.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.UTILITY);
		});

		it("should classify file with exported constants as UTILITY", () => {
			const content = `
export const MAX_RETRIES = 3;
export const TIMEOUT = 5000;
export const API_URL = 'https://api.example.com';
`;
			const filePath = createTestFile("constants.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.UTILITY);
		});

		it("should classify file with utility class as UTILITY", () => {
			const content = `
export class StringUtils {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
`;
			const filePath = createTestFile("stringUtils.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.UTILITY);
		});

		it("should classify file with mixed exports as UTILITY", () => {
			const content = `
export const CONFIG = { timeout: 5000 };

export function retry(fn: () => void, times: number) {
  // Retry logic
}

export class Logger {
  log(message: string) {
    console.log(message);
  }
}
`;
			const filePath = createTestFile("helpers.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.UTILITY);
		});
	});

	describe("Unknown Files", () => {
		it("should classify file with no exports as UNKNOWN", () => {
			const content = `
const internal = 42;

function helper() {
  return internal;
}
`;
			const filePath = createTestFile("internal.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.UNKNOWN);
		});

		it("should classify empty file as UNKNOWN", () => {
			const content = "";
			const filePath = createTestFile("empty.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.UNKNOWN);
		});

		it("should classify file with only comments as UNKNOWN", () => {
			const content = `
// This is a comment
/* This is a block comment */
`;
			const filePath = createTestFile("comments.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.UNKNOWN);
		});
	});

	describe("Priority and Edge Cases", () => {
		it('should prioritize HOOK over UTILITY for files starting with "use"', () => {
			const content = `
export function useHelper() {
  return { value: 42 };
}
`;
			const filePath = createTestFile("useHelper.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.HOOK);
		});

		it("should prioritize COMPONENT over UTILITY for TSX files with JSX", () => {
			const content = `
export const Component = () => <div>Hello</div>;
`;
			const filePath = createTestFile("Component.tsx", content);

			expect(classifyFile(filePath)).toBe(FileType.COMPONENT);
		});

		it("should prioritize TYPE over UTILITY for files with only types", () => {
			const content = `
export type Config = {
  timeout: number;
};
`;
			const filePath = createTestFile("config.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.TYPE);
		});

		it("should prioritize SERVICE over UTILITY for files with service naming", () => {
			const content = `
export function fetchData() {
  return fetch('/data');
}
`;
			const filePath = createTestFile("dataService.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.SERVICE);
		});

		it("should handle files with multiple classification criteria", () => {
			// A file that could be both a service and utility
			// Service should win due to naming
			const content = `
export function formatUrl(url: string): string {
  return url;
}
`;
			const filePath = createTestFile("urlService.ts", content);

			expect(classifyFile(filePath)).toBe(FileType.SERVICE);
		});
	});
});
