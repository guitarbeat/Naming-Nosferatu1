import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { consoleForwardPlugin } from "./scripts/vite-console-forward-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
			},
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
			"@": path.resolve(__dirname, "src"),
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
