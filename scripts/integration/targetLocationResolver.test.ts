// @ts-nocheck
/**
 * Tests for Target Location Resolver
 *
 * Validates that files are correctly mapped to their target directories
 * based on file type and characteristics.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getFullTargetPath, resolveTargetLocation } from "./targetLocationResolver";
import { FileType } from "./types";

describe("Target Location Resolver", () => {
	const testDir = join(process.cwd(), "test-temp-target-resolver");

	beforeEach(() => {
		// Create test directory
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		// Clean up test directory
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch (_error) {
			// Ignore cleanup errors
		}
	});

	describe("resolveTargetLocation", () => {
		it("should map HOOK type to src/hooks/", () => {
			const testFile = join(testDir, "useCustomHook.ts");
			writeFileSync(testFile, "export function useCustomHook() {}");

			const result = resolveTargetLocation(testFile, FileType.HOOK);
			expect(result).toBe("src/hooks/");
		});

		it("should map SERVICE type to src/services/", () => {
			const testFile = join(testDir, "apiService.ts");
			writeFileSync(testFile, "export class ApiService {}");

			const result = resolveTargetLocation(testFile, FileType.SERVICE);
			expect(result).toBe("src/services/");
		});

		it("should map UTILITY type to src/utils/", () => {
			const testFile = join(testDir, "helpers.ts");
			writeFileSync(testFile, "export function helper() {}");

			const result = resolveTargetLocation(testFile, FileType.UTILITY);
			expect(result).toBe("src/utils/");
		});

		it("should map TYPE type to src/types/", () => {
			const testFile = join(testDir, "types.ts");
			writeFileSync(testFile, "export type MyType = string;");

			const result = resolveTargetLocation(testFile, FileType.TYPE);
			expect(result).toBe("src/types/");
		});

		it("should return null for UNKNOWN type", () => {
			const testFile = join(testDir, "unknown.ts");
			writeFileSync(testFile, "// empty file");

			const result = resolveTargetLocation(testFile, FileType.UNKNOWN);
			expect(result).toBeNull();
		});
	});

	describe("Component Location Resolution", () => {
		describe("Layout Components", () => {
			it('should map components with "Layout" in name to src/layout/', () => {
				const testFile = join(testDir, "AppLayout.tsx");
				writeFileSync(testFile, "export function AppLayout() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Header component to src/layout/", () => {
				const testFile = join(testDir, "Header.tsx");
				writeFileSync(testFile, "export function Header() { return <header />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Footer component to src/layout/", () => {
				const testFile = join(testDir, "Footer.tsx");
				writeFileSync(testFile, "export function Footer() { return <footer />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Sidebar component to src/layout/", () => {
				const testFile = join(testDir, "Sidebar.tsx");
				writeFileSync(testFile, "export function Sidebar() { return <aside />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Navigation component to src/layout/", () => {
				const testFile = join(testDir, "Navigation.tsx");
				writeFileSync(testFile, "export function Navigation() { return <nav />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Nav component to src/layout/", () => {
				const testFile = join(testDir, "Nav.tsx");
				writeFileSync(testFile, "export function Nav() { return <nav />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Menu component to src/layout/", () => {
				const testFile = join(testDir, "Menu.tsx");
				writeFileSync(testFile, "export function Menu() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Wrapper component to src/layout/", () => {
				const testFile = join(testDir, "Wrapper.tsx");
				writeFileSync(testFile, "export function Wrapper() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Container component to src/layout/", () => {
				const testFile = join(testDir, "Container.tsx");
				writeFileSync(testFile, "export function Container() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map App component to src/layout/", () => {
				const testFile = join(testDir, "App.tsx");
				writeFileSync(testFile, "export function App() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should map Main component to src/layout/", () => {
				const testFile = join(testDir, "Main.tsx");
				writeFileSync(testFile, "export function Main() { return <main />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should be case-insensitive for layout patterns", () => {
				const testFile = join(testDir, "mainLayout.tsx");
				writeFileSync(testFile, "export function mainLayout() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});
		});

		describe("Feature Components", () => {
			it("should map domain-specific components to src/features/", () => {
				const testFile = join(testDir, "UserProfile.tsx");
				writeFileSync(testFile, "export function UserProfile() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/features/");
			});

			it("should map TaskList component to src/features/", () => {
				const testFile = join(testDir, "TaskList.tsx");
				writeFileSync(testFile, "export function TaskList() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/features/");
			});

			it("should map Dashboard component to src/features/", () => {
				const testFile = join(testDir, "Dashboard.tsx");
				writeFileSync(testFile, "export function Dashboard() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/features/");
			});

			it("should map components with multiple words to src/features/", () => {
				const testFile = join(testDir, "UserProfileCard.tsx");
				writeFileSync(testFile, "export function UserProfileCard() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/features/");
			});

			it("should default to src/features/ for ambiguous components", () => {
				const testFile = join(testDir, "SomeComponent.tsx");
				writeFileSync(testFile, "export function SomeComponent() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/features/");
			});
		});

		describe("Edge Cases", () => {
			it("should handle components with layout in the middle of name", () => {
				const testFile = join(testDir, "UserLayoutSettings.tsx");
				writeFileSync(testFile, "export function UserLayoutSettings() { return <div />; }");

				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/layout/");
			});

			it("should handle parsing errors gracefully", () => {
				const testFile = join(testDir, "InvalidSyntax.tsx");
				writeFileSync(testFile, "export function InvalidSyntax() { return <div> }"); // Invalid JSX

				// Should not throw and should default to features
				const result = resolveTargetLocation(testFile, FileType.COMPONENT);
				expect(result).toBe("src/features/");
			});
		});
	});

	describe("getFullTargetPath", () => {
		it("should return full path with directory and filename for HOOK", () => {
			const testFile = join(testDir, "useCustomHook.ts");
			writeFileSync(testFile, "export function useCustomHook() {}");

			const result = getFullTargetPath(testFile, FileType.HOOK);
			expect(result).toBe("src/hooks/useCustomHook.ts");
		});

		it("should return full path for SERVICE", () => {
			const testFile = join(testDir, "apiService.ts");
			writeFileSync(testFile, "export class ApiService {}");

			const result = getFullTargetPath(testFile, FileType.SERVICE);
			expect(result).toBe("src/services/apiService.ts");
		});

		it("should return full path for layout component", () => {
			const testFile = join(testDir, "Header.tsx");
			writeFileSync(testFile, "export function Header() { return <header />; }");

			const result = getFullTargetPath(testFile, FileType.COMPONENT);
			expect(result).toBe("src/layout/Header.tsx");
		});

		it("should return full path for feature component", () => {
			const testFile = join(testDir, "UserProfile.tsx");
			writeFileSync(testFile, "export function UserProfile() { return <div />; }");

			const result = getFullTargetPath(testFile, FileType.COMPONENT);
			expect(result).toBe("src/features/UserProfile.tsx");
		});

		it("should return null for UNKNOWN type", () => {
			const testFile = join(testDir, "unknown.ts");
			writeFileSync(testFile, "// empty");

			const result = getFullTargetPath(testFile, FileType.UNKNOWN);
			expect(result).toBeNull();
		});

		it("should preserve file extension in target path", () => {
			const testFile = join(testDir, "helpers.tsx");
			writeFileSync(testFile, "export function helper() {}");

			const result = getFullTargetPath(testFile, FileType.UTILITY);
			expect(result).toBe("src/utils/helpers.tsx");
		});
	});
});
