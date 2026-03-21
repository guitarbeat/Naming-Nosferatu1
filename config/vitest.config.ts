import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "..", "src"),
			"@/app": path.resolve(__dirname, "..", "src/app"),
			"@/features": path.resolve(__dirname, "..", "src/features"),
			"@/shared": path.resolve(__dirname, "..", "src/shared"),
			"@supabase/client": path.resolve(__dirname, "..", "src/shared/services/supabase/client.ts"),
			"@supabase/types": path.resolve(__dirname, "..", "supabase/types.ts"),
			"@db": path.resolve(__dirname, "..", "supabase"),
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		testTimeout: 10000,
		setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
		include: ["**/*.test.ts", "**/*.test.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
	},
});
