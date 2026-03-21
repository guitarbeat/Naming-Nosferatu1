import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const PROJECT_ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SOURCE_ROOTS = ["src", "shared"];
const EXCLUDED_FILE_PATTERNS = [/\.test\.[jt]sx?$/u, /\.d\.ts$/u];

function normalizePath(filePath: string): string {
	return path.resolve(filePath);
}

function shouldIncludeFile(filePath: string): boolean {
	const extension = path.extname(filePath);
	if (!SOURCE_EXTENSIONS.has(extension)) {
		return false;
	}

	return !EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function collectProjectFiles(
	projectRoot = PROJECT_ROOT,
	sourceRoots = SOURCE_ROOTS,
): string[] {
	const files: string[] = [];

	for (const sourceRoot of sourceRoots) {
		const rootPath = path.join(projectRoot, sourceRoot);
		if (!fs.existsSync(rootPath)) {
			continue;
		}

		const stack = [rootPath];
		while (stack.length > 0) {
			const currentPath = stack.pop();
			if (!currentPath) {
				continue;
			}

			for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
				const fullPath = path.join(currentPath, entry.name);
				if (entry.isDirectory()) {
					stack.push(fullPath);
					continue;
				}

				if (shouldIncludeFile(fullPath)) {
					files.push(normalizePath(fullPath));
				}
			}
		}
	}

	return files.sort();
}

export function extractImportSpecifiers(filePath: string): string[] {
	const content = fs.readFileSync(filePath, "utf8");
	const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
	const importSpecifiers = new Set<string>();

	function visit(node: ts.Node) {
		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			importSpecifiers.add(node.moduleSpecifier.text);
		}

		if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			importSpecifiers.add(node.moduleSpecifier.text);
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	return [...importSpecifiers];
}

function resolveFileCandidate(basePath: string, knownFiles: Set<string>): string | null {
	const normalizedBasePath = normalizePath(basePath);
	const candidates = [
		normalizedBasePath,
		...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map(
			(extension) => `${normalizedBasePath}${extension}`,
		),
		...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((extension) =>
			path.join(normalizedBasePath, `index${extension}`),
		),
	];

	for (const candidate of candidates) {
		if (knownFiles.has(candidate)) {
			return candidate;
		}
	}

	return null;
}

function resolveAliasImport(
	importPath: string,
	projectRoot: string,
	knownFiles: Set<string>,
): string | null {
	if (importPath.startsWith("@/")) {
		return resolveFileCandidate(path.join(projectRoot, "src", importPath.slice(2)), knownFiles);
	}

	if (importPath === "@supabase/client") {
		return resolveFileCandidate(
			path.join(projectRoot, "src", "services", "supabase", "client"),
			knownFiles,
		);
	}

	if (importPath === "@supabase/types") {
		return resolveFileCandidate(path.join(projectRoot, "supabase", "types"), knownFiles);
	}

	if (importPath === "@db" || importPath.startsWith("@db/")) {
		const relativePath = importPath === "@db" ? "" : importPath.slice(4);
		return resolveFileCandidate(path.join(projectRoot, "supabase", relativePath), knownFiles);
	}

	return null;
}

export function resolveInternalImport(
	importPath: string,
	currentFilePath: string,
	projectRoot: string,
	knownFiles: Set<string>,
): string | null {
	if (importPath.startsWith(".")) {
		return resolveFileCandidate(
			path.resolve(path.dirname(currentFilePath), importPath),
			knownFiles,
		);
	}

	return resolveAliasImport(importPath, projectRoot, knownFiles);
}

export function buildDependencyGraph(
	files: string[],
	projectRoot = PROJECT_ROOT,
): Map<string, string[]> {
	const knownFiles = new Set(files.map(normalizePath));
	const graph = new Map<string, string[]>();

	for (const filePath of files) {
		const dependencies = new Set<string>();
		for (const importPath of extractImportSpecifiers(filePath)) {
			const resolvedImport = resolveInternalImport(importPath, filePath, projectRoot, knownFiles);
			if (resolvedImport && resolvedImport !== filePath) {
				dependencies.add(resolvedImport);
			}
		}

		graph.set(filePath, [...dependencies].sort());
	}

	return graph;
}

export function detectCircularDependencies(graph: Map<string, string[]>): string[][] {
	const cycles: string[][] = [];
	const visited = new Set<string>();
	const inStack = new Set<string>();
	const pathStack: string[] = [];
	const seenCycles = new Set<string>();

	function visit(filePath: string) {
		visited.add(filePath);
		inStack.add(filePath);
		pathStack.push(filePath);

		for (const dependency of graph.get(filePath) ?? []) {
			if (!visited.has(dependency)) {
				visit(dependency);
				continue;
			}

			if (!inStack.has(dependency)) {
				continue;
			}

			const cycleStartIndex = pathStack.indexOf(dependency);
			if (cycleStartIndex === -1) {
				continue;
			}

			const cycle = [...pathStack.slice(cycleStartIndex), dependency];
			const cycleKey = [...new Set(cycle)].sort().join("|");
			if (!seenCycles.has(cycleKey)) {
				seenCycles.add(cycleKey);
				cycles.push(cycle);
			}
		}

		pathStack.pop();
		inStack.delete(filePath);
	}

	for (const filePath of [...graph.keys()].sort()) {
		if (!visited.has(filePath)) {
			visit(filePath);
		}
	}

	return cycles;
}

function formatCycle(cycle: string[], projectRoot: string): string {
	return cycle
		.map((filePath) => path.relative(projectRoot, filePath).replace(/\\/g, "/"))
		.join(" -> ");
}

export function runCircularDependencyCheck(
	projectRoot = PROJECT_ROOT,
	sourceRoots = SOURCE_ROOTS,
): { files: string[]; graph: Map<string, string[]>; cycles: string[][] } {
	const files = collectProjectFiles(projectRoot, sourceRoots);
	const graph = buildDependencyGraph(files, projectRoot);
	const cycles = detectCircularDependencies(graph);
	return { files, graph, cycles };
}

function runFromCli() {
	const { files, cycles } = runCircularDependencyCheck();

	if (cycles.length > 0) {
		console.error("Circular dependency check failed.");
		console.error("");
		for (const [index, cycle] of cycles.entries()) {
			console.error(`Cycle ${index + 1}: ${formatCycle(cycle, PROJECT_ROOT)}`);
		}
		process.exit(1);
	}

	console.log(`No circular dependencies found across ${files.length} source files.`);
}

const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (scriptPath === invokedPath) {
	runFromCli();
}
