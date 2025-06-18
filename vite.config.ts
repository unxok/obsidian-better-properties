import { UserConfig, defineConfig } from "vite";
import path from "path";
import builtins from "builtin-modules";

export default defineConfig(async ({ mode }) => {
	const { resolve } = path;
	const prod = mode === "production";

	return {
		plugins: [],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
				"~": path.resolve(__dirname, "./src2"),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src2/main.ts"),
				cssFileName: "styles",
				name: "main",
				fileName: () => "main.js",
				formats: ["cjs"],
			},
			minify: prod,
			sourcemap: prod ? false : "inline",
			cssCodeSplit: false,
			// cssCodeSplit: true,
			emptyOutDir: false,
			outDir: "",
			rollupOptions: {
				input: {
					main: resolve(__dirname, "src2/main.ts"),
				},
				output: {
					entryFileNames: "main.js",
					assetFileNames: "styles.css",
					// assetFileNames: "[name].css",/
				},
				external: [
					"obsidian",
					"electron",
					"@codemirror/autocomplete",
					"@codemirror/collab",
					"@codemirror/commands",
					"@codemirror/language",
					"@codemirror/lint",
					"@codemirror/search",
					"@codemirror/state",
					"@codemirror/view",
					"@lezer/common",
					"@lezer/highlight",
					"@lezer/lr",
					...builtins,
				],
			},
		},
	} as UserConfig;
});
