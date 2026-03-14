import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
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
	{
		files: ["vite.config.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "tsconfig.node.json",
				sourceType: "module",
			},
		},
	},
	globalIgnores(["main.js"]),
	{
		rules: {
			allowObjectTypes: true,
		},
	},
]);
