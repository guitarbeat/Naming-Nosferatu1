import path from "node:path";
import { fileURLToPath } from "node:url";
import autoprefixer from "autoprefixer";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { consoleForwardPlugin } from "../scripts/vite-console-forward-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
        server: {
		host: "0.0.0.0",
		port: 5173,
		strictPort: false,
		allowedHosts: true,
		watch: {
			usePolling: true,
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
                        endpoint: "/__dev/client-logs",
                        levels: ["log", "warn", "error", "info", "debug"],
                }),
        ],
        resolve: {
                alias: {
                        "@": path.resolve(__dirname, "..", "src"),
                        "@/app": path.resolve(__dirname, "..", "src/app"),
                        "@/features": path.resolve(__dirname, "..", "src/features"),
                        "@/shared": path.resolve(__dirname, "..", "src/shared"),
                        "@/services": path.resolve(__dirname, "..", "src/services"),
                },
        },
}));
