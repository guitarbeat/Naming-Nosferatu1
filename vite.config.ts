import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { consoleForwardPlugin } from "./scripts/vite-console-forward-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
}));
