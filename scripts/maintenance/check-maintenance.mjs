#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const COPY_ARTIFACT_PATTERN =
	/ [2-9]\.(ts|tsx|js|jsx|mjs|cjs|py|md|txt|json|yml|yaml|sql|css|html|diff)$/;
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage"]);
const AVAILABLE_CHECKS = ["case-collisions", "copy-artifacts", "env", "arch", "cycles"];
const DEFAULT_CHECKS = new Set(AVAILABLE_CHECKS);

function collectFiles(rootDir) {
	const files = [];
	if (!fs.existsSync(rootDir)) {
		return files;
	}

	const stack = [rootDir];
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) {
			continue;
		}

		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				if (SKIP_DIRS.has(entry.name)) {
					continue;
				}
				stack.push(fullPath);
				continue;
			}
			files.push(fullPath);
		}
	}

	return files;
}

function runSubprocessCheck(command, args, label, projectRoot) {
	const isWindowsCmd = process.platform === "win32" && command.toLowerCase().endsWith(".cmd");

	const result = isWindowsCmd
		? spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					`"${[
						command,
						...args.map((arg) => {
							if (arg === "") {
								return '""';
							}
							return /[\s"]/u.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg;
						}),
					].join(" ")}"`,
				],
				{
					cwd: projectRoot,
					stdio: "inherit",
				},
			)
		: spawnSync(command, args, {
				cwd: projectRoot,
				stdio: "inherit",
			});

	if (result.error) {
		const message = result.error instanceof Error ? result.error.message : String(result.error);
		console.error(`Failed to run ${label}: ${message}`);
		return false;
	}

	if (result.status !== 0) {
		return false;
	}

	return true;
}

function resolveBin(projectRoot, name) {
	const binBase = path.join(projectRoot, "node_modules", ".bin", name);
	if (process.platform === "win32" && fs.existsSync(`${binBase}.cmd`)) {
		return `${binBase}.cmd`;
	}
	return binBase;
}

export function runCaseCollisionCheck(projectRoot = ROOT) {
	let stdout = "";
	try {
		stdout = execSync("git ls-files", {
			cwd: projectRoot,
			encoding: "utf8",
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Failed to list tracked files via git: ${message}`);
		return false;
	}

	const files = stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((filePath) => path.join(projectRoot, filePath));
	const grouped = new Map();
	for (const file of files) {
		const key = file.toLowerCase();
		const existing = grouped.get(key) ?? [];
		existing.push(file);
		grouped.set(key, existing);
	}

	const collisions = [...grouped.values()].filter((group) => group.length > 1);
	if (collisions.length > 0) {
		for (const group of collisions) {
			console.error("Case-collision group:");
			for (const filePath of group) {
				console.error(path.relative(projectRoot, filePath));
			}
			console.error("");
		}
		console.error("Error: Resolve case-collision paths before committing.");
		return false;
	}

	console.log("No case-collision paths found.");
	return true;
}

export function runCopyArtifactCheck(projectRoot = ROOT) {
	const badFiles = collectFiles(projectRoot).filter((filePath) =>
		COPY_ARTIFACT_PATTERN.test(path.basename(filePath)),
	);
	if (badFiles.length > 0) {
		console.error("Found probable copy-artifact files (defragmentation check failed):");
		for (const filePath of badFiles) {
			console.error(path.relative(projectRoot, filePath).replace(/\\/g, "/"));
		}
		console.error("");
		console.error("Rename/remove these files before committing.");
		return false;
	}

	console.log("No copy-artifact filenames found.");
	return true;
}

export function runEnvCheck() {
	const supabaseUrl = process.env.VITE_SUPABASE_URL;
	const hasSupabaseAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY);

	console.log("VITE_SUPABASE_URL:", supabaseUrl);
	console.log("VITE_SUPABASE_ANON_KEY is set:", hasSupabaseAnonKey);
	return true;
}

export function runArchitectureCheck(projectRoot = ROOT) {
	const checkPath = path.join(projectRoot, "scripts", "check-architecture-boundaries.mjs");
	return runSubprocessCheck("node", [checkPath], "architecture boundaries check", projectRoot);
}

export function runCircularCheck(projectRoot = ROOT) {
	const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
	if (!fs.existsSync(tsxCli)) {
		console.error("Unable to locate tsx CLI module. Run `pnpm install` first.");
		return false;
	}

	const checkPath = path.join(projectRoot, "scripts", "check-circular-dependencies.ts");
	return runSubprocessCheck(process.execPath, [tsxCli, checkPath], "circular dependency check", projectRoot);
}

export function runMaintenanceChecks(requestedChecks = DEFAULT_CHECKS, projectRoot = ROOT) {
	let passed = true;

	if (requestedChecks.has("case-collisions")) {
		passed = runCaseCollisionCheck(projectRoot) && passed;
	}
	if (requestedChecks.has("copy-artifacts")) {
		passed = runCopyArtifactCheck(projectRoot) && passed;
	}
	if (requestedChecks.has("env")) {
		passed = runEnvCheck() && passed;
	}
	if (requestedChecks.has("arch")) {
		passed = runArchitectureCheck(projectRoot) && passed;
	}
	if (requestedChecks.has("cycles")) {
		passed = runCircularCheck(projectRoot) && passed;
	}

	return passed;
}

function parseRequestedChecks(rawArgs) {
	const requested = new Set();
	for (const arg of rawArgs) {
		if (arg === "-h" || arg === "--help") {
			printUsage();
			process.exit(0);
		}

		if (!arg.startsWith("--")) {
			console.error(`Unknown argument: ${arg}`);
			printUsage();
			process.exit(1);
		}

		const check = arg.slice(2);
		if (!AVAILABLE_CHECKS.includes(check)) {
			console.error(`Unknown check: ${arg}`);
			printUsage();
			process.exit(1);
		}

		requested.add(check);
	}

	if (requested.size === 0) {
		return DEFAULT_CHECKS;
	}
	return requested;
}

function printUsage() {
	console.log("Usage: node scripts/maintenance/check-maintenance.mjs [checks]");
	console.log("Available checks:");
	console.log("  --case-collisions");
	console.log("  --copy-artifacts");
	console.log("  --env");
	console.log("  --arch");
	console.log("  --cycles");
	console.log("If no flags are passed, all checks run.");
}

function runFromCli() {
	const requestedChecks = parseRequestedChecks(process.argv.slice(2));
	const passed = runMaintenanceChecks(requestedChecks);
	if (passed) {
		console.log("All requested maintenance checks passed.");
		return;
	}

	process.exit(1);
}

const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (scriptPath === invokedPath) {
	runFromCli();
}
