import { spawn } from "node:child_process";

const DATABASE_URL_FALLBACK = "postgres://user:pass@localhost:5432/db";
if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = DATABASE_URL_FALLBACK;
}

const useWindowsShell = process.platform === "win32";
const command = useWindowsShell ? "cmd.exe" : "pnpm";
const args = useWindowsShell
	? ["/d", "/s", "/c", "pnpm exec knip --dependencies --no-config-hints"]
	: ["exec", "knip", "--dependencies", "--no-config-hints"];

const child = spawn(command, args, {
	stdio: "inherit",
});

child.on("error", (error) => {
	console.error("Failed to run dependency check:", error);
	process.exit(1);
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 1);
});
