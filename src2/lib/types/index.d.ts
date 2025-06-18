import { Events } from "obsidian";
import {
	MetadataTypeManager as BaseMetadataTypeManager,
	PropertyWidget as BasePropertyWidget,
	PropertyEntryData,
} from "obsidian-typings";

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

	interface MarkdownPreviewRenderer {
		onHeadingCollapseClick(e: MouseEvent, el: HTMLElement): void;
	}

	interface MetadataTypeManager extends BaseMetadataTypeManager {
		registeredTypeWidgets: Record<string, PropertyWidget<unknown>>;
	}

	interface PropertyValueComponent {
		containerEl: HTMLElement;
		focus(_: unknown): void;
	}
}
