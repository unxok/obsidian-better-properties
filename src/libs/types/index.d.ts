import { Events } from "obsidian";

declare module "obsidian" {
	interface Workspace extends Events {
		/** @internal Triggers when user right-clicks on external URL in editor */
		on(
			name: "file-property-menu",
			callback: (menu: Menu, property: string) => void,
			ctx?: unknown
		): EventRef;

		randomTest(): void;
	}

	interface AbstractInputSuggest<T> extends PopoverSuggest<T> {
		showSuggestions: (suggestions: T[]) => void;
	}
}
