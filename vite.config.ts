import { UserConfig, defineConfig } from "vite";
import path from "path";
import builtins from "builtin-modules";
// import { analyzer } from "vite-bundle-analyzer";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig(async ({ mode }) => {
	const { resolve } = path;
	const prod = mode === "production";

	const vaultPluginDir = "vault/.obsidian/plugins/better-properties";
	return {
		plugins: [
			// analyzer(),
			viteStaticCopy({
				targets: [
					{
						src: "manifest.json",
						dest: vaultPluginDir,
					},
				],
			}),
		],
		resolve: {
			alias: {
				"~": path.resolve(__dirname, "./src"),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src/main.ts"),
				name: "main",
				fileName: () => "main.js",
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
					entryFileNames: vaultPluginDir + "/main.js",
					assetFileNames: vaultPluginDir + "/styles.css",
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
	} satisfies UserConfig;
});
