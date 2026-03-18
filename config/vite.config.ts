import type { ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import autoprefixer from "autoprefixer";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createLogger, defineConfig } from "vite";
import { consoleForwardPlugin } from "../scripts/vite-console-forward-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viteLogger = createLogger();

const suppressedProxyErrors = ["http proxy error: /api/names?includeHidden=true"];

function getManualChunk(id: string): string | undefined {
	if (!id.includes("node_modules")) {
		return undefined;
	}

	if (
		id.includes("/react/") ||
		id.includes("/react-dom/") ||
		id.includes("/scheduler/") ||
		id.includes("/react-router/")
	) {
		return "vendor-react";
	}

	if (id.includes("/@tanstack/") || id.includes("/@supabase/")) {
		return "vendor-data";
	}

	if (id.includes("/framer-motion/") || id.includes("/@hello-pangea/dnd/")) {
		return "vendor-motion";
	}

	if (
		id.includes("/@heroui/") ||
		id.includes("/@react-aria/") ||
		id.includes("/@react-stately/") ||
		id.includes("/@internationalized/")
	) {
		return "vendor-ui";
	}

	if (id.includes("/lucide-react/")) {
		return "vendor-icons";
	}

	return "vendor-misc";
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
	customLogger:
		command === "serve"
			? {
					...viteLogger,
					error(msg, options) {
						if (suppressedProxyErrors.some((entry) => msg.includes(entry))) {
							return;
						}
						viteLogger.error(msg, options);
					},
				}
			: undefined,
	server: {
		host: "0.0.0.0",
		port: 5173,
		strictPort: true,
		allowedHosts: true,
		watch: {
			usePolling: true,
		},
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
				configure(proxy) {
					proxy.on("error", (_error, _req, res) => {
						const response = res as ServerResponse | undefined;
						if (!response || response.headersSent) {
							return;
						}

						response.writeHead(503, { "Content-Type": "application/json" });
						response.end(JSON.stringify({ error: "API server unavailable" }));
					});
				},
			},
		},
	},
	css: {
		postcss: {
			plugins: [autoprefixer()],
		},
	},
	plugins: [
		react(),
		tailwindcss(),
		consoleForwardPlugin({
			enabled: command === "serve",
			endpoint: "/api/debug/client-logs",
			levels: ["log", "warn", "error", "info", "debug"],
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "..", "src"),
			"@/app": path.resolve(__dirname, "..", "src/app"),
			"@/features": path.resolve(__dirname, "..", "src/features"),
			"@/shared": path.resolve(__dirname, "..", "src/shared"),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: getManualChunk,
			},
		},
	},
}));
