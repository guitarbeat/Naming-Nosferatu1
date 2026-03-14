import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"@supabase/client": path.resolve(__dirname, "src/services/supabase/client.ts"),
			"@supabase/types": path.resolve(__dirname, "supabase/types.ts"),
			"@db": path.resolve(__dirname, "supabase"),
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["vitest.setup.ts"],
		include: ["**/*.test.ts", "**/*.test.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
	},
});
