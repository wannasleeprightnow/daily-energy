import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	envDir: fileURLToPath(new URL("../", import.meta.url)),
	plugins: [react(), tsconfigPaths()],
	resolve: {
		alias: {
			// Explicit alias — `vite-tsconfig-paths` can struggle with the
			// non-ASCII (Cyrillic) home directory, so give Rollup a concrete
			// file-system target for `@/*`.
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
