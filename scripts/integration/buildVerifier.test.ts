// @ts-nocheck
/**
 * Tests for Build Verifier
 */

import { describe, expect, it } from "vitest";
import { categorizeErrors, diagnoseErrors, parseTscOutput } from "./buildVerifier";
import type { BuildError } from "./types";

describe("buildVerifier", () => {
	describe("parseTscOutput", () => {
		it("should parse single error correctly", () => {
			const output = 'src/test.ts(10,5): error TS2304: Cannot find name "foo".';
			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual({
				file: "src/test.ts",
				line: 10,
				column: 5,
				message: 'Cannot find name "foo".',
				code: "TS2304",
			});
			expect(warnings).toHaveLength(0);
		});

		it("should parse multiple errors", () => {
			const output = `src/test.ts(10,5): error TS2304: Cannot find name "foo".
src/other.ts(20,15): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`;

			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(2);
			expect(errors[0].file).toBe("src/test.ts");
			expect(errors[0].code).toBe("TS2304");
			expect(errors[1].file).toBe("src/other.ts");
			expect(errors[1].code).toBe("TS2345");
			expect(warnings).toHaveLength(0);
		});

		it("should parse warnings correctly", () => {
			const output =
				'src/test.ts(10,5): warning TS6133: "unused" is declared but its value is never read.';
			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(0);
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toEqual({
				file: "src/test.ts",
				message: '"unused" is declared but its value is never read.',
			});
		});

		it("should handle mixed errors and warnings", () => {
			const output = `src/test.ts(10,5): error TS2304: Cannot find name "foo".
src/test.ts(15,3): warning TS6133: "unused" is declared but its value is never read.
src/other.ts(20,15): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`;

			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(2);
			expect(warnings).toHaveLength(1);
		});

		it("should handle empty output", () => {
			const output = "";
			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(0);
			expect(warnings).toHaveLength(0);
		});

		it("should ignore non-matching lines", () => {
			const output = `Found 2 errors.
src/test.ts(10,5): error TS2304: Cannot find name "foo".
Some other text
src/other.ts(20,15): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`;

			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(2);
			expect(warnings).toHaveLength(0);
		});

		it("should handle file paths with spaces", () => {
			const output = 'src/my file.ts(10,5): error TS2304: Cannot find name "foo".';
			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(1);
			expect(errors[0].file).toBe("src/my file.ts");
			expect(warnings).toHaveLength(0);
		});

		it("should handle complex error messages", () => {
			const output = `src/test.ts(10,5): error TS2322: Type '{ x: number; }' is not assignable to type '{ x: string; }'.`;
			const { errors, warnings } = parseTscOutput(output);

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`Type '{ x: number; }' is not assignable to type '{ x: string; }'.`,
			);
			expect(warnings).toHaveLength(0);
		});
	});

	describe("categorizeErrors", () => {
		it("should categorize type errors", () => {
			const errors: BuildError[] = [
				{
					file: "test.ts",
					line: 1,
					column: 1,
					message: "Type error",
					code: "TS2304",
				},
				{
					file: "test.ts",
					line: 2,
					column: 1,
					message: "Another type error",
					code: "TS2345",
				},
			];

			const categories = categorizeErrors(errors);

			expect(categories.has("type_error")).toBe(true);
			expect(categories.get("type_error")).toHaveLength(2);
		});

		it("should categorize module resolution errors", () => {
			const errors: BuildError[] = [
				{
					file: "test.ts",
					line: 1,
					column: 1,
					message: "Cannot find module",
					code: "TS2792",
				},
			];

			const categories = categorizeErrors(errors);

			expect(categories.has("module_resolution")).toBe(true);
			expect(categories.get("module_resolution")).toHaveLength(1);
		});

		it("should categorize import errors", () => {
			const errors: BuildError[] = [
				{
					file: "test.ts",
					line: 1,
					column: 1,
					message: "Import error",
					code: "TS1308",
				},
			];

			const categories = categorizeErrors(errors);

			expect(categories.has("import_error")).toBe(true);
		});

		it("should handle multiple categories", () => {
			const errors: BuildError[] = [
				{
					file: "test.ts",
					line: 1,
					column: 1,
					message: "Type error",
					code: "TS2304",
				},
				{
					file: "test.ts",
					line: 2,
					column: 1,
					message: "Module error",
					code: "TS2792",
				},
				{
					file: "test.ts",
					line: 3,
					column: 1,
					message: "Import error",
					code: "TS1308",
				},
			];

			const categories = categorizeErrors(errors);

			expect(categories.size).toBe(3);
			expect(categories.has("type_error")).toBe(true);
			expect(categories.has("module_resolution")).toBe(true);
			expect(categories.has("import_error")).toBe(true);
		});

		it("should handle unknown error codes", () => {
			const errors: BuildError[] = [
				{
					file: "test.ts",
					line: 1,
					column: 1,
					message: "Unknown error",
					code: "TS9999",
				},
			];

			const categories = categorizeErrors(errors);

			expect(categories.has("unknown")).toBe(true);
		});

		it("should handle errors without codes", () => {
			const errors: BuildError[] = [
				{
					file: "test.ts",
					line: 1,
					column: 1,
					message: "Error without code",
				},
			];

			const categories = categorizeErrors(errors);

			expect(categories.has("unknown")).toBe(true);
		});
	});

	describe("diagnoseErrors", () => {
		it("should return no errors for empty array", () => {
			const result = diagnoseErrors([]);

			expect(result.canAutoRecover).toBe(true);
			expect(result.suggestedFixes).toHaveLength(0);
			expect(result.errorSummary).toBe("No errors found");
		});

		it("should diagnose module resolution errors with relative paths", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 5,
					column: 10,
					message: "Cannot find module './missing' or its corresponding type declarations.",
					code: "TS2307",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(true);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("./missing");
			expect(result.suggestedFixes[0]).toContain("file may have moved");
			expect(result.errorSummary).toContain("module resolution");
		});

		it("should diagnose module resolution errors with external packages", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 1,
					column: 1,
					message: "Cannot find module 'react-router-dom' or its corresponding type declarations.",
					code: "TS2307",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(true);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("react-router-dom");
			expect(result.suggestedFixes[0]).toContain("Install missing package");
		});

		it("should diagnose module resolution errors with path aliases", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 2,
					column: 1,
					message:
						"Cannot find module '@/components/Button' or its corresponding type declarations.",
					code: "TS2307",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(true);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("@/components/Button");
			expect(result.suggestedFixes[0]).toContain("path alias");
		});

		it("should diagnose import syntax errors", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 3,
					column: 1,
					message: "'import' and 'export' may only appear at the top level.",
					code: "TS1308",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(true);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("Fix import statement syntax");
		});

		it("should diagnose default import errors", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 1,
					column: 1,
					message: 'Module can only be default-imported using the "esModuleInterop" flag.',
					code: "TS1192",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(true);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("default-imported");
		});

		it('should diagnose "cannot find name" type errors', () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 10,
					column: 5,
					message: "Cannot find name 'React'.",
					code: "TS2304",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain('Add import for "React"');
		});

		it("should diagnose type assignment errors", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 15,
					column: 10,
					message: "Type 'string' is not assignable to type 'number'.",
					code: "TS2322",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("Fix type mismatch");
		});

		it("should diagnose argument type errors", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 20,
					column: 15,
					message: "Argument of type 'string' is not assignable to parameter of type 'number'.",
					code: "TS2345",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("Fix argument type");
		});

		it("should diagnose property errors", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 25,
					column: 5,
					message: "Property 'foo' does not exist on type 'Bar'.",
					code: "TS2339",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain('Add property "foo"');
		});

		it("should diagnose JSX errors", () => {
			const errors: BuildError[] = [
				{
					file: "src/Component.tsx",
					line: 10,
					column: 5,
					message: "JSX element implicitly has type 'any'.",
					code: "TS2607",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("JSX element");
		});

		it("should diagnose syntax errors", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 5,
					column: 1,
					message: "';' expected.",
					code: "TS1005",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("Fix syntax error");
		});

		it("should handle multiple errors of different categories", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 1,
					column: 1,
					message: "Cannot find module './missing'.",
					code: "TS2307",
				},
				{
					file: "src/test.ts",
					line: 10,
					column: 5,
					message: "Cannot find name 'React'.",
					code: "TS2304",
				},
				{
					file: "src/test.ts",
					line: 15,
					column: 10,
					message: "Property 'foo' does not exist on type 'Bar'.",
					code: "TS2339",
				},
			];

			const result = diagnoseErrors(errors);

			// Should not auto-recover because type and property errors can't be auto-fixed
			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes.length).toBeGreaterThan(0);
			expect(result.errorSummary).toContain("module resolution");
			expect(result.errorSummary).toContain("type error");
			expect(result.errorSummary).toContain("property error");
		});

		it("should handle unknown error codes", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 1,
					column: 1,
					message: "Unknown error",
					code: "TS9999",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.canAutoRecover).toBe(false);
			expect(result.suggestedFixes).toHaveLength(1);
			expect(result.suggestedFixes[0]).toContain("manual review required");
		});

		it("should create proper error summary with counts", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 1,
					column: 1,
					message: "Cannot find module './a'.",
					code: "TS2307",
				},
				{
					file: "src/test.ts",
					line: 2,
					column: 1,
					message: "Cannot find module './b'.",
					code: "TS2307",
				},
				{
					file: "src/test.ts",
					line: 10,
					column: 5,
					message: "Cannot find name 'Foo'.",
					code: "TS2304",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.errorSummary).toContain("2 module resolution errors");
			expect(result.errorSummary).toContain("1 type error");
		});

		it("should handle singular vs plural in error summary", () => {
			const errors: BuildError[] = [
				{
					file: "src/test.ts",
					line: 1,
					column: 1,
					message: "Cannot find module './missing'.",
					code: "TS2307",
				},
			];

			const result = diagnoseErrors(errors);

			expect(result.errorSummary).toContain("1 module resolution error");
			expect(result.errorSummary).not.toContain("errors");
		});
	});
});
