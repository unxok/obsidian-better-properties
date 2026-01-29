import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

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
		},
	},
	globalIgnores(["main.js"]),
]);
