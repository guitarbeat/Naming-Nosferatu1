import path from "node:path";
import { fileURLToPath } from "node:url";
import autoprefixer from "autoprefixer";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { consoleForwardPlugin } from "../scripts/vite-console-forward-plugin";

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
                strictPort: false,
                allowedHosts: true,
                hmr: {
                        // Replit proxies the dev server through HTTPS/port 443.
                        // Without this, the HMR WebSocket targets the internal port
                        // and drops every few seconds behind the proxy.
                        clientPort: 443,
                },
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
        build: {
                rollupOptions: {
                        output: {
                                manualChunks: getManualChunk,
                        },
                },
        },
}));
