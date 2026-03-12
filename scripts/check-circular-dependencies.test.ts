import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	buildDependencyGraph,
	collectProjectFiles,
	detectCircularDependencies,
	runCircularDependencyCheck,
} from "./check-circular-dependencies";

function createTempProject(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "cycle-check-"));
}

function writeFile(projectRoot: string, relativePath: string, content: string) {
	const fullPath = path.join(projectRoot, relativePath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content, "utf8");
}

describe("check-circular-dependencies", () => {
	const tempProjects: string[] = [];

	afterEach(() => {
		for (const projectRoot of tempProjects.splice(0)) {
			fs.rmSync(projectRoot, { recursive: true, force: true });
		}
	});

	it("collects only source files from supported roots", () => {
		const projectRoot = createTempProject();
		tempProjects.push(projectRoot);

		writeFile(projectRoot, "src/app/main.tsx", "export default null;");
		writeFile(projectRoot, "server/index.ts", "export {};");
		writeFile(projectRoot, "shared/schema.ts", "export {};");
		writeFile(projectRoot, "src/app/main.test.tsx", "export default null;");

		const files = collectProjectFiles(projectRoot);

		expect(files.map((filePath) => path.relative(projectRoot, filePath).replace(/\\/g, "/"))).toEqual([
			"server/index.ts",
			"shared/schema.ts",
			"src/app/main.tsx",
		]);
	});

	it("detects a simple relative import cycle", () => {
		const projectRoot = createTempProject();
		tempProjects.push(projectRoot);

		writeFile(projectRoot, "src/a.ts", "import './b'; export const a = 1;");
		writeFile(projectRoot, "src/b.ts", "import './a'; export const b = 1;");

		const { graph } = runCircularDependencyCheck(projectRoot, ["src"]);
		const cycles = detectCircularDependencies(graph);

		expect(cycles).toHaveLength(1);
		expect(cycles[0].map((filePath) => path.basename(filePath))).toEqual(["a.ts", "b.ts", "a.ts"]);
	});

	it("resolves alias imports within src without reporting false positives", () => {
		const projectRoot = createTempProject();
		tempProjects.push(projectRoot);

		writeFile(projectRoot, "src/app/main.tsx", "import { helper } from '@/shared/helper'; export const main = helper;");
		writeFile(projectRoot, "src/shared/helper.ts", "export const helper = 'ok';");

		const files = collectProjectFiles(projectRoot, ["src"]);
		const graph = buildDependencyGraph(files, projectRoot);

		expect(graph.get(path.join(projectRoot, "src/app/main.tsx"))).toEqual([
			path.join(projectRoot, "src/shared/helper.ts"),
		]);
		expect(detectCircularDependencies(graph)).toEqual([]);
	});
});
