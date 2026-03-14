import { UserConfig, defineConfig } from "vite";
import path from "path";
import { builtinModules } from "node:module";
// import { analyzer } from "vite-bundle-analyzer";
import copy from "rollup-plugin-copy";

export default defineConfig(async ({ mode }) => {
	const { resolve } = path;
	const prod = mode === "production";

	return {
		plugins: [
			// analyzer(),
			copy({
				hook: "writeBundle",
				targets: [
					{
						src: "dist/*",
						dest: "../better-properties-vault/.obsidian/plugins/better-properties/",
					},
				],
			}),
		],
		resolve: {
			alias: {
				"~": path.resolve(__dirname, "./src"),
				"#": path.resolve(__dirname, "./src2"),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src/main.ts"),
				name: "main",
				formats: ["cjs"],
			},
			minify: prod,
			sourcemap: prod ? false : "inline",
			cssCodeSplit: false,
			emptyOutDir: false,
			cssMinify: false,
			outDir: "",
			rollupOptions: {
				input: {
					main: resolve(__dirname, "src/main.ts"),
				},
				output: {
					entryFileNames: "dist/main.js",
					assetFileNames: "dist/styles.css",
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
					...builtinModules,
				],
			},
		},
	} satisfies UserConfig;
});
