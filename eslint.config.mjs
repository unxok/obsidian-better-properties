import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		ignores: ["vite.config.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "tsconfig.app.json",
				sourceType: "module",
			},
			globals: {
				...globals.browser,
				...globals.nodeBuiltin,
			},
		},
	},
	// {
	// 	files: ["vite.config.ts"],
	// 	languageOptions: {
	// 		parser: tsparser,
	// 		parserOptions: {
	// 			project: "tsconfig.node.json",
	// 			sourceType: "module",
	// 		},
	// 	},
	// },
	globalIgnores(["main.js"]),
	{
		rules: {
			"@typescript-eslint/no-empty-object-type": "off",
			"import/no-extraneous-dependencies": "off",
			"@typescript-eslint/no-this-alias": "off",
			"@typescript-eslint/no-base-to-string": "off",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: false,
				},
			],
		},
	},
]);
